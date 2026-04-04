/**
 * Processador de webhooks do Stripe
 * 
 * Responsável por mapear eventos do Stripe para status interno
 * e executar lógica de atualização de cobrança
 */

export interface StripeWebhookPayload {
  id: string;
  object: string;
  api_version: string;
  created: number; // Unix timestamp
  data: {
    object: {
      id: string;
      object: string;
      status?: 'succeeded' | 'processing' | 'requires_payment_method' | 'requires_action' | 'requires_confirmation' | 'canceled';
      created: number;
      currency: string;
      customer?: string;
      description?: string;
      amount?: number;
      amount_received?: number;
      charges?: {
        data: Array<{
          id: string;
          status: 'succeeded' | 'failed' | 'pending';
          paid: boolean;
          created: number;
        }>;
      };
      invoice?: string;
      metadata?: Record<string, string>;
    };
    previous_attributes?: Record<string, any>;
  };
  livemode: boolean;
  pending_webhooks: number;
  request?: {
    id: string | null;
    idempotency_key: string | null;
  };
  type:
    | 'payment_intent.succeeded'
    | 'payment_intent.payment_failed'
    | 'payment_intent.canceled'
    | 'invoice.paid'
    | 'invoice.payment_failed'
    | 'charge.succeeded'
    | 'charge.failed'
    | string;
}

export class StripeWebhookProcessor {
  /**
   * Mapeia status Stripe para status interno
   */
  static mapStatusToInternal(
    stripeStatus?: string,
    eventType?: string
  ): 'paid' | 'overdue' | 'cancelled' | 'pending' {
    // Para charge events
    if (eventType?.includes('charge')) {
      const mapping: Record<string, 'paid' | 'cancelled' | 'pending'> = {
        'succeeded': 'paid',
        'failed': 'cancelled',
        'pending': 'pending',
      };
      return mapping[stripeStatus || 'pending'] || 'pending';
    }

    // Para payment_intent events
    const mapping: Record<string, 'paid' | 'cancelled' | 'pending'> = {
      'succeeded': 'paid',
      'processing': 'pending',
      'requires_payment_method': 'pending',
      'requires_action': 'pending',
      'requires_confirmation': 'pending',
      'canceled': 'cancelled',
    };

    return mapping[stripeStatus || 'pending'] || 'pending';
  }

  /**
   * Extrai ID externo (Payment Intent ID ou Charge ID do Stripe)
   */
  static extractExternalId(payload: StripeWebhookPayload): string | null {
    // Preferir charge ID se disponível, fallback para payment intent ID
    return payload.data?.object?.id || null;
  }

  /**
   * Extrai timestamp (Unix timestamp)
   */
  static extractPaymentTimestamp(payload: StripeWebhookPayload): string | null {
    if (payload.data?.object?.created) {
      return new Date(payload.data.object.created * 1000).toISOString();
    }
    return null;
  }

  /**
   * Mapeia tipo de evento Stripe
   */
  static mapEventType(eventType: string): string {
    const mapping: Record<string, string> = {
      'payment_intent.succeeded': 'payment_succeeded',
      'payment_intent.payment_failed': 'payment_failed',
      'payment_intent.canceled': 'payment_cancelled',
      'invoice.paid': 'invoice_paid',
      'invoice.payment_failed': 'invoice_payment_failed',
      'charge.succeeded': 'charge_succeeded',
      'charge.failed': 'charge_failed',
    };

    return mapping[eventType] || eventType;
  }

  /**
   * Valida se o webhook tem dados suficientes
   */
  static isValid(payload: StripeWebhookPayload): boolean {
    if (!payload.type) return false;
    if (!payload.data?.object?.id) return false;
    if (!payload.livemode) {
      console.warn('[StripeWebhookProcessor] Webhook é teste (não livemode)');
      return false; // Ignora webhooks de teste
    }
    return true;
  }

  /**
   * Determina se este webhook deve atualizar o status da cobrança
   */
  static shouldUpdateChargeStatus(payload: StripeWebhookPayload): boolean {
    // Atualiza apenas para eventos de pagamento/cobrança bem-sucedido ou falho
    return (
      payload.type === 'charge.succeeded' ||
      payload.type === 'charge.failed' ||
      payload.type === 'payment_intent.succeeded' ||
      payload.type === 'payment_intent.payment_failed' ||
      payload.type === 'invoice.paid'
    );
  }

  /**
   * Extrai metadata customizada (se disponível)
   */
  static extractMetadata(payload: StripeWebhookPayload): Record<string, string> | null {
    return payload.data?.object?.metadata || null;
  }
}
