import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  organization_id?: string;
  threshold?: number;
  emailTo?: string;
  simulate?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let body: RequestBody = {};
    try {
      body = await req.json();
    } catch {
      // Empty body
    }

    const { organization_id, threshold = 10, emailTo, simulate = false } = body;

    // 1. Query low-stock medicines
    let query = supabase
      .from('medicines')
      .select('*, organization:organizations(name, slug), supplier:suppliers(name)')
      .lte('quantity', threshold)
      .order('quantity', { ascending: true });

    if (organization_id) {
      query = query.eq('organization_id', organization_id);
    }

    const { data: lowStockMeds, error: medsError } = await query;

    if (medsError) {
      throw new Error(`Failed to query medicines: ${medsError.message}`);
    }

    if (!lowStockMeds || lowStockMeds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'All medicine stock levels are healthy. No alerts triggered.',
          count: 0,
          items: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 2. Resolve recipient email addresses
    let recipientEmails: string[] = [];

    if (emailTo) {
      recipientEmails = [emailTo];
    } else if (organization_id) {
      // Fetch admin / owner emails for this organization
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id, role:roles(name), profile:profiles(email, full_name)')
        .eq('organization_id', organization_id)
        .eq('is_active', true);

      if (!membersError && members) {
        const eligible = members
          .filter((m: any) => m.role?.name === 'Owner' || m.role?.name === 'Admin' || m.role?.name === 'Pharmacist')
          .map((m: any) => m.profile?.email)
          .filter(Boolean);

        recipientEmails = Array.from(new Set(eligible));
      }
    }

    // Fallback recipient if none found
    if (recipientEmails.length === 0) {
      recipientEmails = ['pharmacy-admin@pharmacore-saas.internal'];
    }

    // 3. Build HTML Email Template
    const orgName = lowStockMeds[0]?.organization?.name || 'Pharmacy SaaS';
    const totalLowCount = lowStockMeds.length;
    const criticalCount = lowStockMeds.filter((m: any) => m.quantity <= 0).length;

    const itemsHtml = lowStockMeds
      .map(
        (m: any) => `
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 10px 12px; font-weight: bold; color: #f8fafc;">
            ${m.name}
            <div style="font-size: 11px; color: #94a3b8; font-weight: normal;">${m.generic_name || '—'}</div>
          </td>
          <td style="padding: 10px 12px; font-family: monospace; font-size: 12px; color: #cbd5e1;">${m.barcode || '—'}</td>
          <td style="padding: 10px 12px; color: #94a3b8;">${m.category || 'General'}</td>
          <td style="padding: 10px 12px; text-align: center;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 12px; ${
              m.quantity <= 0
                ? 'background-color: #4c0519; color: #fda4af; border: 1px solid #9f1239;'
                : 'background-color: #451a03; color: #fcd34d; border: 1px solid #b45309;'
            }">
              ${m.quantity} ${m.quantity <= 0 ? '(OUT OF STOCK)' : 'units'}
            </span>
          </td>
          <td style="padding: 10px 12px; color: #94a3b8;">${m.supplier?.name || 'Primary Supplier'}</td>
        </tr>
      `
      )
      .join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Low Stock Inventory Alert - ${orgName}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 24px;">
          <div style="max-width: 640px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 24px; text-align: center;">
              <div style="font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">Rx PharmaCore Alert</div>
              <div style="font-size: 13px; color: #d1fae5; margin-top: 4px;">Automated Pharmacy Stock Monitoring Engine</div>
            </div>

            <div style="padding: 24px;">
              <div style="background-color: ${criticalCount > 0 ? '#450a0a' : '#422006'}; border: 1px solid ${
      criticalCount > 0 ? '#b91c1c' : '#ca8a04'
    }; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <div style="font-weight: bold; font-size: 15px; color: #ffffff; margin-bottom: 4px;">
                  ⚠️ ${totalLowCount} Medication(s) Below Minimum Reorder Threshold (${threshold} units)
                </div>
                <div style="font-size: 12px; color: #cbd5e1;">
                  Organization: <strong>${orgName}</strong>. Immediate replenishment is recommended to avoid prescription dispensing delays.
                </div>
              </div>

              <div style="margin-bottom: 20px;">
                <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 10px;">
                  Itemized Low Stock Summary
                </h3>
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                    <thead>
                      <tr style="background-color: #1e293b; color: #94a3b8; text-transform: uppercase; font-size: 10px;">
                        <th style="padding: 8px 12px; border-top-left-radius: 8px;">Medicine</th>
                        <th style="padding: 8px 12px;">Barcode</th>
                        <th style="padding: 8px 12px;">Category</th>
                        <th style="padding: 8px 12px; text-align: center;">Stock Qty</th>
                        <th style="padding: 8px 12px; border-top-right-radius: 8px;">Supplier</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style="text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #1e293b;">
                <p style="font-size: 11px; color: #64748b; margin-bottom: 12px;">
                  This is an automated operational notification dispatched by PharmaCore Multi-Tenant SaaS.
                </p>
                <div style="font-size: 10px; color: #475569;">
                  Timestamp: ${new Date().toUTCString()} • Organization ID: ${organization_id || 'System-Wide'}
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // 4. Send Email via Resend API (if key available) or record dispatch
    let emailStatus = 'simulated';
    if (resendApiKey && !simulate) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'PharmaCore Alerts <alerts@pharmacore-saas.com>',
            to: recipientEmails,
            subject: `🚨 [URGENT] Low Stock Alert: ${totalLowCount} medicines need reorder - ${orgName}`,
            html: emailHtml,
          }),
        });

        if (res.ok) {
          emailStatus = 'sent';
        } else {
          const errData = await res.text();
          emailStatus = `resend_error: ${errData}`;
        }
      } catch (err: any) {
        emailStatus = `dispatch_failed: ${err?.message}`;
      }
    }

    // 5. Insert Audit Log
    if (organization_id) {
      await supabase.from('audit_logs').insert({
        organization_id,
        action: 'LOW_STOCK_ALERT_TRIGGERED',
        entity_name: 'medicines',
        new_data: {
          low_stock_count: totalLowCount,
          critical_count: criticalCount,
          recipients: recipientEmails,
          status: emailStatus,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Dispatched low-stock alert for ${totalLowCount} items to ${recipientEmails.length} recipient(s).`,
        count: totalLowCount,
        recipients: recipientEmails,
        emailStatus,
        items: lowStockMeds.map((m: any) => ({
          id: m.id,
          name: m.name,
          quantity: m.quantity,
          barcode: m.barcode,
          supplier: m.supplier?.name || 'Direct',
        })),
        previewHtml: emailHtml,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal error in low-stock-alert function',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
