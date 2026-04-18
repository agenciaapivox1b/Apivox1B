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

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  gateway: string;
  tested_at: string;
}

class PaymentGatewayService {
  async createCharge(data: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    try {
      console.log('[PaymentGateway] Iniciando criação de cobrança:', data);

      if (!data.tenant_id) {
        throw new Error('tenant_id é obrigatório para criar cobrança.');
      }

      // Get session and validate user is authenticated
      console.log('[PaymentGateway] Getting session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[PaymentGateway] Session error:', sessionError);
        throw new Error('Erro ao obter sessão do usuário.');
      }

      console.log('[PaymentGateway] Session data:', {
        hasSession: !!sessionData.session,
        userId: sessionData.session?.user?.id,
        expiresAt: sessionData.session?.expires_at
      });

      const accessToken = sessionData.session?.access_token;

      console.log('[PaymentGateway] Raw access_token from session:', accessToken ? 'present' : 'MISSING');
      console.log('[PaymentGateway] Token type:', typeof accessToken);
      console.log('[PaymentGateway] Token length:', accessToken?.length);

      if (!accessToken || accessToken === 'undefined') {
        console.error('[PaymentGateway] No access token found in session');
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      console.log('[PaymentGateway] Access token obtained, length:', accessToken.length);

      // Check if token is expired
      try {
        const base64Payload = accessToken.split('.')[1];
        const payload = JSON.parse(atob(base64Payload));
        const exp = payload.exp;
        const now = Math.floor(Date.now() / 1000);
        console.log('[PaymentGateway] Token expiry:', new Date(exp * 1000).toISOString());
        console.log('[PaymentGateway] Token expires in:', exp - now, 'seconds');
        console.log('[PaymentGateway] Current time:', new Date().toISOString());
        
        if (exp < now) {
          console.error('[PaymentGateway] Token is EXPIRED by', now - exp, 'seconds!');
          console.log('[PaymentGateway] Attempting session refresh...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshData.session) {
            console.error('[PaymentGateway] Failed to refresh:', refreshError);
            throw new Error('Sessão expirada. Faça login novamente.');
          }
          console.log('[PaymentGateway] Session refreshed after expiry');
          const newToken = refreshData.session.access_token;
          if (newToken) {
            return await this.executeCreateCharge(data, newToken);
          }
        }
        
        // Refresh anyway if less than 10 minutes remaining
        if (exp - now < 600) {
          console.log('[PaymentGateway] Token expires soon, refreshing...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData.session) {
            const newToken = refreshData.session.access_token;
            console.log('[PaymentGateway] Using refreshed token');
            return await this.executeCreateCharge(data, newToken);
          }
        }
      } catch (e: any) {
        if (e.message === 'Sessão expirada. Faça login novamente.') {
          throw e;
        }
        console.error('[PaymentGateway] Error checking token:', e);
      }

      // Continue with original token
      return await this.executeCreateCharge(data, accessToken);
    } catch (error: any) {
      console.error('[PaymentGateway] Error in createCharge:', error);
      throw error;
    }
  }

  private async executeCreateCharge(data: PaymentGatewayRequest, accessToken: string): Promise<PaymentGatewayResponse> {
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

    // VALIDAÇÃO FORTE DO TOKEN
    if (!accessToken || accessToken === 'undefined' || accessToken.length < 10) {
      console.error('[PaymentGateway] Token inválido ou vazio:', accessToken);
      throw new Error('Token de autenticação inválido. Faça login novamente.');
    }
    
    console.log('[PaymentGateway] Token prefix:', accessToken.substring(0, 30) + '...');
    console.log('[PaymentGateway] Tenant ID:', data.tenant_id);

    // ENVIA COM AUTHORIZATION HEADER DO USUÁRIO LOGADO
    console.log('[PaymentGateway] ===== DEBUG CHAMADA =====');
    console.log('[PaymentGateway] URL:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-gateway`);
    console.log('[PaymentGateway] Payload:', JSON.stringify(payload, null, 2));
    console.log('[PaymentGateway] Access token disponível:', accessToken ? 'SIM (length: ' + accessToken.length + ')' : 'NÃO');
    
    if (!accessToken || accessToken === 'undefined') {
      console.error('[PaymentGateway] ERRO: Token não disponível!');
      throw new Error('Usuário não autenticado. Faça login novamente.');
    }
    
    // Headers COM Authorization do usuário logado
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    };
    
    console.log('[PaymentGateway] Headers enviados:', {
      'Content-Type': headers['Content-Type'],
      'Authorization': 'Bearer ' + accessToken.substring(0, 20) + '...'
    });
    console.log('[PaymentGateway] ===== FIM DEBUG =====');

    // Call Edge Function usando fetch COM Authorization
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-gateway`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });
    
    console.log('[PaymentGateway] Response status:', response.status);
    
    let responseData;
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PaymentGateway] Error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    responseData = await response.json();
    console.log('[PaymentGateway] Response data:', responseData);
    
    return {
      success: true,
      charge: responseData?.charge ?? responseData,
      message: responseData?.message || 'Cobrança gerada com sucesso!',
      emailStatus: responseData?.emailStatus,
      emailError: responseData?.emailError,
    };
  }

  async testConnection(tenantId: string, gateway: string): Promise<TestConnectionResponse> {
    try {
      console.log(`[PaymentGateway] Testando conexão com ${gateway} para tenant ${tenantId}`);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error('Erro ao obter sessão do usuário.');
      }

      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      const payload = {
        tenantId,
        gateway: gateway.toLowerCase(),
      };

      console.log('[PaymentGateway] testConnection - access token exists:', !!accessToken);
      console.log('[PaymentGateway] token prefix:', accessToken?.substring(0, 20) + '...');
      console.log('[PaymentGateway] invoking test-gateway-connection for gateway:', gateway);

      // EXPLICITAMENTE enviar o header Authorization
      const { data: responseData, error } = await supabase.functions.invoke('test-gateway-connection', {
        body: payload,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log('[PaymentGateway] Resposta do teste de conexão:', responseData);

      if (error) {
        console.error('[PaymentGateway] Error testing connection:', error);
        
        let errorMessage = 'Erro ao testar conexão.';
        
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        const context = (error as any).context;
        if (context) {
          try {
            const body = await context.json();
            if (body && body.error) {
              errorMessage = `${body.error}`;
            }
          } catch (e) {
            const text = await context.text().catch(() => '');
            if (text && text.length < 500) {
              errorMessage = `${text}`;
            }
          }
        }

        throw new Error(errorMessage);
      }

      if (responseData?.error) {
        throw new Error(responseData.error || 'Erro no teste de conexão');
      }

      return {
        success: responseData?.success || false,
        message: responseData?.message || 'Teste concluído',
        gateway: responseData?.gateway || gateway,
        tested_at: responseData?.tested_at || new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('[PaymentGateway] Falha no teste de conexão:', error);

      throw new Error(error?.message || 'Erro desconhecido ao testar conexão com gateway');
    }
  }

  async createAsaasCharge(data: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    return this.createCharge(data);
  }

  async createMercadoPagoCharge(data: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    return this.createCharge(data);
  }

  async createStripeCharge(data: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    return this.createCharge(data);
  }
}

export const paymentGatewayService = new PaymentGatewayService();
