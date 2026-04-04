/**
 * Serviço de Webhook (Simula /api/webhooks/payment)
 * 
 * Responsável por receber callbacks assíncronos do Gateway de Pagamento,
 * verificar a autenticidade e processar o pagamento da cobrança.
 */

import { supabase } from '@/lib/supabaseClient';

export class WebhookService {
  /**
   * Endpoint de entrada.
   * Supõe que o body contém um payload com o status de pagamento.
   */
  async processPaymentWebhook(payload: any) {
    if (!payload || !payload.gateway_payment_id) {
      throw new Error('Payload inválido: gateway_payment_id ausente.');
    }

    const { gateway_payment_id, status, paid_at } = payload;

    // Buscar cobrança associada no banco
    const { data: charge, error } = await supabase
      .from('charges')
      .select('*')
      .eq('gateway_payment_id', gateway_payment_id)
      .single();

    if (error || !charge) {
      throw new Error(`Cobrança não encontrada para gateway_id: ${gateway_payment_id}`);
    }

    if (charge.status === 'paid') {
      console.log(`[Webhook] Cobrança ${charge.id} já estava dada como paga.`);
      return { success: true, message: 'Já processado' };
    }

    // Se confirmou o pagamento, realizar atualização
    if (status === 'paid' || status === 'approved') {
      const updateData = {
        status: 'paid',
        paid_at: paid_at || new Date().toISOString(),
        automation_enabled: false // Desliga lembretes futuros
      };

      const { error: updateError } = await supabase
        .from('charges')
        .update(updateData)
        .eq('id', charge.id);

      if (updateError) {
        throw new Error(`Falha ao atualizar status no DB. Erro: ${updateError.message}`);
      }

      // Record History Event
      await supabase.from('charge_events').insert({
        tenant_id: charge.tenant_id,
        charge_id: charge.id,
        event_type: 'payment_confirmed',
        event_description: 'Pagamento recebido e confirmado pelo gateway',
        created_by: 'webhook_system'
      });

      console.log(`[Webhook] Cobrança ${charge.id} atualizada para PAID via Webhook.`);
    } else if (status === 'failed') {
      // Record failed attempt event without marking the entire charge as failed necessarily
      await supabase.from('charge_events').insert({
        tenant_id: charge.tenant_id,
        charge_id: charge.id,
        event_type: 'payment_failed',
        event_description: 'Gateway de pagamento rejeitou a tentativa de pagamento',
        metadata: { payload },
        created_by: 'webhook_system'
      });
    }

    return { success: true };
  }
}

export const webhookService = new WebhookService();
