import { supabase } from '@/lib/supabaseClient';

export interface PaymentGatewayResponse {
  success: boolean;
  charge?: any;
  error?: string;
  emailStatus?: string;
  emailError?: string;
  message?: string;
}

export interface PaymentGatewayRequest {
  tenant_id?: string;
  cpfCnpj?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  amount: number;
  due_date: string;
  description: string;
  payment_method: 'pix' | 'boleto' | 'credit_card' | 'link' | 'pending' | string;
  shouldSendEmail?: boolean;
  created_by?: string;
}

class PaymentGatewayService {
  async createCharge(data: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    try {
      console.log('[PaymentGateway] Iniciando criação de cobrança:', data);

      if (!data.tenant_id) {
        throw new Error('tenant_id é obrigatório para criar cobrança.');
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error('Erro ao obter sessão do usuário.');
      }

      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      const normalizedPaymentMethod =
        data.payment_method === 'transfer'
          ? 'pix'
          : data.payment_method === 'credit_card'
            ? 'creditCard'
            : data.payment_method;

      const payload = {
        tenantId: data.tenant_id,
        chargeId: crypto.randomUUID(),
        customerName: data.customer_name,
        customerDocument: data.cpfCnpj || undefined,
        customerEmail: data.customer_email,
        customerPhone: data.customer_phone,
        amount: Number(data.amount),
        dueDate: data.due_date,
        description: data.description,
        paymentMethods: [normalizedPaymentMethod],
        createdBy: data.created_by || undefined,
        shouldSendEmail: data.shouldSendEmail ?? false,
      };

      console.log('[PaymentGateway] Invocando Edge Function create-payment-gateway com payload:', payload);

      const { data: responseData, error } = await supabase.functions.invoke('create-payment-gateway', {
        body: payload,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('[PaymentGateway] Resposta da Edge Function:', responseData);

      if (error) {
        console.error('[paymentGateway] Error creating payment:', error);
        
        let errorMessage = 'Erro ao processar pagamento.';
        
        // Supabase Functions standard error extraction
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        // Se for um erro retornado pela nossa Edge Function, os detalhes vêm no contexto
        const context = (error as any).context;
        if (context) {
          try {
            const body = await context.json();
            if (body && body.error) {
              errorMessage = `${body.error}`;
            }
          } catch (e) {
            // Se não for JSON, tentamos pegar como texto
            const text = await context.text().catch(() => '');
            if (text && text.length < 500) { // Evita lixo muito grande
              errorMessage = `${text}`;
            }
          }
        }

        throw new Error(errorMessage);
      }

      if (responseData?.error) {
        throw new Error(responseData.error || 'Erro no Gateway de Pagamento');
      }

      return {
        success: true,
        charge: responseData?.charge ?? responseData,
        message: responseData?.message || 'Cobrança gerada com sucesso!',
        emailStatus: responseData?.emailStatus,
        emailError: responseData?.emailError,
      };
    } catch (error: any) {
      console.error('[PaymentGateway] Falha ao processar cobrança via Edge Function:', error);

      return {
        success: false,
        error: error?.message || 'Erro desconhecido ao chamar a Edge Function de cobrança.',
      };
    }
  }

  async createAsaasCharge(data: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    return this.createCharge(data);
  }
}

export const paymentGatewayService = new PaymentGatewayService();