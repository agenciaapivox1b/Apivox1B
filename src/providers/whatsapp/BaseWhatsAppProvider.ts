// =====================================================
// BASE PROVIDER PATTERN - APIVOX WHATSAPP
// 
// Fase 1: Arquitetura preparada para múltiplos providers
// =====================================================

/**
 * Tipos de provider suportados
 */
export type WhatsAppProviderType = 'whatsapp_meta' | 'whatsapp_qr';

/**
 * Status de conexão unificado (funciona para ambos os providers)
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * Interface unificada de mensagem WhatsApp
 * Independente do provider de origem
 */
export interface UnifiedMessage {
  id: string;
  tenantId: string;
  provider: WhatsAppProviderType;
  providerMessageId: string;
  contactPhone: string;
  contactName?: string;
  direction: 'inbound' | 'outbound';
  content: string;
  timestamp: Date;
  messageType?: 'text' | 'image' | 'document' | 'audio' | 'video';
  mediaUrl?: string;
  quotedMessageId?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}

/**
 * Resultado de envio de mensagem
 */
export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  timestamp?: Date;
  error?: string;
}

/**
 * Configuração unificada de WhatsApp (salva no banco)
 * Usa snake_case para corresponder às colunas do banco
 */
export interface UnifiedWhatsAppConfig {
  id: string;
  tenant_id: string;
  provider_type: WhatsAppProviderType;
  connection_status: ConnectionStatus;
  config: {
    // Meta API
    phoneNumberId?: string;
    businessAccountId?: string;
    encryptedAccessToken?: string;
    verifyToken?: string;
    webhookUrl?: string;
    
    // QR Code (futuro)
    sessionId?: string;
    deviceInfo?: any;
  };
  webhook_status: string;
  last_test_status?: string;
  last_test_message?: string;
  last_test_at?: string;
  last_connected_at?: string;
  last_error_message?: string;
  last_error_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Classe abstrata base para todos os providers de WhatsApp
 * 
 * Cada provider específico (Meta API, QR Code) deve estender esta classe
 * e implementar os métodos abstratos.
 */
export abstract class BaseWhatsAppProvider {
  /**
   * Identificador do provider (readonly)
   */
  abstract readonly providerType: WhatsAppProviderType;

  /**
   * ID do tenant associado a este provider
   */
  protected tenantId: string;

  /**
   * Configuração atual do provider
   */
  protected config: UnifiedWhatsAppConfig | null = null;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  // =====================================================
  // MÉTODOS ABSTRATOS (devem ser implementados por cada provider)
  // =====================================================

  /**
   * Inicializar o provider com configuração
   */
  abstract initialize(config: UnifiedWhatsAppConfig): Promise<boolean>;

  /**
   * Enviar mensagem para um número de telefone
   */
  abstract sendMessage(to: string, message: string, options?: any): Promise<SendMessageResult>;

  /**
   * Obter status atual da conexão
   */
  abstract getStatus(): Promise<ConnectionStatus>;

  /**
   * Testar conexão com o provider
   */
  abstract testConnection(): Promise<{ success: boolean; message: string }>;

  /**
   * Desconectar do provider
   */
  abstract disconnect(): Promise<void>;

  /**
   * Obter URL do webhook (se aplicável)
   */
  abstract getWebhookUrl(): string | null;

  // =====================================================
  // MÉTODOS CONCRETOS (implementação base)
  // =====================================================

  /**
   * Carregar configuração do banco de dados
   */
  async loadConfig(): Promise<UnifiedWhatsAppConfig | null> {
    // Implementação no service layer
    return null;
  }

  /**
   * Callback para mensagens recebidas (registrado pelo MessageRouter)
   */
  protected onMessageCallback: ((message: UnifiedMessage) => void) | null = null;

  /**
   * Registrar callback para mensagens recebidas
   */
  onMessage(callback: (message: UnifiedMessage) => void): void {
    this.onMessageCallback = callback;
  }

  /**
   * Callback para mudanças de status
   */
  protected onStatusChangeCallback: ((status: ConnectionStatus) => void) | null = null;

  /**
   * Registrar callback para mudanças de status
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.onStatusChangeCallback = callback;
  }

  /**
   * Notificar mensagem recebida (chamado pelos providers específicos)
   */
  protected notifyMessage(message: UnifiedMessage): void {
    if (this.onMessageCallback) {
      this.onMessageCallback(message);
    }
  }

  /**
   * Notificar mudança de status
   */
  protected notifyStatusChange(status: ConnectionStatus): void {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(status);
    }
  }

  /**
   * Verificar se o provider está pronto para uso
   */
  isReady(): boolean {
    return this.config !== null && this.config.connection_status === 'connected';
  }

  /**
   * Obter tipo de provider
   */
  getProviderType(): WhatsAppProviderType {
    return this.providerType;
  }

  /**
   * Obter ID do tenant
   */
  getTenantId(): string {
    return this.tenantId;
  }
}

/**
 * Factory para criar providers de WhatsApp
 * 
 * Uso: const provider = WhatsAppProviderFactory.create('whatsapp_meta', tenantId);
 */
export class WhatsAppProviderFactory {
  private static providers: Map<string, new (tenantId: string) => BaseWhatsAppProvider> = new Map();

  /**
   * Registrar um provider
   */
  static register(
    providerType: WhatsAppProviderType, 
    providerClass: new (tenantId: string) => BaseWhatsAppProvider
  ): void {
    this.providers.set(providerType, providerClass);
  }

  /**
   * Criar instância de provider
   */
  static create(providerType: WhatsAppProviderType, tenantId: string): BaseWhatsAppProvider {
    const ProviderClass = this.providers.get(providerType);
    if (!ProviderClass) {
      throw new Error(`Provider não registrado: ${providerType}`);
    }
    return new ProviderClass(tenantId);
  }

  /**
   * Verificar se provider está registrado
   */
  static isRegistered(providerType: WhatsAppProviderType): boolean {
    return this.providers.has(providerType);
  }
}

