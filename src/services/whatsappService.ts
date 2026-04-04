/**
 * Serviço de WhatsApp - ARQUITETURA CORPORATIVA
 * 
 * Responsabilidades:
 * - Geração de mensagens a partir de templates
 * - Registro auditável de eventos em charge_events
 * - Preparação para integração futura com APIs (Twilio, MessageBird, etc)
 * - Validação e formatação de telefones
 * 
 * Fluxo arquitetônico:
 * Component (ChargeWhatsAppModal) -> whatsappService -> chargeService -> Supabase
 */

import type { Charge } from '@/types';
import { supabase } from '@/lib/supabaseClient';

export interface WhatsAppMessageOptions {
  includePaymentLink?: boolean;
  includeQRCode?: boolean;
  includeBarcodeInfo?: boolean;
  tone?: 'formal' | 'casual' | 'urgent';
}

export interface WhatsAppEventData {
  chargeId: string;
  tenantId?: string;
  eventType: 'whatsapp_opened' | 'whatsapp_sent_manual' | 'whatsapp_api_sent';
  description: string;
  channel: 'whatsapp';
  createdBy: string;
  phoneNumber?: string;
  messagePreview?: string;
  metadata?: Record<string, any>;
}

class WhatsAppService {
  /**
   * Formata número de telefone para uso no wa.me
   * Remove tudo que não é dígito, mantém apenas números
   */
  private cleanPhoneNumber(phone?: string): string {
    return (phone || '').replace(/\D/g, '');
  }

  /**
   * Valida se o número está com o formato mínimo (10-15 dígitos)
   */
  private isValidPhoneNumber(phone: string): boolean {
    return phone.length >= 10 && phone.length <= 15;
  }

  /**
   * Formata valor em moeda BRL
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  /**
   * Formata data em português (ex: 25 de março de 2026)
   */
  private formatDate(dateStr: string, format: 'long' | 'short' = 'long'): string {
    if (format === 'short') {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    }
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Extrai URL de pagamento (link clicável real)
   * Prioridade: paymentLink > pixQrCode (se for URL)
   * NÃO retorna códigos de texto (PIX, boleto)
   */
  private extractPaymentUrl(charge: Charge): string | null {
    const { paymentDetails } = charge;
    if (!paymentDetails) return null;

    // Link de pagamento real (clicável)
    if (paymentDetails.paymentLink && paymentDetails.paymentLink.startsWith('http')) {
      return paymentDetails.paymentLink;
    }

    // PIX QR Code (se for uma URL, não é texto)
    if (paymentDetails.pixQrCode && paymentDetails.pixQrCode.startsWith('http')) {
      return paymentDetails.pixQrCode;
    }

    return null;
  }

  /**
   * Extrai código de pagamento (texto puro)
   * Prioridade: pixCode > boletoLine > boletoBarcode
   * Estas são strings de cópia/cola, NÃO URLs
   */
  private extractPaymentCode(charge: Charge): { type: string; code: string } | null {
    const { paymentDetails } = charge;
    if (!paymentDetails) return null;

    // Código PIX (cópia e cola)
    if (paymentDetails.pixCode) {
      return { type: 'pix', code: paymentDetails.pixCode };
    }

    // Linha digitável do boleto
    if (paymentDetails.boletoLine) {
      return { type: 'boleto', code: paymentDetails.boletoLine };
    }

    // Código de barras do boleto
    if (paymentDetails.boletoBarcode) {
      return { type: 'boleto', code: paymentDetails.boletoBarcode };
    }

    return null;
  }

  /**
   * Extrai imagem QR Code do PIX (se disponível)
   */
  private extractPixQrCodeImage(charge: Charge): string | null {
    const { paymentDetails } = charge;
    if (!paymentDetails?.pixQrCode) return null;

    // Se for URL (base64 ou imagem), retorna
    if (
      paymentDetails.pixQrCode.startsWith('data:') ||
      paymentDetails.pixQrCode.startsWith('http')
    ) {
      return paymentDetails.pixQrCode;
    }

    return null;
  }

  /**
   * CORE: Gera mensagem de cobrança para WhatsApp
   * 
   * Separa corretamente:
   * - Links clicáveis (URLs)
   * - Códigos de pagamento (PIX, boleto)
   * 
   * Saída esperada:
   * "Olá, João! 👋
   *  
   *  Gostaríamos de lembrá-lo(a) de um pagamento pendente:
   *  
   *  📋 *Consulta - Janeiro/2026*
   *  💰 Valor: *R$ 1.250,00*
   *  📅 Vencimento: *25 de março de 2026*
   *  
   *  🔗 *Link para pagamento:*
   *  https://asaas.com/...
   *  
   *  💳 *Ou copie o código PIX:*
   *  12345.67890"
   */
  buildMessage(
    charge: Charge,
    options: WhatsAppMessageOptions = {}
  ): string {
    const {
      includePaymentLink = true,
      tone = 'casual',
    } = options;

    const lines: string[] = [];
    const firstName = charge.clientName?.split(' ')[0] || 'Cliente';

    // Saudação (tom)
    if (tone === 'urgent') {
      lines.push(`Olá, ${firstName}! ⚠️`);
      lines.push('');
      lines.push(`*ATENÇÃO*: Seu pagamento está VENCIDO!`);
    } else {
      lines.push(`Olá, ${firstName}! 👋`);
      lines.push('');
      lines.push(`Gostaríamos de lembrá-lo(a) de um pagamento pendente:`);
    }

    // Corpo da cobrança
    lines.push('');
    lines.push(`📋 *${charge.description}*`);
    lines.push(`💰 Valor: *${this.formatCurrency(charge.value)}*`);
    lines.push(`📅 Vencimento: *${this.formatDate(charge.dueDate, 'long')}*`);

    // Link de pagamento (se é URL real)
    if (includePaymentLink) {
      const paymentUrl = this.extractPaymentUrl(charge);

      if (paymentUrl) {
        lines.push('');
        lines.push(`🔗 *Link para pagamento:*`);
        lines.push(paymentUrl);
      }

      // Código de pagamento (PIX, boleto) - TEXTO PURO, não link
      const paymentCode = this.extractPaymentCode(charge);

      if (paymentCode) {
        lines.push('');
        if (paymentCode.type === 'pix') {
          lines.push(`💳 *Ou copie o código PIX:*`);
        } else {
          lines.push(`💳 *Código de Barras:*`);
        }
        lines.push(paymentCode.code);
      }
    }

    // Encerramento
    lines.push('');
    lines.push('Qualquer dúvida, estou à disposição. Obrigado! 🙏');

    return lines.join('\n');
  }

  /**
   * Abre WhatsApp Web (wa.me) com mensagem pré-preenchida
   * Retorna URL que deve ser aberta em nova aba
   */
  getWhatsAppWebUrl(charge: Charge, message: string): { url: string; hasPhone: boolean } {
    const phone = this.cleanPhoneNumber(charge.clientPhone);
    const hasPhone = phone && this.isValidPhoneNumber(phone);
    const encoded = encodeURIComponent(message.trim());

    const url = hasPhone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    return { url, hasPhone };
  }

  /**
   * ETAPA 2: Registra evento de WhatsApp em charge_events
   * 
   * Event types:
   * - whatsapp_opened: Modal aberto, pronto para enviar pelo wa.me
   * - whatsapp_sent_manual: Usuário clicou "Abrir no WhatsApp" (sai do app)
   * - whatsapp_api_sent: (futuro) Enviado via Twilio/API
   */
  async logEvent(data: WhatsAppEventData): Promise<boolean> {
    try {
      // Validar UUID para operações no Supabase
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(data.chargeId)) {
        console.log('[WhatsAppService] ID é mock, event não será registrado no banco');
        return false;
      }

      const { error } = await supabase.from('charge_events').insert({
        charge_id: data.chargeId,
        tenant_id: data.tenantId,
        event_type: data.eventType,
        event_description: data.description,
        channel: data.channel,
        created_by: data.createdBy,
        metadata: {
          phone: data.phoneNumber,
          message_preview: data.messagePreview?.substring(0, 150),
          ...data.metadata,
        },
      });

      if (error) {
        console.warn('[WhatsAppService] Erro ao registrar evento:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[WhatsAppService] Erro inesperado ao registrar evento:', err);
      return false;
    }
  }

  /**
   * ETAPA 3: Prepara para integração futura com API externa
   * 
   * Exemplo de uso futuro:
   * ```ts
   * const result = await whatsappService.sendViaAPI(charge, message, {
   *   provider: 'twilio', // ou 'messagebird', 'zenvia', etc
   *   apiKey: process.env.TWILIO_API_KEY
   * });
   * ```
   * 
   * Por enquanto, retorna estrutura simulada
   */
  async sendViaAPI(
    charge: Charge,
    message: string,
    config: {
      provider?: 'twilio' | 'messagebird' | 'zenvia' | 'apivox';
      apiKey?: string;
      simulate?: boolean;
    } = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { provider = 'apivox', simulate = true } = config;

    if (simulate || !config.apiKey) {
      // Modo simulação (para ambiente de desenvolvimento)
      console.log(`[WhatsAppService] Simuladamente enviando via ${provider}`);
      return {
        success: true,
        messageId: `sim_${Date.now()}`,
      };
    }

    // Aqui virá a integração real com Twilio / MessageBird / etc
    // TODO: Implementar quando houver chave de API
    return {
      success: false,
      error: `Integração com ${provider} ainda não configurada`,
    };
  }

  /**
   * Extrai informações para log/debug
   */
  getSummary(charge: Charge): {
    clientName: string;
    clientPhone: string;
    hasValidPhone: boolean;
    hasPaymentData: boolean;
    totalCharges?: number;
  } {
    const cleanPhone = this.cleanPhoneNumber(charge.clientPhone);
    const hasValidPhone = this.isValidPhoneNumber(cleanPhone);
    const hasPaymentUrl = !!this.extractPaymentUrl(charge);
    const hasPaymentCode = !!this.extractPaymentCode(charge);
    const hasPaymentData = hasPaymentUrl || hasPaymentCode;

    return {
      clientName: charge.clientName,
      clientPhone: charge.clientPhone,
      hasValidPhone,
      hasPaymentData,
    };
  }
}

export const whatsappService = new WhatsAppService();
