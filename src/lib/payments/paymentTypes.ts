/**
 * Payment Provider Abstraction Layer
 * Multi-tenant SaaS billing types for Paystack, Stripe, and Flutterwave
 */

export type PaymentGatewayProvider = 'paystack' | 'stripe' | 'flutterwave';

export type PaymentTransactionStatus = 'success' | 'failed' | 'pending' | 'refunded';

export interface PaymentMetadata {
  organizationId: string;
  planId: string;
  planSlug: string;
  userId: string;
  userEmail?: string;
  billingInterval?: 'month' | 'year';
  [key: string]: any;
}

export interface CheckoutOptions {
  email: string;
  amount: number; // in standard currency units (e.g., 29.00 USD)
  currency: string;
  planName: string;
  planSlug: string;
  organizationId: string;
  userId: string;
  reference?: string;
  metadata?: Record<string, any>;
  onSuccess: (response: PaymentVerificationPayload) => void | Promise<void>;
  onCancel?: () => void;
  onError?: (error: Error | string) => void;
}

export interface PaymentVerificationPayload {
  reference: string;
  transactionId?: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: PaymentMetadata;
  provider: PaymentGatewayProvider;
}

export interface ServerVerificationResult {
  success: boolean;
  message: string;
  paymentId?: string;
  plan?: string;
  currentPeriodEnd?: string;
  isDuplicate?: boolean;
}

export interface SubscriptionPaymentRecord {
  id: string;
  organizationId: string;
  subscriptionId?: string | null;
  planId?: string | null;
  amount: number;
  currency: string;
  status: PaymentTransactionStatus;
  provider: PaymentGatewayProvider | string;
  providerTransactionId?: string | null;
  paymentReference: string;
  paidAt?: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  planName?: string;
}

export interface PaymentReceiptInvoiceData {
  invoiceNumber: string;
  paymentReference: string;
  organizationName: string;
  organizationEmail?: string;
  customerEmail: string;
  planName: string;
  amount: number;
  currency: string;
  paidAt: string;
  periodStart: string;
  periodEnd: string;
  provider: string;
  status: string;
}

export interface IPaymentProviderService {
  providerName: PaymentGatewayProvider;
  isConfigured: () => boolean;
  initializeCheckout: (options: CheckoutOptions) => Promise<void>;
  verifyPayment: (payload: {
    reference: string;
    organizationId: string;
    planSlug: string;
    userEmail?: string;
  }) => Promise<ServerVerificationResult>;
}
