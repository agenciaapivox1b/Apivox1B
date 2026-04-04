/**
 * Serviço de Gerenciamento de Webhooks para Asaas
 * 
 * Responsabilidades:
 * - Registrar webhooks no Asaas para tenants
 * - Verificar status dos webhooks
 * - Testar webhooks
 * - Remover webhooks
 * 
 * ⚠️ NOTA: Este serviço comunica com a API do Asaas
 * por isso DEVE ser usado apenas no backend
 */

export interface WebhookRegistrationResult {
  success: boolean;
  webhookId?: string;
  error?: string;
  message?: string;
}

export interface WebhookTestResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

class WebhookManagementService {
  /**
   * URL base para webhooks da APIVOX
   * Configurar para o domínio real em produção
   */
  private getWebhookUrl(): string {
    // Em produção: https://sua-apivox.com/api/webhooks/payments/asaas
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/webhooks/payments/asaas`;
  }

  /**
   * Registra webhook no Asaas via sua API
   * Requer API Key configurada
   * 
   * ⚠️ A ser chamado apenas no backend
   */
  async registerWebhook(asaasApiKey: string): Promise<WebhookRegistrationResult> {
    try {
      console.log('[WebhookManagement] Registrando webhook no Asaas...');

      const webhookUrl = this.getWebhookUrl();

      // Chama a Edge Function que fazPOST na API do Asaas
      // (já que não podemos fazer chamadas diretas de dentro do Supabase)
      const response = await fetch('/api/admin/webhooks/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asaasApiKey,
          webhookUrl,
          events: [
            'PAYMENT_RECEIVED',
            'PAYMENT_OVERDUE',
            'PAYMENT_PENDING',
            'PAYMENT_DELETED',
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao registrar webhook');
      }

      console.log('[WebhookManagement] Webhook registrado com sucesso:', data.webhookId);

      return {
        success: true,
        webhookId: data.webhookId,
        message: 'Webhook registrado com sucesso',
      };
    } catch (error: any) {
      console.error('[WebhookManagement] Erro ao registrar webhook:', error);
      return {
        success: false,
        error: error?.message || 'Erro ao registrar webhook',
      };
    }
  }

  /**
   * Testa um webhook enviando evento de teste
   */
  async testWebhook(): Promise<WebhookTestResult> {
    try {
      const startTime = Date.now();
      const webhookUrl = this.getWebhookUrl();

      // Envia evento de teste
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'CHARGE-PAID',
          payment: {
            object: 'payment',
            id: 'test-payment-123',
            status: 'CONFIRMED',
            originalValue: 100.0,
            value: 100.0,
          },
          charge: {
            object: 'charge',
            id: 'test-charge-123',
            status: 'CONFIRMED',
          },
        }),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          statusCode: response.status,
          responseTime,
        };
      } else {
        return {
          success: false,
          statusCode: response.status,
          error: `Webhook retornou status ${response.status}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Erro ao testar webhook',
      };
    }
  }

  /**
   * Remove webhook do Asaas
   */
  async removeWebhook(asaasApiKey: string, webhookId: string): Promise<WebhookRegistrationResult> {
    try {
      console.log('[WebhookManagement] Removendo webhook...');

      const response = await fetch('/api/admin/webhooks/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asaasApiKey,
          webhookId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao remover webhook');
      }

      return {
        success: true,
        message: 'Webhook removido com sucesso',
      };
    } catch (error: any) {
      console.error('[WebhookManagement] Erro ao remover webhook:', error);
      return {
        success: false,
        error: error?.message || 'Erro ao remover webhook',
      };
    }
  }

  /**
   * Verifica status de um webhook registrado
   */
  async checkWebhookStatus(asaasApiKey: string): Promise<WebhookTestResult> {
    try {
      const response = await fetch('/api/admin/webhooks/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asaasApiKey }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: data.registered === true,
          statusCode: 200,
        };
      } else {
        return {
          success: false,
          statusCode: response.status,
          error: data.error,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Erro ao verificar status do webhook',
      };
    }
  }
}

export const webhookManagementService = new WebhookManagementService();
