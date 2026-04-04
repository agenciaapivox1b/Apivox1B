# Arquitetura e Integração das Edge Functions

Este documento detalha a arquitetura interna das 3 Edge Functions e como elas se integram com os providers e webhooks já criados.

---

## 📐 Arquitetura Geral

```
Frontend (React)
    ↓
ChargeService.createChargeV2()
    ↓
AsaasProvider/MercadoPagoProvider/StripeProvider
    ↓
supabase.functions.invoke('create-payment-{gateway}')
    ↓
Edge Function (create-payment-asaas|mercadopago|stripe)
    ↓
Gateway API (Asaas/Mercado Pago/Stripe)
    ↓
Response (PaymentResponse padronizada)
    ↓
Provider mapeia para CreatePaymentResult
    ↓
Frontend redireciona para payment_link
```

---

## 🔄 Fluxo de Dados

### 1. Chamada do Frontend

```typescript
// src/services/chargeService.ts
const createCharge = async (chargeData: CreateChargeInput) => {
  const provider = getPaymentProvider(selectedGateway);
  
  const result = await provider.createPayment({
    amount: chargeData.amount,
    description: chargeData.description,
    dueDate: chargeData.dueDate,
    // ... outros dados
  });
  
  // result.paymentLink vem da Edge Function
  window.location.href = result.paymentLink;
};
```

### 2. Provider chama Edge Function

```typescript
// src/services/payments/providers/asaasProvider.ts
export class AsaasProvider implements PaymentProvider {
  async createPayment(input: PaymentInput): Promise<CreatePaymentResult> {
    // Chamada à Edge Function
    const { data, error } = await supabase.functions.invoke(
      'create-payment-asaas',
      {
        body: {
          tenantId: currentTenant.id,
          chargeId: input.chargeId,
          amount: input.amount,
          description: input.description,
          dueDate: input.dueDate,
          paymentMethods: ['pix', 'boleto'], // Flexível
          customerEmail: input.customer.email,
          customerName: input.customer.name,
          webhookUrl: `${API_BASE}/webhooks/payments/asaas`,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (error) throw error;

    // data vem diretamente da Edge Function (PaymentResponse)
    return {
      id: data.external_id,
      externalId: data.external_id,
      paymentLink: data.payment_link,
      pixQrCode: data.pix_qr_code,
      boletoBarcode: data.boleto_barcode,
      stripePaymentIntentId: undefined,
      // ... validado contra CreatePaymentResult
    };
  }
}
```

### 3. Edge Function processa requisição

```typescript
// supabase/functions/create-payment-asaas/index.ts

serve(async (req: Request) => {
  // 1. VALIDAÇÃO
  const body = await req.json(); // CreatePaymentRequest
  validateRequest(body); // Valida cada campo obrigatório

  // 2. AUTENTICAÇÃO
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw Error("Token inválido");
  }

  // 3. OBTER CREDENCIAIS
  const apiKey = Deno.env.get("ASAAS_API_KEY"); // De variáveis de ambiente
  if (!apiKey) throw Error("API Key não configurada");

  // 4. CHAMAR GATEWAY
  const payment = await createAsaasPayment(body, apiKey, useSandbox);
  // → Faz requisição HTTP para https://api.asaas.com/v3/payments

  // 5. FORMATAR RESPOSTA
  const response: PaymentResponse = {
    external_id: payment.id,
    status: payment.status,
    payment_link: payment.trackingUrl,
    provider: "asaas",
    // ... resto dos campos padronizados
  };

  // 6. RETORNAR
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
```

### 4. Webhook processa notificação

```
Gateway (Asaas) → POST /api/webhooks/payments/asaas
                      ↓
                  webhookService.processAsaasWebhook()
                      ↓
                  Valida HMAC, extrai dados
                      ↓
                  chargeService.markAsPaidFromWebhook()
                      ↓
                  Atualiza localStorage + DB
                      ↓
                  Dispara automação (se configurada)
```

---

## 🏗️ Estrutura Interna de Cada Edge Function

### A. Tipagem Consistente

Todas as 3 funções usam a MESMA estrutura de tipos:

```typescript
// Entrada (igual para todas 3)
interface CreatePaymentRequest {
  tenantId: string;
  chargeId: string;
  amount: number;
  description: string;
  dueDate: string;
  paymentMethods: Array<"pix" | "boleto" | "creditCard">;
  customerEmail: string;
  customerName?: string;
  customerDocument?: string;
  webhookUrl?: string;
}

// Saída (padronizada)
interface PaymentResponse {
  external_id: string;       // ID no gateway
  status: string;            // pending, paid, failed, etc
  payment_link: string;      // URL para customer pagar
  payment_method: string;    // "multiple"
  amount: number;            // Valor
  due_date: string;          // ISO 8601
  provider: string;          // "asaas", "mercadopago", "stripe"
  pix_qr_code?: string;      // Campos opcionais por gateway
  pix_copy_paste?: string;
  boleto_barcode?: string;
  created_at: string;        // ISO 8601
}
```

### B. Fluxo Idêntico em Todas as Funções

**Passo 1: Validação de entrada**
```typescript
function validateRequest(req: CreatePaymentRequest) {
  // Verifica: tenantId, chargeId, amount, description, dueDate,
  //          paymentMethods, customerEmail
  // Lança erro se algum campo estiver faltando ou inválido
}
```

**Passo 2: Autenticação**
```typescript
const authHeader = req.headers.get("Authorization");
if (!authHeader?.startsWith("Bearer ")) {
  return Response(401, "Token inválido");
}
```

**Passo 3: Variáveis de ambiente**
```typescript
const apiKey = Deno.env.get("ASAAS_API_KEY") ||
              Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ||
              Deno.env.get("STRIPE_SECRET_KEY");
```

**Passo 4: Chamar gateway**
```typescript
// Cada gateway tem sua própria função interna
const payment = await createAsaasPayment(req, apiKey, useSandbox);
const payment = await createMercadoPagoPayment(req, token, useSandbox);
const payment = await createStripeCheckoutSession(req, secretKey);
```

**Passo 5: Mapear resposta para formato padrão**
```typescript
const response: PaymentResponse = {
  external_id: payment.id,
  status: payment.status,
  payment_link: payment.trackingUrl || payment.init_point || payment.url,
  provider: "asaas" | "mercadopago" | "stripe",
  // ...
};
```

**Passo 6: Retornar padronizada**
```typescript
return new Response(JSON.stringify(response), {
  status: 200,
  headers: { "Content-Type": "application/json" },
});
```

---

## 🔐 Segurança

### 1. Autenticação
- Token Bearer obrigatório
- Validado em TODAS as requisições

### 2. API Keys
- **Nunca** hardcoded
- **Sempre** em variáveis de ambiente
- Acessadas apenas na Edge Function
- Nunca retornadas ao cliente

### 3. Validação
- Input validation em todos os campos
- Type checking com TypeScript
- Timeout de requisição: 30 segundos

### 4. Tratamento de Erro
```typescript
try {
  const payment = await createAsaasPayment(...);
} catch (error) {
  console.error("Erro ao chamar Asaas:", error.message);
  return Response(500, {
    error: "Falha ao criar pagamento",
    details: error.message, // Seguro pois não expõe stack trace
    provider: "asaas",
  });
}
```

---

## 📊 Mapeamento de Status

### Asaas → Interno
```
CHARGE-PENDING    → pending
CHARGE-CONFIRMED  → paid
CHARGE-OVERDUE    → overdue
CHARGE-REFUNDED   → cancelled
CHARGE-EXPIRED    → cancelled
```

### Mercado Pago → Interno
```
approved          → paid
pending           → pending
in_process        → pending
rejected          → cancelled
cancelled         → cancelled
refunded          → cancelled
```

### Stripe → Interno
```
succeeded         → paid
processing        → pending
failed            → cancelled
unpaid            → pending
```

---

## 🔗 Integração com Webhooks

Cada Edge Function configura o webhook URL:

```typescript
const payload = {
  // ...
  notificationUrl: req.webhookUrl, // Passado pelo frontend
  // ...
};
```

Quando o gateway chama o webhook, o `webhookService` recebe:

```typescript
// Webhook recebido do Asaas
POST /api/webhooks/payments/asaas
{
  "id": "evt_123",
  "event": "CHARGE-PAID",
  "data": {
    "id": "pay_123",
    "status": "CONFIRMED",
    "value": 150.00,
    "externalReference": "charge-id-from-request"
  }
}

// webhookService.processAsaasWebhook() extrai:
// - chargeId: data.externalReference
// - status: data.status → "paid"
// - externalId: data.id

// chargeService.markAsPaidFromWebhook() atualiza:
// localStorage.charges[chargeId] = { status: "paid", ... }
```

---

## 🚀 Fluxo Completo de Uma Transação

### Cenário: Usuário cria cobrança via Asaas

#### 1. Frontend
```typescript
// ChargePage.tsx - usuário clica "Criar Cobrança"
const handleCreateCharge = async () => {
  const charge = await chargeService.createAndStoreCharge({
    amount: 500,
    description: "Consultoria",
    dueDate: "2026-04-30",
    paymentMethods: ["pix", "boleto"],
    customer: { email: "cliente@example.com", name: "João" },
  });
  
  // charge.paymentLink vem da Edge Function
  window.location.href = charge.paymentLink;
};
```

#### 2. ChargeService
```typescript
// src/services/chargeService.ts
async createAndStoreCharge(input) {
  const provider = getPaymentProvider("asaas");
  
  const result = await provider.createPayment({
    tenantId: currentTenant.id,
    chargeId: uuidv4(),
    amount: input.amount,
    // ...
  });
  
  // Salva em localStorage
  this.charges.push({
    id: result.id,
    externalId: result.externalId,
    status: "pending",
    paymentDetails: {
      provider: "asaas",
      providerResponse: result,
      // ...
    },
  });
  
  return { ...charge, paymentLink: result.paymentLink };
}
```

#### 3. Provider
```typescript
// src/services/payments/providers/asaasProvider.ts
async createPayment(input) {
  const response = await supabase.functions.invoke(
    'create-payment-asaas',
    { body: input, headers: { Authorization: ... } }
  );
  
  return {
    id: response.data.external_id,
    externalId: response.data.external_id,
    paymentLink: response.data.payment_link,
    pixQrCode: response.data.pix_qr_code,
    // ...
  };
}
```

#### 4. Edge Function
```typescript
// supabase/functions/create-payment-asaas/index.ts
serve(async (req) => {
  const body = await req.json();
  
  // Valida e chama Asaas
  const payment = await createAsaasPayment(
    body,
    Deno.env.get("ASAAS_API_KEY"),
    false // produção
  );
  
  // Formatação
  return Response({
    external_id: payment.id,        // "pay_ABC123"
    status: "pending",
    payment_link: payment.trackingUrl,
    pix_qr_code: payment.pixQrCode,
    provider: "asaas",
    // ...
  });
});
```

#### 5. API do Asaas
```
POST https://api.asaas.com/v3/payments
{
  "customer": {...},
  "value": 500,
  "description": "Consultoria",
  "billingType": "PIX",
  "notificationUrl": "https://apivox.app/api/webhooks/payments/asaas",
  ...
}

Response:
{
  "id": "pay_ABC123",
  "status": "PENDING",
  "invoiceUrl": "https://asaas.com/...",
  "trackingUrl": "https://asaas.com/...",
  "pixQrCode": "00020126...",
  "pixCopyPaste": "00020126...",
  ...
}
```

#### 6. Cliente paga via QR Code
```
Cliente abre app bancário
Escaneia QR Code PIX
Confirma pagamento
Banco envia notificação de sucesso
```

#### 7. Webhook de Confirmação
```
Asaas detecta pagamento recebido
→ POST https://apivox.app/api/webhooks/payments/asaas
{
  "id": "evt_123",
  "event": "CHARGE-PAID",
  "data": {
    "id": "pay_ABC123",
    "status": "CONFIRMED",
    "value": 500.00,
    "externalReference": "charge-xyz",
    ...
  }
}
```

#### 8. Webhook Handler
```typescript
// API endpoint ou Edge Function para /api/webhooks/payments/asaas
const processWebhook = async (req) => {
  const payload = await req.json();
  
  // webhookService.processAsaasWebhook()
  const result = webhookService.processAsaasWebhook(payload);
  
  if (result.success) {
    // chargeService.markAsPaidFromWebhook()
    chargeService.markAsPaidFromWebhook(
      result.chargeId,
      "asaas",
      result.externalId
    );
    
    // Dispara automação se configurada
    automationService.triggerPostPaymentAutomation(result.chargeId);
  }
};
```

#### 9. Status Atualizado no Dashboard
```
ChargePage.tsx → chargeService.getCharges()
→ localStorage mostra: Status: PAID ✅
→ PaymentDetailsPanel mostra: Pago via Asaas em 27/03/2026
→ AutomationStatusDisplay inicia automações
```

---

## 📈 Escalabilidade

### Como adicionar um novo gateway

1. Criar novo provider em `src/services/payments/providers/{gateway}Provider.ts`
2. Implementar interface `PaymentProvider`
3. Chamar `supabase.functions.invoke('create-payment-{gateway}')`
4. Criar Edge Function em `supabase/functions/create-payment-{gateway}/`
5. Adicionar case em `getPaymentProvider()`
6. Criar webhook processor em `src/services/payments/webhookProcessors/{gateway}WebhookProcessor.ts`
7. Adicionar case em `webhookService.route()`

**Nenhuma alteração em chargeService ou chargeCreationService necessária.**

---

## 🧪 Testes Unitários

### Exemplo: Testar create-payment-asaas

```typescript
// test/edge-functions/create-payment-asaas.test.ts
import { assertEquals } from "https://deno.land/std@0.208.0/testing/asserts.ts";

Deno.test("createPaymentAsaas - válida entrada", async () => {
  const request = new Request(
    "http://localhost:54321/functions/v1/create-payment-asaas",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token",
      },
      body: JSON.stringify({
        tenantId: "test-tenant",
        chargeId: "test-charge",
        amount: 100,
        description: "Test",
        dueDate: "2026-04-30",
        paymentMethods: ["pix"],
        customerEmail: "test@example.com",
      }),
    }
  );

  const response = await handler(request);
  assertEquals(response.status, 200);

  const data = await response.json();
  assertEquals(data.provider, "asaas");
  assertEquals(data.external_id.startsWith("pay_"), true);
});
```

---

## 📝 Resumo técnico

| Aspecto | Detalhes |
|---------|----------|
| **Tipo** | Supabase Edge Functions (Deno) |
| **Entrada** | CreatePaymentRequest (JSON) |
| **Saída** | PaymentResponse (JSON padronizada) |
| **Autenticação** | Bearer Token |
| **Validação** | Input validation + Type checking |
| **Tratamento de Erro** | Try/catch com logs estruturados |
| **Timeout** | 30 segundos por requisição |
| **CORS** | Habilitado por padrão |
| **Variáveis** | Sempre via Deno.env (nunca hardcoded) |
| **Integração** | Via supabase.functions.invoke() |
| **Webhooks** | URL passada na requisição |
| **Status** | Mapeado para formato interno |

---

## 🎯 Próximas Iterações (Phase 2)

1. **Webhook Verification** - Implementar validação HMAC em Edge Function
2. **Retry Logic** - Reconectar se gateway cair
3. **Rate Limiting** - Proteção contra abuse
4. **Analytics** - Log detalhado de transações
5. **Multi-tenant** - Isolamento de dados por tenant
6. **Caching** - Cache de status por X minutos
