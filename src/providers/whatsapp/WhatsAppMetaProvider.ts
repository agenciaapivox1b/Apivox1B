// =====================================================
// META API PROVIDER - Implementação para WhatsApp Cloud API
// 
// Fase 1: Encapsula lógica existente da Meta API
// =====================================================

import { supabase } from '@/lib/supabaseClient';
import { 
  BaseWhatsAppProvider, 
  SendMessageResult, 
  ConnectionStatus, 
  UnifiedMessage,
  UnifiedWhatsAppConfig,
  WhatsAppProviderFactory 
} from './BaseWhatsAppProvider';

/**
 * Provider para WhatsApp Cloud API da Meta
 * 
 * Implementação completa usando a API oficial da Meta
 */
export class WhatsAppMetaProvider extends BaseWhatsAppProvider {
  readonly providerType = 'whatsapp_meta' as const;

  /**
   * Inicializar provider com configuração
   */
  async initialize(config: UnifiedWhatsAppConfig): Promise<boolean> {
    this.config = config;
    
    // Verificar se configuração mínima existe
    if (!this.config.config.phoneNumberId || !this.config.config.encryptedAccessToken) {
      console.warn('[WhatsAppMetaProvider] Configuração incompleta');
      return false;
    }

    // Testar conexão silenciosamente
    const test = await this.testConnection();
    if (test.success) {
      this.notifyStatusChange('connected');
    }

    return test.success;
  }

  /**
   * Enviar mensagem via Meta API
   */
  async sendMessage(to: string, message: string, options?: any): Promise<SendMessageResult> {
    try {
      if (!this.isReady()) {
        return { success: false, error: 'Provider não inicializado' };
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      console.log('[WhatsAppMetaProvider] Enviando mensagem para:', to);

      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { 
          tenantId: this.tenantId,
          to, 
          message,
          ...options
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        console.error('[WhatsAppMetaProvider] Erro ao enviar:', error);
        return { success: false, error: error.message };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      return {
        success: data?.success || false,
        messageId: data?.messageId,
        timestamp: data?.sent_at ? new Date(data.sent_at) : new Date(),
      };

    } catch (error: any) {
      console.error('[WhatsAppMetaProvider] Erro inesperado:', error);
      return { 
        success: false, 
        error: error.message || 'Erro desconhecido ao enviar mensagem' 
      };
    }
  }

  /**
   * Obter status da conexão
   */
  async getStatus(): Promise<ConnectionStatus> {
    return this.config?.connection_status || 'disconnected';
  }

  /**
   * Testar conexão com Meta API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      const { data, error } = await supabase.functions.invoke('test-whatsapp-connection', {
        body: { tenantId: this.tenantId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        return { 
          success: false, 
          message: error.message || 'Erro ao testar conexão' 
        };
      }

      if (data?.error) {
        return { 
          success: false, 
          message: data.error 
        };
      }

      return {
        success: data?.success || false,
        message: data?.message || 'Teste concluído',
      };

    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || 'Erro inesperado' 
      };
    }
  }

  /**
   * Desconectar (Meta API não mantém sessão, apenas marca como inativo)
   */
  async disconnect(): Promise<void> {
    // Meta API não tem desconexão persistente
    // Apenas atualizamos o status local
    this.notifyStatusChange('disconnected');
    console.log('[WhatsAppMetaProvider] Desconectado');
  }

  /**
   * Obter URL do webhook
   */
  getWebhookUrl(): string | null {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
                         'https://kezewdivrkmrvvbzocfl.supabase.co';
    return `${supabaseUrl}/functions/v1/webhook-whatsapp`;
  }

  /**
   * Obter configurações específicas da Meta API
   */
  getMetaConfig() {
    if (!this.config) return null;
    return {
      phoneNumberId: this.config.config.phoneNumberId,
      businessAccountId: this.config.config.businessAccountId,
      verifyToken: this.config.config.verifyToken,
      webhookUrl: this.config.config.webhookUrl,
    };
  }
}

// =====================================================
// REGISTRAR PROVIDER NA FACTORY
// =====================================================

// Auto-registro ao importar
WhatsAppProviderFactory.register('whatsapp_meta', WhatsAppMetaProvider);

