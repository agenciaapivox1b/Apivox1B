import { supabase } from '@/lib/supabaseClient';
import type { PaymentProvider, CreatePaymentData, CreatePaymentResult, PaymentStatusResult } from '../paymentService';

/**
 * Provider para Mercado Pago
 * 
 * Integração com API do Mercado Pago para criar cobranças (PIX, Boleto)
 * Chama Edge Function específica do Mercado Pago com credenciais por tenant
 */
export class MercadoPagoProvider implements PaymentProvider {
  async createPayment(data: CreatePaymentData): Promise<CreatePaymentResult> {
    try {
      console.log('[MercadoPagoProvider] Criando cobrança:', data.description);

      if (!data.tenantId) {
        throw new Error('tenantId é obrigatório');
      }

      // Mapear paymentMethod para métodos suportados pelo Mercado Pago
      const paymentMethods: Array<'pix' | 'boleto' | 'credit_card'> = [];
      if (data.paymentMethod === 'pix') paymentMethods.push('pix');
      if (data.paymentMethod === 'boleto') paymentMethods.push('boleto');
      if (data.paymentMethod === 'credit_card' || data.paymentMethod === 'link') {
        paymentMethods.push('credit_card');
      }
      
      if (paymentMethods.length === 0) {
        paymentMethods.push('pix', 'boleto'); // Padrão
      }

      // Invoca Edge Function específica do Mercado Pago
      const { data: responseData, error } = await supabase.functions.invoke('create-payment-mercadopago', {
        body: {
          tenantId: data.tenantId,
          chargeId: data.tenantId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerDocument: data.cpfCnpj,
          amount: data.amount,
          dueDate: data.dueDate,
          description: data.description,
          paymentMethods,
        },
      });

      if (error) {
        console.error('[MercadoPagoProvider] Erro na Edge Function:', error);
        throw error;
      }

      if (!responseData) {
        throw new Error('Resposta vazia da Edge Function');
      }

      if (responseData.error) {
        throw new Error(responseData.error || responseData.details || 'Erro desconhecido no Mercado Pago');
      }

      // Retorna resposta padronizada
      return {
        success: true,
        charge: {
          id: responseData.external_id || `mp-${Date.now()}`,
          externalId: responseData.external_id,
          paymentLink: responseData.payment_link,
          pixQrCode: responseData.pix_qr_code,
          pixCode: responseData.pix_copy_paste,
          barcode: responseData.boleto_barcode,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[MercadoPagoProvider] Falha ao criar cobrança:', errorMessage);
      return {
        success: false,
        error: errorMessage || 'Erro ao criar cobrança no Mercado Pago',
      };
    }
  }

  async getPaymentStatus(id: string): Promise<PaymentStatusResult> {
    try {
      // Placeholder: implementar quando API de status for pronta
      console.log('[MercadoPagoProvider] Status check para:', id);
      return {
        success: true,
        status: 'pending',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        success: false,
        error: errorMessage || 'Erro ao buscar status',
      };
    }
  }

  async cancelPayment(id: string): Promise<void> {
    try {
      console.log('[MercadoPagoProvider] Cancelando cobrança:', id);
      // Placeholder: implementar cancel quando API for pronta
    } catch (error) {
      console.error('[MercadoPagoProvider] Erro ao cancelar:', error);
    }
  }
}
