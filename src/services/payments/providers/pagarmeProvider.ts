import type { PaymentProvider, CreatePaymentData, CreatePaymentResult, PaymentStatusResult } from '../paymentService';

/**
 * Provider para Pagar.me
 * 
 * ⏳ PREPARADO PARA EXPANSÃO FUTURA
 * 
 * Integração com API do Pagar.me para criar cobranças
 * Escopo futuro: implementar suporte a PIX, boleto, cartão
 * 
 * @status Não ativo nesta fase
 */
export class PagarmeProvider implements PaymentProvider {
  async createPayment(data: CreatePaymentData): Promise<CreatePaymentResult> {
    return {
      success: false,
      error: 'Pagar.me não está ativo nesta fase. Configure um gateway ativo (Asaas, Mercado Pago ou Stripe)',
    };
  }

  async getPaymentStatus(id: string): Promise<PaymentStatusResult> {
    return {
      success: false,
      error: 'Pagar.me não está ativo nesta fase',
    };
  }

  async cancelPayment(id: string): Promise<void> {
    console.log('[PagarmeProvider] Gateway não implementado em fase atual');
  }
}
