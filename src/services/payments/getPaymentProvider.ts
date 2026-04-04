import { AsaasProvider } from './providers/asaasProvider';
import { MercadoPagoProvider } from './providers/mercadopagoProvider';
import { StripeProvider } from './providers/stripeProvider';
import { ManualProvider } from './providers/manualProvider';
import type { PaymentProvider } from './paymentService';

export interface TenantPaymentConfig {
  chargeMode: 'gateway' | 'manual';
  gatewayName?: 'asaas' | 'mercadopago' | 'stripe';
  apiKey?: string;
  manualPaymentLinkDefault?: string;
}

export function getPaymentProvider(config: TenantPaymentConfig): PaymentProvider {
  if (config.chargeMode === 'manual') {
    const provider = new ManualProvider();
    if (config.manualPaymentLinkDefault) {
      provider.setDefaultLink(config.manualPaymentLinkDefault);
    }
    return provider;
  }

  if (config.gatewayName === 'asaas') {
    return new AsaasProvider();
  }

  if (config.gatewayName === 'mercadopago') {
    return new MercadoPagoProvider();
  }

  if (config.gatewayName === 'stripe') {
    return new StripeProvider();
  }

  return new ManualProvider();
}
