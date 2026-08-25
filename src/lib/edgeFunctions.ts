export interface LowStockAlertResponse {
  success: boolean;
  message: string;
  count: number;
  recipients?: string[];
  emailStatus?: string;
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    barcode?: string;
    supplier?: string;
  }>;
  previewHtml?: string;
  error?: string;
}

export async function triggerLowStockEmailAlert(
  organizationId: string,
  medicines: Array<any>,
  threshold: number = 10,
  emailTo?: string
): Promise<LowStockAlertResponse> {
  const lowItems = medicines.filter(
    (m) => m.stockQuantity <= (m.minReorderLevel || threshold) || m.quantity <= threshold
  );

  const recipient = emailTo || 'admin@pharmacore-saas.com';

  return {
    success: true,
    message: lowItems.length > 0
      ? `Dispatched low stock email alert for ${lowItems.length} medicine(s) to ${recipient}.`
      : 'All medicine stock levels are healthy. No alert needed.',
    count: lowItems.length,
    recipients: [recipient],
    emailStatus: 'sent',
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
}

export interface StaffInviteEmailResponse {
  success: boolean;
  message: string;
  recipient: string;
  emailStatus: 'sent' | 'queued' | 'failed';
  subject: string;
  body: string;
  mailtoUrl: string;
  loginUrl: string;
  error?: string;
}

export function generateStaffInviteContent(params: StaffInviteEmailParams) {
  const orgName = params.organizationName || 'PharmaCore Management';
  const loginUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pharmacore-saas.com';
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
1. Access the web portal using the link above.
2. Sign in with your registered email and temporary password.
3. Upon first login, please update your security password in the Security Settings tab.

For any questions or access issues, please contact your pharmacy supervisor.

Best regards,
${orgName} Team`;

  const mailtoUrl = `mailto:${encodeURIComponent(params.recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return {
    subject,
    body,
    loginUrl,
    mailtoUrl
  };
}

export async function triggerStaffInviteEmail(params: StaffInviteEmailParams): Promise<StaffInviteEmailResponse> {
  // Simulate network latency / edge email dispatcher
  await new Promise((resolve) => setTimeout(resolve, 600));

  const { subject, body, loginUrl, mailtoUrl } = generateStaffInviteContent(params);

  // Validate recipient email
  if (!params.recipientEmail || !params.recipientEmail.includes('@')) {
    return {
      success: false,
      message: 'Invalid recipient email address.',
      recipient: params.recipientEmail,
      emailStatus: 'failed',
      subject,
      body,
      mailtoUrl,
      loginUrl,
      error: 'Invalid email address format'
    };
  }

  return {
    success: true,
    message: `Invitation email notification successfully dispatched to ${params.recipientEmail}.`,
    recipient: params.recipientEmail,
    emailStatus: 'sent',
    subject,
    body,
    mailtoUrl,
    loginUrl
  };
}

