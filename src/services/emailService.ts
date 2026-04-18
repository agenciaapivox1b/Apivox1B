import { supabase } from '@/lib/supabaseClient';
import { TenantService } from './tenantService';

export interface EmailSendResponse {
  success: boolean;
  error?: string;
  messageId?: string;
}

export interface ChargeEmailData {
  to: string;
  clientName: string;
  description: string;
  value?: string;
  dueDate?: string;
  chargeLink?: string;
  chargeCode?: string;
  chargeId?: string;
}

class EmailService {
  /**
   * Envia um e-mail de cobrança real através da Edge Function 'send-email'
   * @param chargeId ID da cobrança no banco de dados
   * @param templateKey Chave do template (default: 'charge_created_email')
   */
  async sendBillingEmail(chargeId: string, templateKey: string = 'charge_created_email'): Promise<EmailSendResponse> {
    try {
      console.log(`[EmailService] Solicitando envio de e-mail para: ${chargeId}`);
      
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { charge_id: chargeId, template_key: templateKey }
      });

      if (error) throw error;
      
      if (data && data.success === false) {
        throw new Error(data.error || 'Erro ao processar envio no servidor');
      }

      return { success: true, messageId: data.messageId };
    } catch (error: any) {
      console.error('[EmailService] Falha no envio de e-mail:', error);
      return {
        success: false,
        error: error?.message || 'Erro inesperado na comunicação com o serviço de e-mail.',
      };
    }
  }

  /**
   * Envia e-mail de cobrança com dados diretos (não precisa buscar do banco)
   * Usado pelo SendChargeModal para envio imediato
   * @param chargeData Dados da cobrança e destinatário
   */
  async sendChargeEmail(chargeData: ChargeEmailData): Promise<EmailSendResponse> {
    try {
      console.log(`[EmailService] Enviando e-mail de cobrança para: ${chargeData.to}`);
      
      const tenantId = await TenantService.getCurrentTenantId();
      if (!tenantId) {
        throw new Error('Tenant não identificado. Não é possível enviar e-mail.');
      }

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { 
          tenantId,
          chargeData: {
            to: chargeData.to,
            clientName: chargeData.clientName,
            description: chargeData.description,
            value: chargeData.value,
            dueDate: chargeData.dueDate,
            chargeLink: chargeData.chargeLink,
            chargeCode: chargeData.chargeCode,
            chargeId: chargeData.chargeId,
          }
        }
      });

      if (error) throw error;
      
      if (data && data.success === false) {
        throw new Error(data.error || 'Erro ao processar envio no servidor');
      }

      console.log(`[EmailService] E-mail enviado com sucesso: ${data.messageId}`);
      return { success: true, messageId: data.messageId };
    } catch (error: any) {
      console.error('[EmailService] Falha no envio de e-mail:', error);
      return {
        success: false,
        error: error?.message || 'Erro inesperado na comunicação com o serviço de e-mail.',
      };
    }
  }
}

export const emailService = new EmailService();
