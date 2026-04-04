import { supabase } from '@/lib/supabaseClient';

export interface EmailSendResponse {
  success: boolean;
  error?: string;
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

      return { success: true };
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
