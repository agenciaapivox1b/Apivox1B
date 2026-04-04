import type { PaymentProvider, CreatePaymentData, CreatePaymentResult, PaymentStatusResult } from '../paymentService';

export class ManualProvider implements PaymentProvider {
  private defaultLink: string = '';

  setDefaultLink(link: string): void {
    this.defaultLink = link;
  }

  async createPayment(data: CreatePaymentData): Promise<CreatePaymentResult> {
    const paymentLink = this.defaultLink || data.description;
    
    return {
      success: true,
      charge: {
        id: `manual-${Date.now()}`,
        externalId: `manual-${Date.now()}`,
        paymentLink: paymentLink,
      }
    };
  }

  async getPaymentStatus(id: string): Promise<PaymentStatusResult> {
    return {
      success: true,
      status: 'pending',
    };
  }

  async cancelPayment(id: string): Promise<void> {
    console.log(`[ManualProvider] Cobrança manual ${id} marcada como cancelada`);
  }
}
