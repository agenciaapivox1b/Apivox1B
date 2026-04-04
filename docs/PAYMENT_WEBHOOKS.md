# Webhooks de Pagamento - Guia Completo

## 📋 Visão Geral

Este documento descreve a implementação de webhooks para os gateways de pagamento (Asaas, Mercado Pago e Stripe) na APIVOX.

**Objetivo**: Receber atualizações de status em tempo real quando um cliente efetua pagamento.

---

## 🔐 Segurança e Validação

### HMAC Signature Validation

Cada gateway usa seu próprio método de assinatura para webhooks:

| Gateway | Algoritmo | Header | Formato |
|---------|-----------|--------|---------|
| **Asaas** | SHA512 | `asaas-signature` | `sha512=<hash>` |
| **Mercado Pago** | SHA256 | `x-signature` | `ts=<timestamp>,v1=<hash>` |
| **Stripe** | SHA256 | `Stripe-Signature` | `t=<timestamp>,v1=<hash>` |

### Validação Implementada

A classe `WebhookValidator` em `src/services/payments/webhookProcessors/webhookValidator.ts` fornece:

```typescript
// Asaas
WebhookValidator.validateAsaasSignature(payload, signature, secret);

// Mercado Pago
WebhookValidator.validateMercadoPagoSignature(payload, signature, secret, requestId);

// Stripe
WebhookValidator.validateStripeSignature(payload, signature, secret);

// Timestamp validation (previne replay attacks)
WebhookValidator.validateTimestamp(timestampSeconds, timeoutMs);
```

---

## 🔄 Fluxo de Processamento

### 1. Webhook Recebido (HTTP POST)

```
Gateway (Asaas/MP/Stripe)
  ↓ POST com payload + signature
API APIVOX
  ↓ /api/webhooks/payments/{gateway}
```

### 2. Validação

```
1. Extrai payload + signature + headers
2. Valida assinatura com secret do tenant
3. Valida timestamp (< 5 minutos)
4. Checa idempotência (já processado?)
```

### 3. Processamento

```
1. Mapeia status do gateway para status interno
2. Busca cobrança por ID externo (external_id)
3. Atualiza status em chargeDatabase (localStorage/Supabase)
4. Dispara automação de notificação (futuro)
5. Retorna 200 OK ao gateway
```

---

## 📡 Endpoints de Webhook

### Asaas

**URL**: `https://seu-dominio.com/api/webhooks/payments/asaas`  
**Método**: POST  
**Header de Validação**: `asaas-signature`  
**Eventos**: CHARGE-PAID, CHARGE-OVERDUE, CHARGE-EXPIRED, etc.

**Exemplo de Payload**:
```json
{
  "event": "CHARGE-PAID",
  "payment": {
    "id": "pay_123456",
    "status": "CONFIRMED",
    "dateTime": "2026-03-27T10:30:00Z",
    "originalValue": 1500.00
  },
  "charge": {
    "id": "charge_789",
    "status": "RECEIVED"
  }
}
```

### Mercado Pago

**URL**: `https://seu-dominio.com/api/webhooks/payments/mercadopago`  
**Método**: POST  
**Header de Validação**: `x-signature` (contém timestamp + v1)  
**Header de Request ID**: `x-request-id`  
**Eventos**: payment.created, payment.updated

**Exemplo de Payload**:
```json
{
  "action": "payment.updated",
  "type": "payment",
  "data": {
    "id": "123456789",
    "status": "approved",
    "status_detail": "accredited",
    "date_approved": "2026-03-27T10:30:00Z"
  },
  "liveMode": true
}
```

### Stripe

**URL**: `https://seu-dominio.com/api/webhooks/payments/stripe`  
**Método**: POST  
**Header de Validação**: `Stripe-Signature` (contém timestamp + v1)  
**Eventos**: charge.succeeded, charge.failed, payment_intent.succeeded, etc.

**Exemplo de Payload**:
```json
{
  "id": "evt_123456789",
  "type": "charge.succeeded",
  "data": {
    "object": {
      "id": "ch_1ABC123",
      "object": "charge",
      "amount": 150000,
      "status": "succeeded",
      "currency": "brl",
      "created": 1711529400
    }
  },
  "livemode": true
}
```

---

## 🔧 Edge Functions Necessárias

Você precisa criar 3 Edge Functions no Supabase para desacupar da função genérica `create-charge`:

### 1. create-payment-asaas

**Localização**: `supabase/functions/create-payment-asaas/index.ts`

**Responsabilidade**:
- Receber dados da cobrança
- Chamar API do Asaas
- Retornar link de pagamento, PIX QR code, etc.

**Input**:
```typescript
{
  tenant_id: string;          // ID do tenant/cliente
  name: string;                // Nome do cliente
  cpfCnpj: string;            // CPF/CNPJ
  email: string;              // Email do cliente
  value: number;              // Valor em centavos
  dueDate: string;            // Data de vencimento (ISO)
  description: string;        // Descrição da cobrança
  paymentMethod: string;      // pix, boleto, credit_card
  customer_phone: string;     // Telefone
}
```

**Output**:
```typescript
{
  success: boolean;
  charge?: {
    id: string;              // ID interno
    asaasId: string;         // ID do Asaas (para webhook)
    paymentLinkUrl?: string;
    pixQrCodeUrl?: string;
    pixCode?: string;
    boletoBarcode?: string;
  };
  error?: string;
}
```

### 2. create-payment-mercadopago

**Localização**: `supabase/functions/create-payment-mercadopago/index.ts`

Mesma estrutura que create-payment-asaas.

**Retorna mercadopagoId em vez de asaasId**.

### 3. create-payment-stripe

**Localização**: `supabase/functions/create-payment-stripe/index.ts`

Mesma estrutura que create-payment-asaas.

**Retorna stripePaymentIntentId em vez de asaasId**.

---

## 💾 Idempotência

A idempotência é garantida por um `Set<string>` em memória que rastreia eventos já processados:

```typescript
private processedEvents = new Set<string>();
```

**Para ambiente de produção**, você deve:
1. Persistir em banco de dados
2. Usar `event_id` ou `payment_id` como chave única
3. Armazenar timestamp de processamento
4. Limpar eventos > 7 dias

**Benefício**: Mesmo que um webhook seja enviado 2x, apenas processa uma vez.

---

## 🔀 Mapeamento de Status

Cada gateway tem seus próprios status que são mapeados para os status internos da APIVOX:

### Asaas → Interno

| Evento | Status Interno |
|--------|----------------|
| CHARGE-PAID | paid |
| CHARGE-OVERDUE | overdue |
| CHARGE-EXPIRED | cancelled |
| CHARGE-REFUNDED | cancelled |

### Mercado Pago → Interno

| Status MP | Status Interno |
|-----------|----------------|
| approved | paid |
| paid | paid |
| pending | pending |
| rejected | cancelled |
| cancelled | cancelled |
| refunded | cancelled |

### Stripe → Interno

| Evento | Status Interno |
|--------|----------------|
| charge.succeeded | paid |
| charge.failed | cancelled |
| payment_intent.succeeded | paid |
| payment_intent.payment_failed | cancelled |

---

## 📞 Variáveis de Ambiente Necessárias

No Supabase, defina:

```bash
# Asaas
ASAAS_API_KEY=<sua-api-key-asaas>
ASAAS_WEBHOOK_SECRET=<seu-webhook-secret-asaas>

# Mercado Pago
MERCADOPAGO_API_KEY=<sua-api-key-mercadopago>
MERCADOPAGO_WEBHOOK_SECRET=<seu-webhook-secret-mercadopago>

# Stripe
STRIPE_API_KEY=<sua-api-key-stripe>
STRIPE_WEBHOOK_SECRET=<seu-webhook-secret-stripe>

# Encryption (já existente)
ENCRYPTION_MASTER_KEY=<chave-mestre-criptografia>
```

---

## 🧪 Teste de Webhooks

### Asaas

```bash
curl -X POST https://seu-dominio.com/api/webhooks/payments/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-signature: sha512=seu-hash-aqui" \
  -d '{
    "event": "CHARGE-PAID",
    "payment": {
      "id": "test-payment-123",
      "status": "CONFIRMED"
    }
  }'
```

### Mercado Pago

```bash
curl -X POST https://seu-dominio.com/api/webhooks/payments/mercadopago \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=123456789,v1=seu-hash-aqui" \
  -H "x-request-id: test-request-123" \
  -d '{
    "action": "payment.updated",
    "data": {
      "id": "test-payment-456",
      "status": "approved"
    },
    "liveMode": true
  }'
```

### Stripe

```bash
curl -X POST https://seu-dominio.com/api/webhooks/payments/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=123456789,v1=seu-hash-aqui" \
  -d '{
    "type": "charge.succeeded",
    "data": {
      "object": {
        "id": "ch_test_123",
        "status": "succeeded"
      }
    },
    "livemode": true
  }'
```

---

## 📊 Status da Implementação

| Componente | Status | Notas |
|-----------|--------|-------|
| **Asaas Webhook** | ✅ Implementado | Funcional, pronto para produção |
| **Mercado Pago Webhook** | ✅ Implementado | Funcional, pronto para produção |
| **Stripe Webhook** | ✅ Implementado | Funcional, pronto para produção |
| **HMAC Validation** | ✅ Framework | Estrutura pronta, secrets via ENV |
| **Idempotência** | ✅ Em Memória | Usar DB em produção |
| **Edge Functions** | ⏳ Pendente | Você precisa criar no Supabase |
| **Automação Pós-Webhook** | 📋 Preparado | nextReminder dispara após pagamento |

---

## ⚠️ Considerações de Produção

1. **HTTPS Obrigatório**: Todos os webhooks devem vir de HTTPS
2. **Validação de Assinatura**: SEMPRE validar assinatura do webhook
3. **Timeout**: Responder com 200 OK em < 30 segundos
4. **Retry**: Gateways retry automático se falhar
5. **Logs**: Registrar todos os webhooks para auditoria
6. **Monitoramento**: Alertar se taxa de erro de webhook > 1%

---

## 🔗 Referências

- [Asaas Webhook Docs](https://docs.asaas.com/webhook)
- [Mercado Pago Webhook Docs](https://developers.mercadopago.com/es/guides/webhooks)
- [Stripe Webhook Docs](https://stripe.com/docs/webhooks)

---

**Última atualização**: 27/03/2026  
**Versão**: 2.0 (Fase 1 - Desacoplamento)  
**Status**: ✅ Pronto para implementação
