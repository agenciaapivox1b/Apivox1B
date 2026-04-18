// =====================================================
// WHATSAPP QR PROVIDER - INTEGRAÇÃO COM SERVIÇO NODE
// 
// Conecta ao serviço Node.js rodando Baileys
// para sessões QR Code persistentes
// =====================================================

import { supabase } from '@/lib/supabaseClient';
import { 
  BaseWhatsAppProvider, 
  SendMessageResult, 
  ConnectionStatus,
  UnifiedWhatsAppConfig,
  WhatsAppProviderFactory 
} from './BaseWhatsAppProvider';

// Configuração do serviço Node
const QR_SERVICE_URL = import.meta.env.VITE_WHATSAPP_QR_SERVICE_URL || 'http://localhost:3000';
const QR_SERVICE_API_KEY = import.meta.env.VITE_WHATSAPP_QR_API_KEY || '';

/**
 * Status detalhado da sessão QR
 */
export interface QRSessionStatus {
  sessionId: string | null;
  status: ConnectionStatus;
  qrCode: string | null;
  qrExpiresAt: Date | null;
  connectedPhone: string | null;
  deviceInfo: { platform?: string; version?: string; name?: string; } | null;
  lastActivityAt: Date | null;
  errorMessage: string | null;
}

/**
 * Provider para WhatsApp via QR Code
 * 
 * Integra com serviço Node.js rodando Baileys
 * para sessões persistentes e QR code real
 */
export class WhatsAppQRProvider extends BaseWhatsAppProvider {
  readonly providerType = 'whatsapp_qr' as const;
  
  private sessionId: string | null = null;
  private statusPollingInterval: NodeJS.Timeout | null = null;
  private qrPollingInterval: NodeJS.Timeout | null = null;
  private ws: WebSocket | null = null;

  async initialize(config: UnifiedWhatsAppConfig): Promise<boolean> {
    console.log('[WhatsAppQRProvider] Inicializando para tenant:', this.tenantId);
    
    this.config = config;
    this.sessionId = config.config.sessionId || null;
    
    if (this.sessionId) {
      const restored = await this.checkSessionStatus();
      if (restored) {
        console.log('[WhatsAppQRProvider] Sessão restaurada:', this.sessionId);
        this.startStatusPolling();
      }
    }
    
    return this.isReady();
  }

  // =====================================================
  // GERENCIAMENTO DE SESSÃO QR (Serviço Node)
  // =====================================================

  async startSession(): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      console.log('[WhatsAppQRProvider] Criando sessão no serviço Node...');
      
      if (!QR_SERVICE_API_KEY) {
        return { success: false, error: 'QR_SERVICE_API_KEY não configurada' };
      }
      
      const response = await fetch(`${QR_SERVICE_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': QR_SERVICE_API_KEY
        },
        body: JSON.stringify({ 
          tenantId: this.tenantId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data?.success) {
        console.error('[WhatsAppQRProvider] Erro ao criar sessão:', data?.error);
        return { 
          success: false, 
          error: data?.error || 'Erro ao criar sessão' 
        };
      }
      
      this.sessionId = data.sessionId;
      
      // Conectar WebSocket para updates em tempo real
      this.connectWebSocket();
      
      // Iniciar polling de status
      this.startStatusPolling();
      
      console.log('[WhatsAppQRProvider] ✅ Sessão criada no serviço Node:', this.sessionId);
      return { success: true, sessionId: this.sessionId };
      
    } catch (error: any) {
      console.error('[WhatsAppQRProvider] Exceção ao iniciar sessão:', error);
      return { success: false, error: error.message };
    }
  }

  async generateQRCode(): Promise<{ success: boolean; qrCode: string | null; expiresIn: number; error?: string }> {
    try {
      if (!this.sessionId) {
        return { success: false, qrCode: null, expiresIn: 0, error: 'Inicie uma sessão primeiro' };
      }
      
      console.log('[WhatsAppQRProvider] Buscando QR Code do serviço Node...');
      
      const response = await fetch(`${QR_SERVICE_URL}/api/qr/${this.tenantId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': QR_SERVICE_API_KEY
        }
      });
      
      const data = await response.json();
      
      if (!response.ok || !data?.success) {
        if (data?.needsRefresh) {
          console.log('[WhatsAppQRProvider] QR ainda não disponível, aguardando...');
          return { success: false, qrCode: null, expiresIn: 0, error: 'QR code sendo gerado, aguarde alguns segundos' };
        }
        return { success: false, qrCode: null, expiresIn: 0, error: data?.error || 'Erro ao obter QR' };
      }
      
      // Atualizar no banco local
      await this.updateSessionQR(data.qrCode, data.expiresIn || 60);
      
      console.log('[WhatsAppQRProvider] ✅ QR Code recebido do serviço');
      return { 
        success: true, 
        qrCode: data.qrCode, 
        expiresIn: data.expiresIn || 60 
      };
      
    } catch (error: any) {
      console.error('[WhatsAppQRProvider] Exceção ao gerar QR:', error);
      return { success: false, qrCode: null, expiresIn: 0, error: error.message };
    }
  }

  async getQRSessionStatus(): Promise<QRSessionStatus> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_qr_sessions')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .maybeSingle();
      
      if (error) {
        console.warn('[WhatsAppQRProvider] Erro ao buscar status:', error.message);
        return {
          sessionId: null,
          status: 'error',
          qrCode: null,
          qrExpiresAt: null,
          connectedPhone: null,
          deviceInfo: null,
          lastActivityAt: null,
          errorMessage: error.message
        };
      }
      
      if (!data) {
        return {
          sessionId: null, 
          status: 'disconnected', 
          qrCode: null, 
          qrExpiresAt: null,
          connectedPhone: null, 
          deviceInfo: null, 
          lastActivityAt: null, 
          errorMessage: null
        };
      }
      
      return {
        sessionId: data.session_id,
        status: data.connection_status,
        qrCode: data.current_qr_code,
        qrExpiresAt: data.qr_expires_at ? new Date(data.qr_expires_at) : null,
        connectedPhone: data.connected_phone_formatted,
        deviceInfo: data.device_info,
        lastActivityAt: data.last_activity_at ? new Date(data.last_activity_at) : null,
        errorMessage: data.last_error_message
      };
    } catch (error: any) {
      console.warn('[WhatsAppQRProvider] Exceção ao buscar status:', error.message);
      return { 
        sessionId: null, 
        status: 'error', 
        qrCode: null, 
        qrExpiresAt: null,
        connectedPhone: null, 
        deviceInfo: null, 
        lastActivityAt: null, 
        errorMessage: error.message 
      };
    }
  }

  async sendMessage(to: string, message: string, options?: any): Promise<SendMessageResult> {
    try {
      if (!this.isReady()) {
        return { success: false, error: 'Sessão QR não conectada' };
      }
      
      console.log('[WhatsAppQRProvider] Enviando mensagem via serviço Node...');
      
      const response = await fetch(`${QR_SERVICE_URL}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': QR_SERVICE_API_KEY
        },
        body: JSON.stringify({ 
          tenantId: this.tenantId,
          to,
          message
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data?.success) {
        console.error('[WhatsAppQRProvider] Erro ao enviar:', data?.error);
        return { 
          success: false, 
          error: data?.error || 'Erro ao enviar mensagem' 
        };
      }
      
      console.log('[WhatsAppQRProvider] ✅ Mensagem enviada:', data.messageId);
      return {
        success: true,
        messageId: data.messageId,
        timestamp: new Date(data.timestamp)
      };
      
    } catch (error: any) {
      console.error('[WhatsAppQRProvider] Exceção ao enviar:', error);
      return { success: false, error: error.message };
    }
  }

  async getStatus(): Promise<ConnectionStatus> {
    const status = await this.getQRSessionStatus();
    return status.status;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const status = await this.getQRSessionStatus();
    if (status.status === 'connected') {
      return { success: true, message: `Conectado: ${status.connectedPhone}` };
    }
    return { success: false, message: `Status: ${status.status}. Aguardando Fase B para conexão real.` };
  }

  async reconnect(): Promise<boolean> {
    try {
      if (!this.sessionId) {
        console.warn('[WhatsAppQRProvider] Nenhuma sessão para reconectar');
        return false;
      }
      
      console.log('[WhatsAppQRProvider] Tentando reconectar via serviço Node:', this.sessionId);
      
      // Criar nova sessão - o serviço Node vai usar auth state salvo se existir
      const result = await this.startSession();
      
      return result.success;
      
    } catch (error: any) {
      console.error('[WhatsAppQRProvider] Exceção ao reconectar:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      console.log('[WhatsAppQRProvider] Desconectando sessão...');
      
      this.stopAllPolling();
      this.closeWebSocket();
      
      // Chamar serviço Node para desconectar
      const response = await fetch(`${QR_SERVICE_URL}/api/sessions/${this.tenantId}`, {
        method: 'DELETE',
        headers: {
          'X-API-Key': QR_SERVICE_API_KEY
        }
      });
      
      if (!response.ok) {
        console.warn('[WhatsAppQRProvider] Erro ao desconectar no serviço:', await response.text());
      } else {
        console.log('[WhatsAppQRProvider] ✅ Desconectado do serviço Node');
      }
      
      // Limpar estado local
      this.sessionId = null;
      this.notifyStatusChange('disconnected');
      
    } catch (err: any) {
      console.warn('[WhatsAppQRProvider] Exceção ao desconectar:', err.message);
      this.sessionId = null;
      this.notifyStatusChange('disconnected');
    }
  }

  getWebhookUrl(): string | null {
    return null;
  }

  // =====================================================
  // MÉTODOS AUXILIARES (Persistência no Supabase)
  // =====================================================

  private async createSessionRecord(): Promise<void> {
    try {
      const { error } = await supabase
        .from('whatsapp_qr_sessions')
        .upsert({
          tenant_id: this.tenantId,
          session_id: this.sessionId,
          provider_type: 'whatsapp_qr',
          connection_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id' });
      
      if (error) {
        console.warn('[WhatsAppQRProvider] Erro ao criar sessão:', error.message);
      } else {
        console.log('[WhatsAppQRProvider] Sessão criada/atualizada no banco');
      }
    } catch (err: any) {
      console.warn('[WhatsAppQRProvider] Exceção ao criar sessão:', err.message);
    }
  }

  private async updateSessionQR(qrCode: string, expiresIn: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('whatsapp_qr_sessions')
        .update({
          current_qr_code: qrCode,
          qr_generated_at: new Date().toISOString(),
          qr_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          connection_status: 'awaiting_qr'
        })
        .eq('tenant_id', this.tenantId);
      
      if (error) {
        console.warn('[WhatsAppQRProvider] Erro ao atualizar QR:', error.message);
      }
    } catch (err: any) {
      console.warn('[WhatsAppQRProvider] Exceção ao atualizar QR:', err.message);
    }
  }

  private async updateSessionStatus(status: ConnectionStatus): Promise<void> {
    try {
      const updates: any = { 
        connection_status: status,
        updated_at: new Date().toISOString()
      };
      if (status === 'connected') updates.connected_at = new Date().toISOString();
      if (status === 'disconnected') updates.disconnected_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('whatsapp_qr_sessions')
        .update(updates)
        .eq('tenant_id', this.tenantId);
      
      if (error) {
        console.warn('[WhatsAppQRProvider] Erro ao atualizar status:', error.message);
      }
    } catch (err: any) {
      console.warn('[WhatsAppQRProvider] Exceção ao atualizar status:', err.message);
    }
  }

  private async checkSessionStatus(): Promise<boolean> {
    const { data } = await supabase.from('whatsapp_qr_sessions')
      .select('connection_status').eq('tenant_id', this.tenantId).eq('session_id', this.sessionId).single();
    return data?.connection_status === 'connected';
  }

  // =====================================================
  // POLLING
  // =====================================================

  startStatusPolling(intervalMs: number = 5000): void {
    this.stopStatusPolling();
    this.statusPollingInterval = setInterval(async () => {
      const status = await this.getQRSessionStatus();
      if (status.status !== this.config?.connection_status) {
        this.notifyStatusChange(status.status);
      }
    }, intervalMs);
  }

  stopStatusPolling(): void {
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
      this.statusPollingInterval = null;
    }
  }

  stopAllPolling(): void {
    this.stopStatusPolling();
    if (this.qrPollingInterval) {
      clearInterval(this.qrPollingInterval);
      this.qrPollingInterval = null;
    }
  }

  // =====================================================
  // WEBSOCKET (REAL-TIME UPDATES)
  // =====================================================

  private connectWebSocket(): void {
    if (!this.tenantId) return;

    try {
      // Converter URL HTTP para WS/WSS
      const wsUrl = QR_SERVICE_URL.replace(/^http/, 'ws').replace(/^https/, 'wss');
      this.ws = new WebSocket(`${wsUrl}/ws?tenantId=${this.tenantId}`);

      this.ws.onopen = () => {
        console.log('[WhatsAppQRProvider] WebSocket conectado');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'qr':
              this.handleQRUpdate(data.payload);
              break;
            case 'connected':
              this.handleConnectionUpdate(data.payload);
              break;
            case 'disconnected':
              this.handleDisconnection(data.payload);
              break;
            case 'message':
              this.handleIncomingMessage(data.payload);
              break;
          }
        } catch (error) {
          console.error('[WhatsAppQRProvider] Erro ao processar mensagem WebSocket:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[WhatsAppQRProvider] WebSocket fechado');
        // Tentar reconectar após 5 segundos
        setTimeout(() => this.connectWebSocket(), 5000);
      };

      this.ws.onerror = (error) => {
        console.error('[WhatsAppQRProvider] Erro no WebSocket:', error);
      };

    } catch (error) {
      console.error('[WhatsAppQRProvider] Erro ao conectar WebSocket:', error);
    }
  }

  private closeWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleQRUpdate(payload: any): void {
    console.log('[WhatsAppQRProvider] QR update via WebSocket');
    this.updateSessionQR(payload.qrCode, 60);
  }

  private handleConnectionUpdate(payload: any): void {
    console.log('[WhatsAppQRProvider] Conectado via WebSocket:', payload.phone);

    supabase
      .from('whatsapp_qr_sessions')
      .update({
        connection_status: 'connected',
        connected_phone: payload.phone,
        connected_at: new Date().toISOString(),
        current_qr_code: null,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', this.tenantId!);

    this.notifyStatusChange('connected');
  }

  private handleDisconnection(payload: any): void {
    console.log('[WhatsAppQRProvider] Desconectado via WebSocket:', payload.reason);

    supabase
      .from('whatsapp_qr_sessions')
      .update({
        connection_status: 'disconnected',
        disconnected_at: new Date().toISOString(),
        last_error_message: payload.reason,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', this.tenantId!);

    this.notifyStatusChange('disconnected');
  }

  private handleIncomingMessage(payload: any): void {
    console.log('[WhatsAppQRProvider] Mensagem recebida via WebSocket');
    // A mensagem já foi salva pelo serviço Node no banco
  }

  // =====================================================
  // PLACEHOLDER (LEGADO - não usado com serviço Node)
  // =====================================================

  private generatePlaceholderQR(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjcwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5RUiBDb2RlPC90ZXh0Pjwvc3ZnPg==';
  }
}

WhatsAppProviderFactory.register('whatsapp_qr', WhatsAppQRProvider);

