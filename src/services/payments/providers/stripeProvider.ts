import { supabase } from '@/lib/supabaseClient';
import type { PaymentProvider, CreatePaymentData, CreatePaymentResult, PaymentStatusResult } from '../paymentService';

/**
 * Provider para Stripe
 * 
 * Integração com API do Stripe para criar cobranças
 * Chama Edge Function específica do Stripe com credenciais por tenant
 */
export class StripeProvider implements PaymentProvider {
  async createPayment(data: CreatePaymentData): Promise<CreatePaymentResult> {
    try {
      console.log('[StripeProvider] Criando cobrança:', data.description);

      if (!data.tenantId) {
        throw new Error('tenantId é obrigatório');
      }

      // Mapear paymentMethod para métodos suportados do Stripe
      const paymentMethods: Array<'pix' | 'boleto' | 'creditCard'> = [];
      if (data.paymentMethod === 'pix') paymentMethods.push('pix');
      if (data.paymentMethod === 'boleto') paymentMethods.push('boleto');
      if (data.paymentMethod === 'credit_card' || data.paymentMethod === 'link') {
        paymentMethods.push('creditCard');
      }
      
      if (paymentMethods.length === 0) {
        paymentMethods.push('creditCard'); // Padrão para Stripe
      }

      // Invoca Edge Function específica do Stripe
      const { data: responseData, error } = await supabase.functions.invoke('create-payment-stripe', {
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
        console.error('[StripeProvider] Erro na Edge Function:', error);
        throw error;
      }

      if (!responseData) {
        throw new Error('Resposta vazia da Edge Function');
      }

      if (responseData.error) {
        throw new Error(responseData.error || responseData.details || 'Erro desconhecido no Stripe');
      }

      // Retorna resposta padronizada
      return {
        success: true,
        charge: {
          id: responseData.external_id || `stripe-${Date.now()}`,
          externalId: responseData.external_id,
          paymentLink: responseData.payment_link,
          barcode: responseData.boleto_barcode,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[StripeProvider] Falha ao criar cobrança:', errorMessage);
      return {
        success: false,
        error: errorMessage || 'Erro ao criar cobrança no Stripe',
      };
    }
  }

  async getPaymentStatus(id: string): Promise<PaymentStatusResult> {
    try {
      // Placeholder: implementar quando API de status for pronta
      console.log('[StripeProvider] Status check para:', id);
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
      console.log('[StripeProvider] Cancelando cobrança:', id);
      // Placeholder: implementar cancel quando API for pronta
    } catch (error) {
      console.error('[StripeProvider] Erro ao cancelar:', error);
    }
  }
}
