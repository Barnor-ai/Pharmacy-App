export * from './paymentTypes';
export * from './paystack';
import { paystackService } from './paystack';
import { IPaymentProviderService, PaymentGatewayProvider } from './paymentTypes';

const providers: Record<PaymentGatewayProvider, IPaymentProviderService> = {
  paystack: paystackService,
  stripe: paystackService, // Prepared for future Stripe provider
  flutterwave: paystackService // Prepared for future Flutterwave provider
};

export function getPaymentProvider(providerName: PaymentGatewayProvider = 'paystack'): IPaymentProviderService {
  return providers[providerName] || paystackService;
}
