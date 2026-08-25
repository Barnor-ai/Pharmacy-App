import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPaymentRequest {
  reference: string;
  organization_id: string;
  plan_slug: string;
  provider?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase service environment variables are not configured.');
    }

    // 1. Authenticate Requesting User from Authorization Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid or expired user session.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse Request Body
    const body: VerifyPaymentRequest = await req.json();
    const { reference, organization_id, plan_slug, provider = 'paystack' } = body;

    if (!reference || !organization_id || !plan_slug) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required parameters (reference, organization_id, plan_slug).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verify that User is the Owner of the Organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, owner_id, name')
      .eq('id', organization_id)
      .single();

    if (orgError || !orgData || orgData.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Forbidden: Only the Organization Owner can verify subscription payments.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Check Idempotency: Has this reference already been processed?
    const { data: existingPayment } = await supabase
      .from('subscription_payments')
      .select('id, status, payment_reference, created_at')
      .eq('payment_reference', reference)
      .eq('status', 'success')
      .maybeSingle();

    if (existingPayment) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment was already verified and processed.',
          is_duplicate: true,
          payment_id: existingPayment.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Query Authoritative Plan Price & Currency from DB
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', plan_slug)
      .eq('is_active', true)
      .single();

    if (planError || !planData) {
      return new Response(
        JSON.stringify({ success: false, message: `Subscription plan '${plan_slug}' not found or inactive.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let verifiedAmount = planData.price;
    let verifiedCurrency = planData.currency || 'USD';
    let transactionId = reference;
    let paymentMetadata: Record<string, any> = {
      verified_by: user.id,
      user_email: user.email,
      plan_slug: planData.slug
    };

    // 6. Call Paystack's Server Verification API
    if (paystackSecretKey && !reference.startsWith('test_sandbox_') && !reference.startsWith('sim_')) {
      const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const paystackData = await paystackRes.json();

      if (!paystackRes.ok || !paystackData.status || paystackData.data?.status !== 'success') {
        return new Response(
          JSON.stringify({
            success: false,
            message: paystackData.message || 'Paystack payment verification failed or status is not successful.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tx = paystackData.data;
      transactionId = String(tx.id || reference);
      verifiedCurrency = (tx.currency || 'USD').toUpperCase();
      
      // Paystack amounts are in subunit / kobo / cents (e.g. 2900 for $29.00 or NGN 2900)
      const paystackAmount = Number(tx.amount) / 100;
      verifiedAmount = paystackAmount;

      paymentMetadata = {
        ...paymentMetadata,
        paystack_channel: tx.channel,
        paystack_gateway_response: tx.gateway_response,
        paystack_customer: tx.customer?.email,
        paystack_authorization: tx.authorization?.authorization_code
      };
    } else {
      // Test / Sandbox mode verification
      console.log(`[TEST MODE] Verifying simulated or sandbox reference: ${reference} for plan ${planData.name}`);
      paymentMetadata.test_mode = true;
    }

    // 7. Authoritatively Update Subscription and Record Payment via Postgres Function
    const { data: recordResult, error: rpcError } = await supabase.rpc('record_verified_payment', {
      p_org_id: organization_id,
      p_plan_slug: plan_slug,
      p_payment_reference: reference,
      p_amount: verifiedAmount,
      p_currency: verifiedCurrency,
      p_provider: provider,
      p_provider_tx_id: transactionId,
      p_metadata: paymentMetadata
    });

    if (rpcError) {
      throw new Error(`Database error recording payment: ${rpcError.message}`);
    }

    return new Response(
      JSON.stringify(recordResult),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Payment Verification Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'Internal server error during payment verification.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
