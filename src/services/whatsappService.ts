import { supabase } from '@/lib/supabaseClient';
import { 
  BaseWhatsAppProvider, 
  WhatsAppProviderFactory,
  WhatsAppMetaProvider,
  type WhatsAppProviderType,
  type UnifiedWhatsAppConfig,
  type ConnectionStatus 
} from '@/providers/whatsapp';

// =====================================================
// INTERFACES (mantidas para compatibilidade)
// =====================================================

export interface WhatsAppSettings {
  phone_number_id: string;
  business_account_id?: string;
  encrypted_access_token: string;
  access_token?: string; // Campo temporário para envio (será criptografado)
  verify_token: string;
  webhook_status: 'active' | 'inactive' | 'error';
  last_test_status: 'success' | 'failed' | null;
  last_test_message: string | null;
  last_test_at: string | null;
  updated_at: string;
}

export interface TestWhatsAppResponse {
  success: boolean;
  message: string;
  tested_at: string;
}

export interface SendWhatsAppResponse {
  success: boolean;
  messageId?: string;
  sent_at?: string;
  error?: string;
}

export interface WhatsAppContact {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConversation {
  id: string;
  tenant_id: string;
  contact_id: string;
  channel: 'whatsapp';
  status: 'active' | 'waiting_human' | 'resolved';
  last_message_at: string;
  created_at: string;
  updated_at: string;
  contact?: WhatsAppContact;
  last_message?: string;
}

export interface WhatsAppMessage {
  id: string;
  tenant_id: string;
  conversation_id: string;
  contact_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  provider_message_id: string;
  message_type: 'text' | 'image' | 'document' | 'audio';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sent_at: string;
  created_at: string;
}

class WhatsAppService {
  // =====================================================
  // CACHE DE PROVIDERS (uma instância por tenant)
  // =====================================================
  private providers: Map<string, BaseWhatsAppProvider> = new Map();

  // =====================================================
  // CRIPTOGRAFIA DO ACCESS TOKEN
  // =====================================================

  private async encryptApiKey(apiKey: string, tenantId: string): Promise<string> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('encrypt-api-key', {
        body: { apiKey, tenantId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        throw new Error(`Erro ao criptografar: ${error.message}`);
      }

      if (!data?.encrypted) {
        throw new Error('Resposta de criptografia inválida');
      }

      return data.encrypted;
    } catch (error: any) {
      console.error('[WhatsAppService] Erro ao criptografar API key:', error);
      throw error;
    }
  }

  // =====================================================
  // MÉTODOS DE CONFIGURAÇÃO UNIFICADA (NOVOS)
  // =====================================================

  async getUnifiedConfig(tenantId: string, providerType: WhatsAppProviderType = 'whatsapp_meta'): Promise<UnifiedWhatsAppConfig | null> {
    try {
      const { data, error } = await supabase
        .from('tenant_whatsapp_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('provider_type', providerType)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as UnifiedWhatsAppConfig | null;
    } catch (error: any) {
      console.error('[WhatsAppService] Erro ao buscar config unificada:', error);
      return null;
    }
  }

  async saveUnifiedConfig(
    tenantId: string, 
    providerType: WhatsAppProviderType, 
    config: Partial<UnifiedWhatsAppConfig>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Usuário não autenticado');
      }

      const payload = {
        tenant_id: tenantId,
        provider_type: providerType,
        ...config,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('tenant_whatsapp_configs')
        .upsert(payload, { onConflict: 'tenant_id,provider_type' })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error: any) {
      console.error('[WhatsAppService] Erro ao salvar config unificada:', error);
      return { success: false, error: error.message };
    }
  }

  async getProvider(tenantId: string): Promise<BaseWhatsAppProvider | null> {
    if (this.providers.has(tenantId)) {
      return this.providers.get(tenantId)!;
    }

    const config = await this.getUnifiedConfig(tenantId, 'whatsapp_meta');
    
    if (!config) {
      console.warn(`[WhatsAppService] Nenhuma config encontrada para tenant ${tenantId}`);
      return null;
    }

    const provider = WhatsAppProviderFactory.create(config.provider_type, tenantId);
    await provider.initialize(config);

    this.providers.set(tenantId, provider);
    return provider;
  }

  clearProvider(tenantId: string): void {
    this.providers.delete(tenantId);
  }

  // =====================================================
  // MÉTODOS LEGADOS (mantidos para compatibilidade)
  // =====================================================
  
  /**
   * Salvar configurações do WhatsApp (DUAL-WRITE)
   * - Grava na tabela antiga (tenant_whatsapp_settings) - PRINCIPAL
   * - Grava na tabela nova (tenant_whatsapp_configs) - PREPARAÇÃO FUTURA
   * - Se falhar na nova, loga erro mas não quebra a operação
   */
  async saveSettings(tenantId: string, settings: Partial<WhatsAppSettings> & { access_token?: string }): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Usuário não autenticado');
      }

      console.log('[WhatsAppService] Iniciando dual-write para tenant:', tenantId);

      // =====================================================
      // CRIPTOGRAFAR ACCESS TOKEN SE FORNECIDO
      // =====================================================
      let encryptedAccessToken = settings.encrypted_access_token;
      
      // Se recebeu access_token em texto plano (novo), criptografar
      if (settings.access_token && settings.access_token.trim()) {
        console.log('[WhatsAppService] Criptografando access token...');
        encryptedAccessToken = await this.encryptApiKey(settings.access_token, tenantId);
        console.log('[WhatsAppService] Access token criptografado com sucesso');
      }

      // =====================================================
      // PASSO 1: SALVAR NA TABELA ANTIGA (PRINCIPAL)
      // Esta é a fonte de verdade atual - NÃO PODE FALHAR
      // =====================================================
      const payloadAntigo: any = {
        tenant_id: tenantId,
        phone_number_id: settings.phone_number_id,
        business_account_id: settings.business_account_id,
        verify_token: settings.verify_token,
        webhook_status: settings.webhook_status || 'inactive',
        last_test_status: settings.last_test_status,
        last_test_message: settings.last_test_message,
        last_test_at: settings.last_test_at,
        updated_at: new Date().toISOString(),
      };

      // Adicionar token criptografado apenas se existir
      if (encryptedAccessToken) {
        payloadAntigo.encrypted_access_token = encryptedAccessToken;
      }

      const { data: dataAntigo, error: errorAntigo } = await supabase
        .from('tenant_whatsapp_settings')
        .upsert(payloadAntigo, { onConflict: 'tenant_id' })
        .select()
        .single();

      if (errorAntigo) {
        console.error('[WhatsAppService] ERRO CRÍTICO - Tabela antiga:', errorAntigo);
        throw new Error(`Erro ao salvar configurações: ${errorAntigo.message}`);
      }

      console.log('[WhatsAppService] ✅ Tabela antiga (tenant_whatsapp_settings): OK');

      // =====================================================
      // PASSO 2: SALVAR NA TABELA NOVA (PREPARAÇÃO FUTURA)
      // Se falhar, apenas loga warning - não quebra a operação
      // =====================================================
      try {
        const unifiedConfig = {
          tenant_id: tenantId,
          provider_type: 'whatsapp_meta' as const,
          connection_status: (settings.webhook_status === 'active' ? 'connected' : 'disconnected') as ConnectionStatus,
          config: {
            phoneNumberId: settings.phone_number_id || '',
            businessAccountId: settings.business_account_id || '',
            encryptedAccessToken: encryptedAccessToken || '',
            verifyToken: settings.verify_token || '',
          },
          webhook_status: settings.webhook_status || 'inactive',
          last_test_status: settings.last_test_status,
          last_test_message: settings.last_test_message,
          last_test_at: settings.last_test_at,
          updated_at: new Date().toISOString(),
        };

        const { error: errorNovo } = await supabase
          .from('tenant_whatsapp_configs')
          .upsert(unifiedConfig, { onConflict: 'tenant_id,provider_type' })
          .select()
          .single();

        if (errorNovo) {
          // Loga erro mas NÃO falha a operação
          console.warn('[WhatsAppService] ⚠️ Tabela nova (tenant_whatsapp_configs): FALHA -', errorNovo.message);
          console.warn('[WhatsAppService] A tabela antiga foi salva com sucesso. A nova tabela pode não existir ainda.');
        } else {
          console.log('[WhatsAppService] ✅ Tabela nova (tenant_whatsapp_configs): OK');
        }
      } catch (errorNovo: any) {
        // Qualquer erro na nova tabela é logado mas não quebra
        console.warn('[WhatsAppService] ⚠️ Tabela nova: EXCEÇÃO -', errorNovo.message);
        console.warn('[WhatsAppService] Isso é normal se a migration ainda não foi executada.');
      }

      console.log('[WhatsAppService] Dual-write concluído. Tenant:', tenantId);
      return { success: true };
      
    } catch (error: any) {
      console.error('[WhatsAppService] Falha no dual-write:', error);
      return { success: false, error: error.message };
    }
  }

  async getSettings(tenantId: string): Promise<WhatsAppSettings | null> {
    try {
      const { data, error } = await supabase
        .from('tenant_whatsapp_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('[WhatsAppService] Erro ao buscar configurações:', error);
      return null;
    }
  }

  async testConnection(tenantId: string): Promise<TestWhatsAppResponse> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Usuário não autenticado');
      }

      console.log('[WhatsAppService] Testando conexão para tenant:', tenantId);

      const { data, error } = await supabase.functions.invoke('test-whatsapp-connection', {
        body: { tenantId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('[WhatsAppService] Resposta do teste:', data);

      if (error) {
        console.error('[WhatsAppService] Erro no teste de conexão:', error);
        throw new Error(error.message || 'Erro ao testar conexão');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return {
        success: data?.success || false,
        message: data?.message || 'Teste concluído',
        tested_at: data?.tested_at || new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('[WhatsAppService] Falha no teste de conexão:', error);
      throw new Error(error.message || 'Erro desconhecido ao testar conexão');
    }
  }

  async sendMessage(tenantId: string, to: string, message: string, conversationId?: string): Promise<SendWhatsAppResponse> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Usuário não autenticado');
      }

      console.log('[WhatsAppService] Enviando mensagem para:', to);

      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { 
          tenantId, 
          to, 
          message, 
          conversationId 
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('[WhatsAppService] Resposta do envio:', data);

      if (error) {
        console.error('[WhatsAppService] Erro ao enviar mensagem:', error);
        throw new Error(error.message || 'Erro ao enviar mensagem');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return {
        success: data?.success || false,
        messageId: data?.messageId,
        sent_at: data?.sent_at,
      };
    } catch (error: any) {
      console.error('[WhatsAppService] Falha ao enviar mensagem:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao enviar mensagem',
      };
    }
  }

  async getConversations(tenantId: string): Promise<WhatsAppConversation[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts(id, name, phone)
        `)
        .eq('tenant_id', tenantId)
        .eq('channel', 'whatsapp')
        .order('last_message_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Buscar última mensagem de cada conversa
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conv: any) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            contact: conv.contact,
            last_message: lastMessage?.content || 'Sem mensagens',
          };
        })
      );

      return conversationsWithLastMessage;
    } catch (error: any) {
      console.error('[WhatsAppService] Erro ao buscar conversas:', error);
      return [];
    }
  }

  async getMessages(conversationId: string): Promise<WhatsAppMessage[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('[WhatsAppService] Erro ao buscar mensagens:', error);
      return [];
    }
  }

  getWebhookUrl(): string {
    // URL real do webhook usando o project ref do Supabase
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kezewdivrkmrvvbzocfl.supabase.co';
    return `${supabaseUrl}/functions/v1/webhook-whatsapp`;
  }

  async markConversationAsRead(conversationId: string): Promise<void> {
    try {
      await supabase
        .from('conversations')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    } catch (error: any) {
      console.error('[WhatsAppService] Erro ao marcar conversa como lida:', error);
    }
  }

  // Métodos legados para compatibilidade com cobranças
  private cleanPhoneNumber(phone?: string): string {
    return (phone || '').replace(/\D/g, '');
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  buildMessage(charge: any, options: any = {}): string {
    const lines: string[] = [];
    const firstName = charge.clientName?.split(' ')[0] || 'Cliente';

    lines.push(`Olá, ${firstName}!`);
    lines.push('');
    lines.push(`Gostaríamos de lembrá-lo(a) de um pagamento pendente:`);
    lines.push('');
    lines.push(`*${charge.description}*`);
    lines.push(`Valor: ${this.formatCurrency(charge.value)}`);
    lines.push(`Vencimento: ${this.formatDate(charge.dueDate)}`);

    if (charge.paymentDetails?.paymentLink) {
      lines.push('');
      lines.push(`Link para pagamento:`);
      lines.push(charge.paymentDetails.paymentLink);
    }

    lines.push('');
    lines.push('Qualquer dúvida, estou à disposição.');

    return lines.join('\n');
  }

  getWhatsAppWebUrl(charge: any, message: string): { url: string; hasPhone: boolean } {
    const phone = this.cleanPhoneNumber(charge.clientPhone);
    const hasPhone = phone.length >= 10 && phone.length <= 15;
    const encoded = encodeURIComponent(message.trim());

    const url = hasPhone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    return { url, hasPhone };
  }
}

export const whatsappService = new WhatsAppService();
