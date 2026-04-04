# 🚀 Edge Functions - APIVOX Multi-Gateway Payment System

Documentação completa das 3 Edge Functions para o sistema de pagamentos multi-gateway da APIVOX.

---

## 📍 Arquivos Criados

### Edge Functions (Código)
```
supabase/functions/
├── create-payment-asaas/
│   ├── deno.json
│   └── index.ts (completa, pronta para deploy)
├── create-payment-mercadopago/
│   ├── deno.json
│   └── index.ts (completa, pronta para deploy)
└── create-payment-stripe/
    ├── deno.json
    └── index.ts (completa, pronta para deploy)
```

### Documentação
```
docs/
├── EDGE_FUNCTIONS_COMPLETE_V2.md      (Guia de deploy e testes)
├── EDGE_FUNCTIONS_ARCHITECTURE.md     (Arquitetura e integração)
└── EDGE_FUNCTIONS_VALIDATION_CHECKLIST.md (Checklist de validação)
```

---

## ⚡ Quick Start

### 1️⃣ Deploy Local (Desenvolvimento)

```bash
# Terminal 1: Servir Asaas
supabase functions serve create-payment-asaas --env-file .env.local

# Terminal 2: Servir Mercado Pago
supabase functions serve create-payment-mercadopago --env-file .env.local

# Terminal 3: Servir Stripe
supabase functions serve create-payment-stripe --env-file .env.local
```

### 2️⃣ Deploy Produção (Supabase)

```bash
supabase login
supabase functions deploy create-payment-asaas
supabase functions deploy create-payment-mercadopago
supabase functions deploy create-payment-stripe
```

### 3️⃣ Configurar Variáveis

Via Dashboard: Settings → Functions → Environment variables

Ou via CLI:
```bash
supabase secrets set ASAAS_API_KEY=valor
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=valor
supabase secrets set STRIPE_SECRET_KEY=sk_test_value
```

### 4️⃣ Testar

```bash
curl -X POST http://localhost:54321/functions/v1/create-payment-asaas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{
    "tenantId": "test",
    "chargeId": "charge-001",
    "amount": 100.00,
    "description": "Teste",
    "dueDate": "2026-04-30",
    "paymentMethods": ["pix", "boleto"],
    "customerEmail": "cliente@example.com"
  }'
```

---

## 🔧 Estrutura & Compatibilidade

### Cada Edge Function Implementa

✅ **Tipagem Consistente**
- Entrada: `CreatePaymentRequest` (igual em todas as 3)
- Saída: `PaymentResponse` (padrão unificado)

✅ **Segurança**
- Validação de entrada obrigatória
- Token Bearer obrigatório
- API Keys via variáveis de ambiente (nunca hardcoded)
- Tratamento estruturado de erros

✅ **Integração**
- Chama API real do gateway
- Mapeia resposta para formato padronizado
- Webhook-ready (URL passada na requisição)

### Resposta Padronizada

```typescript
{
  external_id: string;        // ID no gateway
  status: string;             // pending, paid, failed, cancelled
  payment_link: string;       // URL para cliente pagar
  payment_method: string;     // "multiple" geralmente
  amount: number;             // Valor em reais
  due_date: string;           // ISO 8601
  provider: string;           // "asaas", "mercadopago", "stripe"
  pix_qr_code?: string;       // Campos opcionais
  pix_copy_paste?: string;    // por gateway
  boleto_barcode?: string;
  boleto_url?: string;
  created_at: string;         // ISO 8601 timestamp
}
```

---

## 🔌 Integração com Frontend

As Edge Functions são chamadas automaticamente pelos providers:

```typescript
// src/services/payments/providers/asaasProvider.ts
const response = await supabase.functions.invoke('create-payment-asaas', {
  body: {
    tenantId: tenant.id,
    chargeId: charge.id,
    amount: charge.amount,
    description: charge.description,
    dueDate: charge.dueDate,
    paymentMethods: ['pix', 'boleto'],
    customerEmail: charge.customer.email,
  },
  headers: { Authorization: `Bearer ${session.access_token}` }
});

// response.data é a PaymentResponse padronizada
window.location.href = response.data.payment_link;
```

**Nenhuma mudança necessária no frontend** - está tudo integrado!

---

## 📊 Mapeamento de Gateways

| Gateway | Status | Edge Function | Provider | Webhook |
|---------|--------|---------------|----------|---------|
| Asaas | ✅ Pronto | create-payment-asaas | AsaasProvider | Configurar em app.asaas.com |
| Mercado Pago | ✅ Pronto | create-payment-mercadopago | MercadoPagoProvider | Configurar em mercadopago.com |
| Stripe | ✅ Pronto | create-payment-stripe | StripeProvider | Configurar em stripe.com |
| Manual Link | ✅ Pronto | N/A (local) | ManualProvider | N/A |

---

## 🧪 Testes

### Teste Rápido

```bash
# 1. Substituir variáveis
FUNCTION_URL="https://seu-projeto.supabase.co/functions/v1/create-payment-asaas"
ANON_KEY="your_anon_key"

# 2. Enviar requisição
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "tenantId": "teste123",
    "chargeId": "charge-001",
    "amount": 150,
    "description": "Teste",
    "dueDate": "2026-05-15",
    "paymentMethods": ["pix"],
    "customerEmail": "teste@exemplo.com"
  }'

# 3. Validar resposta
# - Status HTTP: 200
# - external_id não nulo
# - payment_link contém URL válida
# - provider contém "asaas"
```

### Teste E2E no Frontend

1. Abra ChargePage
2. Clique "Criar Cobrança"
3. Selecione Asaas/Mercado Pago/Stripe
4. Preencha dados
5. Clique "Criar"
6. Validar:
   - [ ] Redirecionado para página de pagamento
   - [ ] Cobrança aparece com status PENDING
   - [ ] Badge mostra gateway correto

---

## 🔐 Variáveis de Ambiente

### Asaas
```env
ASAAS_API_KEY=sua_chave_de_api_asaas
ASAAS_USE_SANDBOX=true  # false em produção
```
Obter em: https://app.asaas.com → Configurações → Tokens de acesso

### Mercado Pago
```env
MERCADOPAGO_ACCESS_TOKEN=seu_access_token_mercadopago
MERCADOPAGO_USE_SANDBOX=true  # false em produção
```
Obter em: https://www.mercadopago.com/developers → Suas Integrações

### Stripe
```env
STRIPE_SECRET_KEY=sk_test_xxx  # sk_live_xxx em produção
```
Obter em: https://dashboard.stripe.com → Developers → API Keys

---

## 🚨 Tratamento de Erros

### Erro 401: Token Inválido
```
Solução: Verificar header "Authorization: Bearer token"
```

### Erro 500: "API Key not configured"
```
Solução: 
1. Settar variável de ambiente
2. Redeploy a função
3. supabase secrets list (verificar)
```

### Erro 400: Validação falhou
```
Solução: Verificar que todos os campos obrigatórios estão presente
- tenantId, chargeId, amount, description, dueDate, paymentMethods, customerEmail
```

Ver mais no arquivo `EDGE_FUNCTIONS_COMPLETE_V2.md` seção Troubleshooting.

---

## 📈 Fluxo Completo (Visão Geral)

```
1. Frontend cria cobrança
   ↓
2. getChargeProvider() retorna provider correto
   ↓
3. Provider chama supabase.functions.invoke('create-payment-{gateway}')
   ↓
4. Edge Function valida entrada
   ↓
5. Edge Function chama API do gateway
   ↓
6. Gateway retorna dados de pagamento
   ↓
7. Edge Function mapeia para PaymentResponse padronizada
   ↓
8. Provider retorna CreatePaymentResult
   ↓
9. Frontend redireciona para payment_link
   ↓
10. Cliente paga via gateway
    ↓
11. Gateway dispara webhook
    ↓
12. webhookService.process{Gateway}Webhook() atualiza status
    ↓
13. chargeService.markAsPaidFromWebhook() marca como pago
    ↓
14. Dashboard atualiza com status PAID
```

---

## ✅ Checklist Pré-Deploy

- [ ] Todos os 3 arquivos `.ts` estão criados em `supabase/functions/`
- [ ] `npm run build` passa sem erros
- [ ] `src/services/payments/providers/` importam as funções corretamente
- [ ] `getPaymentProvider.ts` tem os 3 gateways no switch
- [ ] `webhookService.ts` tem processos para os 3 gateways

---

## ✅ Checklist Pós-Deploy

- [ ] `supabase functions list` mostra as 3 funções
- [ ] Variáveis de ambiente setadas em Supabase Dashboard
- [ ] Teste de autenticação (401 sem token) passa
- [ ] Teste Asaas retorna external_id "pay_..."
- [ ] Teste Mercado Pago retorna init_point com URL
- [ ] Teste Stripe retorna payment_link com stripe.com
- [ ] Frontend consegue criar cobrança
- [ ] Redirecionamento para payment_link funciona

---

## 📚 Documentação Detalhada

### Para Setup & Deploy
→ **EDGE_FUNCTIONS_COMPLETE_V2.md**
- Pré-requisitos instalação
- Deploy local vs produção
- Configuração de variáveis
- Testes com curl

### Para Entender Arquitetura
→ **EDGE_FUNCTIONS_ARCHITECTURE.md**
- Fluxo de dados detalhado
- Tipagem e validação
- Integração com providers
- Fluxo completo de transação

### Para Validação & Troubleshooting
→ **EDGE_FUNCTIONS_VALIDATION_CHECKLIST.md**
- Checklist de validação
- Teste passo-a-passo
- Troubleshooting comum
- Checklist final completo

---

## 🎯 Próximas Fases

### Phase 2: Webhook Completo
- [ ] Criar Edge Function para `/api/webhooks/payments/{gateway}`
- [ ] Implementar validação HMAC
- [ ] Testar webhooks de produção

### Phase 3: Automação Pós-Pagamento
- [ ] Dispara sequência de automação quando status = PAID
- [ ] Envia notificações (email, WhatsApp)
- [ ] Integra com workflow de follow-up

### Phase 4: Analytics & Reporting
- [ ] Dashboard de transações
- [ ] Relatórios por gateway
- [ ] Alertas de falha

---

## 📞 Obter Suporte

1. **Verificar logs**: `supabase functions logs create-payment-asaas`
2. **Validar variáveis**: `supabase secrets list`
3. **Testar manualmente**: curl commands nos docs
4. **Ver docs oficiais**:
   - Asaas: https://docs.asaas.com
   - Mercado Pago: https://www.mercadopago.com.br/developers
   - Stripe: https://stripe.com/docs
   - Supabase: https://supabase.com/docs

---

## 📋 Status Geral

| Componente | Status | Integrado | Testado |
|-----------|--------|-----------|---------|
| create-payment-asaas | ✅ | ✅ | Manual |
| create-payment-mercadopago | ✅ | ✅ | Manual |
| create-payment-stripe | ✅ | ✅ | Manual |
| Padrão de Resposta | ✅ | ✅ | ✅ |
| Validação de Entrada | ✅ | ✅ | ✅ |
| Error Handling | ✅ | ✅ | ✅ |
| Integração Providers | ✅ | ✅ | ✅ |
| Integração Webhooks | ✅ Estrutura | ✅ | Pendente |
| Documentação | ✅ | ✅ | ✅ |

---

## 🏆 Resumo

✅ **3 Edge Functions completas**
- Código pronto para produção
- TypeScript com tipos corretos
- Validação de entrada robusta
- Tratamento de erro estruturado

✅ **100% Integradas**
- Providers podem invocar diretamente
- Padrão de resposta unificado
- Compatível com webhooks

✅ **Documentação Completa**
- Guia de deploy (local + produção)
- Arquitetura detalhada
- Checklist de validação
- Exemplos de teste

✅ **Pronto para Usar**
- Basta settar variáveis de ambiente
- Deploy em 1 comando
- Teste em 5 minutos

---

**Versão**: 1.0  
**Data**: 27 March 2026  
**Status**: 🟢 Pronto para Production  
**Suporte**: Consulte as documentações acima ou veja EDGE_FUNCTIONS_COMPLETE_V2.md
