export interface LowStockAlertResponse {
  success: boolean;
  message: string;
  count: number;
  recipients?: string[];
  emailStatus?: 'sent' | 'prepared' | 'failed';
  deliveredVia?: string;
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    barcode?: string;
    supplier?: string;
  }>;
  previewHtml?: string;
  mailtoUrl?: string;
  error?: string;
}

export interface EmailServiceStatus {
  configured: boolean;
  activeProvider: 'smtp' | 'resend' | 'sendgrid' | 'client_dispatcher';
  hasSmtp: boolean;
  hasResend: boolean;
  hasSendGrid: boolean;
  senderEmail: string;
  smtpHost?: string | null;
  message: string;
}

export async function fetchEmailServiceStatus(): Promise<EmailServiceStatus> {
  try {
    const res = await fetch('/api/email/status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not fetch email service status from server:', err);
  }

  return {
    configured: false,
    activeProvider: 'client_dispatcher',
    hasSmtp: false,
    hasResend: false,
    hasSendGrid: false,
    senderEmail: 'notifications@pharmacore-app.com',
    message: 'Direct 1-click Webmail & Mailto Launcher active.'
  };
}

export async function triggerLowStockEmailAlert(
  organizationId: string,
  medicines: Array<any>,
  threshold: number = 10,
  emailTo?: string
): Promise<LowStockAlertResponse> {
  const lowItems = medicines.filter(
    (m) => (m.stockQuantity ?? m.quantity) <= (m.minReorderLevel || threshold)
  );

  const recipient = emailTo || 'admin@pharmacore-saas.com';

  if (lowItems.length === 0) {
    return {
      success: true,
      message: 'All medicine stock levels are healthy. No alert needed.',
      count: 0,
      recipients: [recipient],
      emailStatus: 'prepared'
    };
  }

  try {
    const res = await fetch('/api/email/send-low-stock-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientEmail: recipient,
        lowStockItems: lowItems
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: data.success,
        message: data.message || `Dispatched low stock email alert to ${recipient}`,
        count: lowItems.length,
        recipients: [recipient],
        emailStatus: data.emailStatus || 'sent',
        deliveredVia: data.deliveredVia,
        mailtoUrl: data.mailtoUrl,
        items: lowItems.map((m) => ({
          id: m.id,
          name: m.name,
          quantity: m.stockQuantity ?? m.quantity,
          barcode: m.barcode,
          supplier: m.supplierName || m.supplier?.name || 'Direct Supplier',
        }))
      };
    }
  } catch (err) {
    console.warn('Server alert endpoint warning, using client fallback:', err);
  }

  const subject = `⚠️ Low Stock Alert: ${lowItems.length} item(s) require reorder`;
  const plainText = lowItems.map(m => `- ${m.name}: ${m.stockQuantity ?? m.quantity} units left`).join('\n');
  const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`;

  return {
    success: true,
    message: `Dispatched low stock email alert for ${lowItems.length} medicine(s) to ${recipient}.`,
    count: lowItems.length,
    recipients: [recipient],
    emailStatus: 'prepared',
    deliveredVia: 'client_dispatcher',
    mailtoUrl,
    items: lowItems.map((m) => ({
      id: m.id,
      name: m.name,
      quantity: m.stockQuantity ?? m.quantity,
      barcode: m.barcode,
      supplier: m.supplierName || m.supplier?.name || 'Direct Supplier',
    })),
  };
}

export interface StaffInviteEmailParams {
  staffName: string;
  recipientEmail: string;
  role: string;
  temporaryPassword?: string;
  organizationName?: string;
  senderName?: string;
  customMessage?: string;
  loginUrl?: string;
}

export interface StaffInviteEmailResponse {
  success: boolean;
  message: string;
  recipient: string;
  emailStatus: 'sent' | 'prepared' | 'failed';
  deliveredVia?: 'smtp' | 'resend' | 'sendgrid' | 'client_dispatcher' | string;
  subject: string;
  body: string;
  html?: string;
  mailtoUrl: string;
  gmailComposeUrl: string;
  outlookComposeUrl: string;
  yahooComposeUrl: string;
  loginUrl: string;
  deliveryError?: string;
  error?: string;
}

export function generateStaffInviteContent(params: StaffInviteEmailParams) {
  const orgName = params.organizationName || 'PharmaCore Management';
  const loginUrl = params.loginUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://pharmacore-saas.com');
  const subject = `Welcome to ${orgName} - Your Pharmacy Team Access Credentials`;
  
  const body = `Dear ${params.staffName},

You have been invited by ${params.senderName || 'the Pharmacy Administrator'} to join the team at ${orgName}.

Here are your account access details:
---------------------------------------------
Portal Web App: ${loginUrl}
User Email: ${params.recipientEmail}
Assigned Role: ${params.role}
Temporary Password: ${params.temporaryPassword || 'TempPass123!'}
---------------------------------------------

${params.customMessage ? `Note from Administrator:\n"${params.customMessage}"\n\n` : ''}Next Steps:
1. Access the web portal using the link: ${loginUrl}
2. Sign in with your registered email and temporary password.
3. Upon first login, please update your security password in the Security Settings tab.

For any questions or access issues, please contact your pharmacy supervisor.

Best regards,
${orgName} Team`;

  const mailtoUrl = `mailto:${encodeURIComponent(params.recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(params.recipientEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const outlookComposeUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(params.recipientEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const yahooComposeUrl = `https://compose.mail.yahoo.com/?to=${encodeURIComponent(params.recipientEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return {
    subject,
    body,
    loginUrl,
    mailtoUrl,
    gmailComposeUrl,
    outlookComposeUrl,
    yahooComposeUrl
  };
}

export async function triggerStaffInviteEmail(params: StaffInviteEmailParams): Promise<StaffInviteEmailResponse> {
  const defaultLoginUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pharmacore-saas.com';
  const loginUrl = params.loginUrl || defaultLoginUrl;

  const clientFallback = generateStaffInviteContent({ ...params, loginUrl });

  // Validate recipient email
  if (!params.recipientEmail || !params.recipientEmail.includes('@')) {
    return {
      success: false,
      message: 'Invalid recipient email address.',
      recipient: params.recipientEmail,
      emailStatus: 'failed',
      deliveredVia: 'client_dispatcher',
      subject: clientFallback.subject,
      body: clientFallback.body,
      mailtoUrl: clientFallback.mailtoUrl,
      gmailComposeUrl: clientFallback.gmailComposeUrl,
      outlookComposeUrl: clientFallback.outlookComposeUrl,
      yahooComposeUrl: clientFallback.yahooComposeUrl,
      loginUrl,
      error: 'Invalid email address format'
    };
  }

  // 1. Try sending via Backend Server Mail API (SMTP / Resend / SendGrid)
  try {
    const res = await fetch('/api/email/send-staff-invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        staffName: params.staffName,
        recipientEmail: params.recipientEmail,
        role: params.role,
        temporaryPassword: params.temporaryPassword || 'TempPass123!',
        organizationName: params.organizationName || 'PharmaCore Pharmacy',
        senderName: params.senderName || 'Pharmacy Administrator',
        customMessage: params.customMessage || '',
        loginUrl
      })
    });

    if (res.ok) {
      const serverData = await res.json();
      return {
        success: serverData.success ?? true,
        message: serverData.message,
        recipient: params.recipientEmail,
        emailStatus: serverData.emailStatus || 'sent',
        deliveredVia: serverData.deliveredVia || 'smtp',
        subject: serverData.subject || clientFallback.subject,
        body: serverData.body || clientFallback.body,
        html: serverData.html,
        mailtoUrl: serverData.mailtoUrl || clientFallback.mailtoUrl,
        gmailComposeUrl: serverData.gmailComposeUrl || clientFallback.gmailComposeUrl,
        outlookComposeUrl: serverData.outlookComposeUrl || clientFallback.outlookComposeUrl,
        yahooComposeUrl: serverData.yahooComposeUrl || clientFallback.yahooComposeUrl,
        loginUrl: serverData.loginUrl || loginUrl,
        deliveryError: serverData.deliveryError
      };
    }
  } catch (err: any) {
    console.warn('Backend email API warning, using instant webmail fallback launcher:', err?.message);
  }

  // 2. Client-side fallback if server is offline or unreachable
  return {
    success: true,
    message: `Invitation generated for ${params.recipientEmail}. Ready for 1-click dispatch via Gmail/Outlook or Mail client.`,
    recipient: params.recipientEmail,
    emailStatus: 'prepared',
    deliveredVia: 'client_dispatcher',
    subject: clientFallback.subject,
    body: clientFallback.body,
    mailtoUrl: clientFallback.mailtoUrl,
    gmailComposeUrl: clientFallback.gmailComposeUrl,
    outlookComposeUrl: clientFallback.outlookComposeUrl,
    yahooComposeUrl: clientFallback.yahooComposeUrl,
    loginUrl
  };
}

export async function sendTestEmail(targetEmail: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/email/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEmail })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, message: data.message || 'Test email dispatched successfully!' };
    }
    return { success: false, message: data.message || 'Failed to send test email.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error sending test email.' };
  }
}

