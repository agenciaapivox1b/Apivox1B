import type { PaymentProvider, CreatePaymentData, CreatePaymentResult, PaymentStatusResult } from '../paymentService';

/**
 * Provider para PagBank
 * 
 * ⏳ PREPARADO PARA EXPANSÃO FUTURA
 * 
 * Integração com API do PagBank para criar cobranças
 * Escopo futuro: implementar suporte a PIX, boleto, cartão
 * 
 * @status Não ativo nesta fase
 */
export class PagBankProvider implements PaymentProvider {
  async createPayment(data: CreatePaymentData): Promise<CreatePaymentResult> {
    return {
      success: false,
      error: 'PagBank não está ativo nesta fase. Configure um gateway ativo (Asaas, Mercado Pago ou Stripe)',
    };
  }

  async getPaymentStatus(id: string): Promise<PaymentStatusResult> {
    return {
      success: false,
      error: 'PagBank não está ativo nesta fase',
    };
  }

  async cancelPayment(id: string): Promise<void> {
    console.log('[PagBankProvider] Gateway não implementado em fase atual');
  }
}
