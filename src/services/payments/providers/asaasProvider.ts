import { supabase } from '@/lib/supabaseClient';
import type { PaymentProvider, CreatePaymentData, CreatePaymentResult, PaymentStatusResult } from '../paymentService';

export class AsaasProvider implements PaymentProvider {
  async createPayment(data: CreatePaymentData): Promise<CreatePaymentResult> {
    try {
      // Edge Function específica do Asaas (desacoplado do genérico)
      const { data: responseData, error } = await supabase.functions.invoke('create-payment-asaas', {
        body: {
          tenant_id: data.tenantId,
          name: data.customerName,
          cpfCnpj: data.cpfCnpj,
          email: data.customerEmail,
          value: data.amount,
          dueDate: data.dueDate,
          description: data.description,
          paymentMethod: data.paymentMethod,
          customer_phone: data.customerPhone,
          shouldSendEmail: false,
        }
      });

      if (error) throw error;

      if (responseData && responseData.success === false) {
        throw new Error(responseData.error || 'Erro desconhecido no Asaas');
      }

      return {
        success: true,
        charge: {
          id: responseData.charge?.id,
          externalId: responseData.charge?.asaasId || responseData.charge?.id,
          paymentLink: responseData.charge?.paymentLinkUrl,
          pixQrCode: responseData.charge?.pixQrCodeUrl,
          pixCode: responseData.charge?.globalBilling?.encodedImage,
          barcode: responseData.charge?.identificationField,
        }
      };
    } catch (error: any) {
      console.error('[AsaasProvider] Falha ao criar cobrança:', error);
      return { success: false, error: error?.message || 'Erro ao criar cobrança no Asaas' };
    }
  }

  async getPaymentStatus(id: string): Promise<PaymentStatusResult> {
    return {
      success: true,
      status: 'pending',
      error: 'Status check via provider ainda não implementado'
    };
  }

  async cancelPayment(id: string): Promise<void> {
    console.log(`[AsaasProvider] Cancelando pagamento ${id}`);
  }
}
