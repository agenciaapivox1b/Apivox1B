/**
 * Serviço de Rotina Agendada (Simula Edge Function / Cron)
 * 
 * Este arquivo contém a lógica que deve rodar diariamente para encontrar
 * as cobranças próximas ao vencimento, no dia, ou atrasadas, e engatilhar
 * o envio automático de mensagens baseado nas configurações do Tenant.
 */

import { supabase } from '@/lib/supabaseClient';
import { messageService } from './messageService';

export class CronService {
  /**
   * Função principal a ser executada via Cron Job Diário.
   */
  async processDailyReminders() {
    console.log('[CronService] Iniciando processamento diário de cobranças...');
    
    // Obter todas as cobranças ativas com automação ligada que não estão pagas
    const { data: charges, error } = await supabase
      .from('charges')
      .select('*')
      .eq('automation_enabled', true)
      .neq('status', 'paid')
      .neq('status', 'cancelled');

    if (error || !charges) {
      console.error('[CronService] Erro ao buscar cobranças:', error);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const charge of charges) {
      const dueDate = new Date(charge.due_date);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let shouldSend = false;
      let templateType = '';

      // Antes do vencimento
      if (diffTime > 0 && charge.remind_before_days === diffTime) {
        shouldSend = true;
        templateType = 'reminder_before';
      } 
      // No dia do vencimento
      else if (diffTime === 0 && charge.send_on_due_date) {
        shouldSend = true;
        templateType = 'reminder_on_due';
      } 
      // Após vencimento (Atrasado)
      else if (diffTime < 0 && Math.abs(diffTime) === charge.send_after_overdue_days) {
        shouldSend = true;
        templateType = 'reminder_after';
      }

      if (shouldSend) {
        await this.sendNotification(charge, templateType);
      }
    }

    console.log('[CronService] Processamento diário concluído.');
  }

  private async sendNotification(charge: any, templateType: string) {
    // 1. Buscar template apropriado do Tenant (Fallback se não houver)
    const { data: templates } = await supabase
      .from('message_templates')
      .select('*')
      .eq('tenant_id', charge.tenant_id)
      .eq('template_key', templateType)
      .eq('active', true)
      .limit(1);

    const templateContent = templates?.[0]?.content || 
      `Olá {customer_name}! Lembrete do pagamento de {amount} com vencimento em {due_date}. Link: {payment_link}`;

    // 2. Renderizar Mensagem
    const message = messageService.renderTemplate(templateContent, {
      customer_name: charge.customer_name,
      amount: charge.amount,
      due_date: charge.due_date,
      payment_link: charge.payment_link,
      pix_code: charge.pix_code,
      digitable_line: charge.digitable_line
    });

    // 3. Enviar nos canais permitidos
    let success = false;
    let sentChannel = '';

    if (charge.send_whatsapp && charge.customer_phone) {
      const result = await messageService.sendMessage('whatsapp', charge.customer_phone, message);
      if (result.success) {
        success = true;
        sentChannel = 'whatsapp';
      }
    } else if (charge.send_email && charge.customer_email) {
      const result = await messageService.sendMessage('email', charge.customer_email, message, 'Lembrete de Pagamento');
      if (result.success) {
        success = true;
        sentChannel = 'email';
      }
    }

    // 4. Registrar evento se obteve sucesso
    if (success) {
      await supabase.from('charge_events').insert({
        tenant_id: charge.tenant_id,
        charge_id: charge.id,
        event_type: 'automation_alert_sent',
        event_description: `Alerta automático (${templateType}) enviado via ${sentChannel}`,
        channel: sentChannel,
        created_by: 'system'
      });
    }
  }
}

export const cronService = new CronService();
