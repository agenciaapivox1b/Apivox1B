import { NextRequest, NextResponse } from 'next/server';
import { webhookService, type WebhookPayloadAsaas } from '@/services/payments/webhookService';

/**
 * POST /api/webhooks/payments/asaas
 * 
 * Recebe eventos de pagamento do Asaas
 * Atualiza status de cobranças em tempo real
 * 
 * Eventos suportados:
 * - CHARGE-PAID: Cobrança recebida
 * - CHARGE-OVERDUE: Cobrança vencida
 * - CHARGE-EXPIRED: Cobrança expirada
 * - CHARGE-REFUNDED: Cobrança reembolsada
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WebhookPayloadAsaas;

    console.log('[Webhook Asaas] Evento recebido:', body.event);

    // Valida estrutura mínima
    if (!body.event) {
      return NextResponse.json(
        { error: 'Evento não especificado' },
        { status: 400 }
      );
    }

    // Processa webhook usando o serviço
    const result = await webhookService.processAsaasWebhook(body);

    if (!result.success) {
      console.warn('[Webhook Asaas] Falha ao processar:', result.error);
      // Retorna 200 OK mesmo com erro para evitar retry infinito do Asaas
      return NextResponse.json({ received: true, issue: result.error });
    }

    console.log('[Webhook Asaas] Processado com sucesso:', {
      event: body.event,
      chargeId: result.chargeId,
    });

    return NextResponse.json({
      received: true,
      message: result.message,
      eventId: result.eventId,
    });
  } catch (error: any) {
    console.error('[Webhook Asaas] Erro ao processar:', error);

    // Retorna 200 OK mesmo com erro para não sobrecarregar o Asaas com retries
    return NextResponse.json(
      { received: true, error: error?.message || 'Erro ao processar webhook' },
      { status: 200 }
    );
  }
}
