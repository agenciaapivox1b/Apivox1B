# Implementação de Edge Functions - Guia Prático

## 📋 Sumário

Este guia descreve como criar as 3 Edge Functions necessárias no Supabase para a Fase 1.

**Arquivos a criar**:
1. `supabase/functions/create-payment-asaas/index.ts`
2. `supabase/functions/create-payment-mercadopago/index.ts`
3. `supabase/functions/create-payment-stripe/index.ts`

---

## 🚀 Antes de Começar

### Pré-requisitos

1. Ter Supabase CLI instalada:
   ```bash
   npm install -g supabase
   ```

2. Autenticar no Supabase:
   ```bash
   supabase login
   ```

3. Ter credenciais dos gateways:
   - **Asaas**: API Key
   - **Mercado Pago**: API Key
   - **Stripe**: API Key + Webhook Secret

---

## 📁 Estrutura de Pastas

Na pasta `supabase/functions`, crie:

```
supabase/
├─ functions/
│  ├─ create-payment-asaas/
│  │  ├─ index.ts          ← Criar este
│  │  └─ deno.json         ← Dependências
│  ├─ create-payment-mercadopago/
│  │  ├─ index.ts          ← Criar este
│  │  └─ deno.json
│  ├─ create-payment-stripe/
│  │  ├─ index.ts          ← Criar este
│  │  └─ deno.json
│  └─ (funções existentes)
```

---

## 🔧 Passo 1: create-payment-asaas

### Criar arquivo

```bash
mkdir -p supabase/functions/create-payment-asaas
touch supabase/functions/create-payment-asaas/index.ts
touch supabase/functions/create-payment-asaas/deno.json
```

### deno.json

```json
{
  "imports": {
    "supabase": "https://esm.sh/@supabase/supabase-js@2.43.0"
  }
}
```

### index.ts

```typescript
import { createClient } from 'supabase';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!

const client = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()

    // Validar campos obrigatórios
    if (!body.tenant_id || !body.email || !body.value) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campos obrigatórios ausentes' }),
        { status: 400 }
      )
    }

    // Chamar API do Asaas
    const asaasResponse = await fetch('https://api.asaas.com/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify({
        billingType: body.paymentMethod === 'credit_card' ? 'CREDIT_CARD' : 'PIX',
        customer: body.cpfCnpj,
        dueDate: body.dueDate,
        value: body.value,
        description: body.description,
        externalReference: body.tenant_id,
        // PIX: valor mínimo em segundos
        pixExpirationSeconds: body.paymentMethod === 'pix' ? 1800 : undefined,
      }),
    })

    if (!asaasResponse.ok) {
      const error = await asaasResponse.json()
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro Asaas: ${error.errors?.[0]?.detail || 'Desconhecido'}`,
        }),
        { status: 400 }
      )
    }

    const asaasCharge = await asaasResponse.json()

    // Salvar no Supabase (opcional, para auditoria)
    await client.from('charges').insert({
      tenant_id: body.tenant_id,
      external_id: asaasCharge.id,
      provider: 'asaas',
      customer_name: body.name,
      customer_email: body.email,
      customer_phone: body.customer_phone,
      amount: body.value,
      due_date: body.dueDate,
      description: body.description,
      status: 'scheduled',
    })

    return new Response(
      JSON.stringify({
        success: true,
        charge: {
          id: asaasCharge.id,
          asaasId: asaasCharge.id,
          paymentLinkUrl: asaasCharge.invoiceUrl,
          pixQrCodeUrl: asaasCharge.dict?.qrCode?.url,
          pixCode: asaasCharge.dict?.qrCode?.code,
          boletoBarcode: asaasCharge.bankSlip?.barcode,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno no servidor',
      }),
      { status: 500 }
    )
  }
})
```

---

## 🔧 Passo 2: create-payment-mercadopago

### Criar arquivo

```bash
mkdir -p supabase/functions/create-payment-mercadopago
touch supabase/functions/create-payment-mercadopago/index.ts
touch supabase/functions/create-payment-mercadopago/deno.json
```

### deno.json

Mesmo que o Asaas.

### index.ts

Mesma estrutura, adaptar para API do Mercado Pago:

```typescript
import { createClient } from 'supabase';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const mpApiKey = Deno.env.get('MERCADOPAGO_API_KEY')!

// ... similar ao Asaas, mas chamar API do Mercado Pago
```

---

## 🔧 Passo 3: create-payment-stripe

Mesmo padrão, adaptar para API do Stripe.

---

## 🚀 Deploy para Supabase

### 1. Deploy individual

```bash
# Asaas
supabase functions deploy create-payment-asaas

# Mercado Pago
supabase functions deploy create-payment-mercadopago

# Stripe
supabase functions deploy create-payment-stripe
```

### 2. Set environment variables

```bash
supabase secrets set ASAAS_API_KEY="sua-api-key"
supabase secrets set MERCADOPAGO_API_KEY="sua-api-key"
supabase secrets set STRIPE_API_KEY="sua-api-key"
```

### 3. Verificar deploy

```bash
supabase functions list
```

---

## 🧪 Testar Edge Function

```bash
curl -X POST https://sua-supabase-url.supabase.co/functions/v1/create-payment-asaas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu-token-anonimo" \
  -d '{
    "tenant_id": "test-tenant",
    "name": "João Silva",
    "email": "joao@example.com",
    "value": 15000,
    "dueDate": "2026-04-30",
    "description": "Teste de cobrança",
    "paymentMethod": "pix",
    "customer_phone": "11999999999"
  }'
```

---

## ⚠️ Pontos Importantes

### 1. Variáveis de Ambiente

Defina no Supabase Dashboard:

```
Settings → Edge Functions Secrets
```

Com as chaves:
- `ASAAS_API_KEY`
- `MERCADOPAGO_API_KEY`
- `STRIPE_API_KEY`

### 2. CORS (se necessário)

Se chamar da web, configure CORS na Edge Function.

### 3. Permissões de Banco

As Edge Functions usam a chave de serviço (`SUPABASE_SERVICE_ROLE_KEY`), que tem acesso total ao banco. Isso é correto para operações privilegiadas.

### 4. Logs

Para debugar, use:

```bash
supabase functions list
supabase functions logs create-payment-asaas
```

---

## 📝 Template Genérico

```typescript
import { createClient } from 'supabase'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const gatewayApiKey = Deno.env.get('GATEWAY_API_KEY')!

const client = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  // 1. Validar método
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // 2. Parse request
    const body = await req.json()

    // 3. Validar campos
    if (!body.tenant_id || !body.email || !body.value) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campos ausentes' }),
        { status: 400 }
      )
    }

    // 4. Chamar API do gateway
    const gatewayResponse = await fetch('https://api.gateway.com/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayApiKey}`,
      },
      body: JSON.stringify({
        // Adaptar conforme a API do gateway
      }),
    })

    if (!gatewayResponse.ok) {
      const error = await gatewayResponse.json()
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400 }
      )
    }

    const chargeData = await gatewayResponse.json()

    // 5. Retornar sucesso
    return new Response(
      JSON.stringify({
        success: true,
        charge: {
          id: chargeData.id,
          paymentLinkUrl: chargeData.paymentLink,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno' }),
      { status: 500 }
    )
  }
})
```

---

## ✅ Checklist de Implementação

- [ ] Criar pasta `create-payment-asaas`
- [ ] Criar `index.ts` com lógica do Asaas
- [ ] Criar `deno.json` com importações
- [ ] Deploy com `supabase functions deploy`
- [ ] Testar com `curl` (veja acima)
- [ ] Repetir para Mercado Pago
- [ ] Repetir para Stripe
- [ ] Configurar variáveis de ambiente no Supabase
- [ ] Verificar logs com `supabase functions logs`
- [ ] Testar integração end-to-end no dashboard

---

**Última atualização**: 27/03/2026  
**Status**: ⏳ Pronto para implementação manual no Supabase
