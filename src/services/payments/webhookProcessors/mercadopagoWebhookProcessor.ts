/**
 * Processador de webhooks do Mercado Pago
 * 
 * Responsável por mapear eventos do Mercado Pago para status interno
 * e executar lógica de atualização de cobrança
 */

export interface MercadoPagoWebhookPayload {
  action: 'payment.created' | 'payment.updated' | 'charge.created' | 'charge.updated';
  type: 'payment' | 'charge';
  data: {
    id: string;
    status?:
      | 'pending'
      | 'approved'
      | 'authorized'
      | 'paid'
      | 'in_process'
      | 'in_mediation'
      | 'rejected'
      | 'cancelled'
      | 'refunded'
      | 'charged_back';
    status_detail?: string;
    date_created?: string;
    date_approved?: string;
    date_last_updated?: string;
  };
  liveMode: boolean;
}

export class MercadoPagoWebhookProcessor {
  /**
   * Mapeia status Mercado Pago para status interno
   */
  static mapStatusToInternal(
    mpStatus?: string
  ): 'paid' | 'overdue' | 'cancelled' | 'pending' {
    const mapping: Record<string, 'paid' | 'overdue' | 'cancelled' | 'pending'> = {
      'approved': 'paid',
      'paid': 'paid',
      'authorized': 'paid',
      'pending': 'pending',
      'in_process': 'pending',
      'in_mediation': 'pending',
      'rejected': 'cancelled',
      'cancelled': 'cancelled',
      'refunded': 'cancelled',
      'charged_back': 'cancelled',
    };

    return mapping[mpStatus || 'pending'] || 'pending';
  }

  /**
   * Extrai ID externo (payment ID do Mercado Pago)
   */
  static extractExternalId(payload: MercadoPagoWebhookPayload): string | null {
    return payload.data?.id || null;
  }

  /**
   * Extrai timestamp para auditoria (preferir date_approved, fallback para date_created)
   */
  static extractPaymentTimestamp(payload: MercadoPagoWebhookPayload): string | null {
    return payload.data?.date_approved || payload.data?.date_created || null;
  }

  /**
   * Molda evento para formato interno
   */
  static mapEventType(action: MercadoPagoWebhookPayload['action']): string {
    const mapping: Record<string, string> = {
      'payment.created': 'payment_created',
      'payment.updated': 'payment_updated',
      'charge.created': 'charge_created',
      'charge.updated': 'charge_updated',
    };

    return mapping[action] || action;
  }

  /**
   * Valida se o webhook tem dados suficientes
   */
  static isValid(payload: MercadoPagoWebhookPayload): boolean {
    if (!payload.action) return false;
    if (!payload.data?.id) return false;
    if (!payload.liveMode) {
      console.warn('[MercadoPagoWebhookProcessor] Webhook é teste (não liveMode)');
      return false; // Ignora webhooks de teste
    }
    return true;
  }

  /**
   * Determina se este webhook deve atualizar o status da cobrança
   */
  static shouldUpdateChargeStatus(payload: MercadoPagoWebhookPayload): boolean {
    // Atualiza em payment.updated e se houver mudança de status
    return payload.action === 'payment.updated' && !!payload.data?.status;
  }
}
