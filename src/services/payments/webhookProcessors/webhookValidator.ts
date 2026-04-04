import crypto from 'crypto';

/**
 * Validador genérico de assinatura de webhook (HMAC)
 * 
 * Suporta:
 * - Asaas: SHA512 - header "asaas-signature"
 * - Mercado Pago: SHA256 - header "x-signature"
 * - Stripe: SHA256 - header "Stripe-Signature"
 */
export class WebhookValidator {
  /**
   * Valida assinatura HMAC do webhook Asaas
   * Formato: "sha512=<hash>"
   */
  static validateAsaasSignature(payload: string, signature: string, secret: string): boolean {
    try {
      if (!signature || !signature.startsWith('sha512=')) {
        return false;
      }

      const hash = crypto
        .createHmac('sha512', secret)
        .update(payload)
        .digest('hex');

      const expectedSignature = `sha512=${hash}`;
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('[WebhookValidator] Erro na validação Asaas:', error);
      return false;
    }
  }

  /**
   * Valida assinatura do Mercado Pago
   * Formato: X-Signature header contém ts=<timestamp>,v1=<hash>
   */
  static validateMercadoPagoSignature(
    payload: string,
    signature: string,
    secret: string,
    requestId: string
  ): boolean {
    try {
      if (!signature || !signature.includes('v1=')) {
        return false;
      }

      // Extrai timestamp e hash da assinatura
      const signatureParts = signature.split(',').reduce((acc: Record<string, string>, part) => {
        const [key, value] = part.split('=');
        acc[key] = value;
        return acc;
      }, {});

      const ts = signatureParts.ts;
      const v1 = signatureParts.v1;

      if (!ts || !v1) {
        return false;
      }

      // Cria string a ser validada: request_id.timestamp.payload
      const toSign = `${requestId}.${ts}.${payload}`;

      // Gera hash com secret
      const hash = crypto
        .createHmac('sha256', secret)
        .update(toSign)
        .digest('hex');

      // Compara com timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(v1),
        Buffer.from(hash)
      );
    } catch (error) {
      console.error('[WebhookValidator] Erro na validação Mercado Pago:', error);
      return false;
    }
  }

  /**
   * Valida assinatura do Stripe
   * Formato: t=<timestamp>,v1=<hash>
   */
  static validateStripeSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    try {
      if (!signature || !signature.includes('v1=')) {
        return false;
      }

      // Extrai timestamp e hash
      const signatureParts = signature.split(',').reduce((acc: Record<string, string>, part) => {
        const [key, value] = part.split('=');
        acc[key] = value;
        return acc;
      }, {});

      const t = signatureParts.t;
      const v1 = signatureParts.v1;

      if (!t || !v1) {
        return false;
      }

      // webhook secret do Stripe vem como "whsec_..."
      const secret_bytes = Buffer.from(secret.split('_')[1] || '', 'base64');
      const signed_content = `${t}.${payload}`;

      // Gera hash com secret
      const hash = crypto
        .createHmac('sha256', secret_bytes)
        .update(signed_content)
        .digest('base64');

      // Compara
      return crypto.timingSafeEqual(
        Buffer.from(v1),
        Buffer.from(hash)
      );
    } catch (error) {
      console.error('[WebhookValidator] Erro na validação Stripe:', error);
      return false;
    }
  }

  /**
   * Valida timestamp para prevenir replay attacks
   * Aceita webhooks dentro de timeoutMs (padrão: 5 minutos)
   */
  static validateTimestamp(timestampSeconds: number, timeoutMs: number = 5 * 60 * 1000): boolean {
    try {
      const now = Math.floor(Date.now() / 1000);
      const diff = Math.abs(now - timestampSeconds);
      const diffMs = diff * 1000;

      if (diffMs > timeoutMs) {
        console.warn('[WebhookValidator] Webhook rejeitado: timestamp muito antigo');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[WebhookValidator] Erro na validação de timestamp:', error);
      return false;
    }
  }
}
