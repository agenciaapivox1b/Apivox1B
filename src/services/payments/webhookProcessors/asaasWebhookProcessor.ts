/**
 * Processador de webhooks do Asaas
 * 
 * Responsável por mapear eventos do Asaas para status interno
 * e executar lógica de atualização de cobrança
 */

export interface AsaasWebhookPayload {
  event:
    | 'CHARGE-PAID'
    | 'CHARGE-OVERDUE'
    | 'CHARGE-EXPIRED'
    | 'CHARGE-CANCELLED'
    | 'CHARGE-REFUNDED'
    | 'CHARGE-COPY-DEBT'
    | 'PAYMENT-RECEIVED'
    | 'PAYMENT-CONFIRMED'
    | 'PAYMENT-OVERDUE'
    | 'PAYMENT-DELETED';
  
  payment?: {
    object: string;
    id: string;
    dateTime?: string;
    status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';
    originalValue: number;
    value?: number;
  };
  
  charge?: {
    object: string;
    id: string;
    status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED' | 'ANTICIPATED';
    dueDate?: string;
  };
}

export class AsaasWebhookProcessor {
  /**
   * Mapeia evento Asaas para status interno de cobrança
   */
  static mapEventToStatus(
    event: AsaasWebhookPayload['event']
  ): 'paid' | 'overdue' | 'cancelled' | 'pending' {
    const mapping: Record<string, 'paid' | 'overdue' | 'cancelled' | 'pending'> = {
      'CHARGE-PAID': 'paid',
      'PAYMENT-RECEIVED': 'paid',
      'PAYMENT-CONFIRMED': 'paid',
      'CHARGE-OVERDUE': 'overdue',
      'PAYMENT-OVERDUE': 'overdue',
      'CHARGE-EXPIRED': 'cancelled',
      'CHARGE-CANCELLED': 'cancelled',
      'CHARGE-REFUNDED': 'cancelled',
      'PAYMENT-DELETED': 'cancelled',
    };

    return mapping[event] || 'pending';
  }

  /**
   * Extrai ID externo do payload (pode vir como payment.id ou charge.id)
   */
  static extractExternalId(payload: AsaasWebhookPayload): string | null {
    return payload.payment?.id || payload.charge?.id || null;
  }

  /**
   * Extrai timestamp do pagamento para auditoria
   */
  static extractPaymentTimestamp(payload: AsaasWebhookPayload): string | null {
    return payload.payment?.dateTime || null;
  }

  /**
   * Valida se o webhook tem dados suficientes
   */
  static isValid(payload: AsaasWebhookPayload): boolean {
    if (!payload.event) return false;
    if (!payload.payment?.id && !payload.charge?.id) return false;
    return true;
  }
}
