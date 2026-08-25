import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

// Helper to calculate HMAC-SHA512 in Deno
async function verifyHmacSha512(secret: string, bodyText: string, expectedSignature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyText));
  const hexSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hexSignature.toLowerCase() === expectedSignature.toLowerCase();
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY') || '';

    const rawBody = await req.text();
    const paystackSignature = req.headers.get('x-paystack-signature');

    // 1. Signature Verification
    if (paystackSecretKey) {
      if (!paystackSignature) {
        return new Response(
          JSON.stringify({ error: 'Missing x-paystack-signature header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValid = await verifyHmacSha512(paystackSecretKey, rawBody, paystackSignature);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Handle Event: charge.success
    if (event === 'charge.success' && data) {
      const reference = data.reference;
      const metadata = data.metadata || {};
      const orgId = metadata.organization_id || metadata.orgId;
      const planSlug = metadata.plan_slug || metadata.planSlug;

      if (!reference || !orgId || !planSlug) {
        console.warn('Webhook received charge.success without required metadata:', { reference, orgId, planSlug });
        return new Response(
          JSON.stringify({ status: 'ignored', message: 'Missing organization or plan metadata.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Check Idempotency
      const { data: existingPayment } = await supabase
        .from('subscription_payments')
        .select('id')
        .eq('payment_reference', reference)
        .eq('status', 'success')
        .maybeSingle();

      if (existingPayment) {
        console.log(`Webhook: Payment reference ${reference} was already processed.`);
        return new Response(
          JSON.stringify({ status: 'success', message: 'Payment already processed (idempotent).' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const amount = Number(data.amount) / 100;
      const currency = data.currency || 'USD';
      const txId = String(data.id || reference);

      // 4. Update Subscription & Record Payment
      const { data: result, error: rpcError } = await supabase.rpc('record_verified_payment', {
        p_org_id: orgId,
        p_plan_slug: planSlug,
        p_payment_reference: reference,
        p_amount: amount,
        p_currency: currency,
        p_provider: 'paystack',
        p_provider_tx_id: txId,
        p_metadata: {
          webhook_event: event,
          customer_email: data.customer?.email,
          channel: data.channel,
          raw_data: data
        }
      });

      if (rpcError) {
        console.error('Webhook RPC Error:', rpcError);
        return new Response(
          JSON.stringify({ error: rpcError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ status: 'success', result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Acknowledge other unhandled events safely
    return new Response(
      JSON.stringify({ status: 'acknowledged', event }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Paystack Webhook Handler Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
