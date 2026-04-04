import type { PaymentProvider, CreatePaymentData, CreatePaymentResult, PaymentStatusResult } from '../paymentService';

/**
 * Provider para Iugu
 * 
 * ⏳ PREPARADO PARA EXPANSÃO FUTURA
 * 
 * Integração com API do Iugu para criar cobranças
 * Escopo futuro: implementar suporte a PIX, boleto, cartão
 * 
 * @status Não ativo nesta fase
 */
export class IuguProvider implements PaymentProvider {
  async createPayment(data: CreatePaymentData): Promise<CreatePaymentResult> {
    return {
      success: false,
      error: 'Iugu não está ativo nesta fase. Configure um gateway ativo (Asaas, Mercado Pago ou Stripe)',
    };
  }

  async getPaymentStatus(id: string): Promise<PaymentStatusResult> {
    return {
      success: false,
      error: 'Iugu não está ativo nesta fase',
    };
  }

  async cancelPayment(id: string): Promise<void> {
    console.log('[IuguProvider] Gateway não implementado em fase atual');
  }
}
