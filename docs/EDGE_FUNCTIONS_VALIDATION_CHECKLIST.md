# ✅ Edge Functions - Checklist de Validação e Deploy

Este é o checklist passo-a-passo para validar e deployer as 3 Edge Functions para produção.

---

## 📋 Pré-Deploy (Local)

### ✓ Verificação de Arquivos

- [ ] `supabase/functions/create-payment-asaas/deno.json` existe
- [ ] `supabase/functions/create-payment-asaas/index.ts` existe
- [ ] `supabase/functions/create-payment-mercadopago/deno.json` existe
- [ ] `supabase/functions/create-payment-mercadopago/index.ts` existe
- [ ] `supabase/functions/create-payment-stripe/deno.json` existe
- [ ] `supabase/functions/create-payment-stripe/index.ts` existe

### ✓ Verificação de Integração (Frontend)

- [ ] `src/services/payments/getPaymentProvider.ts` importa `MercadoPagoProvider` e `StripeProvider`
- [ ] `src/services/payments/providers/asaasProvider.ts` chama `supabase.functions.invoke('create-payment-asaas')`
- [ ] `src/services/payments/providers/mercadopagoProvider.ts` chama `supabase.functions.invoke('create-payment-mercadopago')`
- [ ] `src/services/payments/providers/stripeProvider.ts` chama `supabase.functions.invoke('create-payment-stripe')`
- [ ] `src/services/chargeService.ts` importa os providers
- [ ] Build sem erros: `npm run build`

### ✓ Validação de Tipos

```bash
# Na raiz do projeto
npm run build

# Deve retornar: ✓ built in X.XXs
# Sem erros de TypeScript
```

---

## 🚀 Deploy (Produção)

### Passo 1: Autenticação Supabase

```bash
# Login no Supabase
supabase login

# Você será redirecionado para o navegador
# Faça login com sua conta Supabase
```

### Passo 2: Verificar Projeto Vinculado

```bash
# Listar projetos
supabase projects list

# Você deve ver seu projeto APIVOX na lista
# Procure o project_ref (algo como: abcdefghijklmnop)
```

### Passo 3: Fazer Link (se necessário)

```bash
# Se o projeto não estiver vinculado
supabase link --project-ref seu_project_ref

# Confirmará a vinculação:
# ✓ Linked to remote project: seu_project_ref
```

### Passo 4: Deploy das Funções

```bash
# Deploy Asaas
supabase functions deploy create-payment-asaas

# Aguarde:
# ✓ Deployed function create-payment-asaas
# ✓ URL: https://seu-projeto.supabase.co/functions/v1/create-payment-asaas

# ---

# Deploy Mercado Pago
supabase functions deploy create-payment-mercadopago

# Aguarde:
# ✓ Deployed function create-payment-mercadopago
# ✓ URL: https://seu-projeto.supabase.co/functions/v1/create-payment-mercadopago

# ---

# Deploy Stripe
supabase functions deploy create-payment-stripe

# Aguarde:
# ✓ Deployed function create-payment-stripe
# ✓ URL: https://seu-projeto.supabase.co/functions/v1/create-payment-stripe
```

### Passo 5: Verificar Deploy

```bash
# Listar funções deployed
supabase functions list

# Resultado esperado:
# Deployments for project seu_project_ref
# create-payment-asaas | https://seu-projeto.supabase.co/functions/v1/create-payment-asaas
# create-payment-mercadopago | https://seu-projeto.supabase.co/functions/v1/create-payment-mercadopago
# create-payment-stripe | https://seu-projeto.supabase.co/functions/v1/create-payment-stripe
```

---

## 🔐 Configurar Variáveis de Ambiente

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá para **Settings → Functions → Environment variables**
4. Adicione cada variável:

   **Para create-payment-asaas:**
   - Nome: `ASAAS_API_KEY`
   - Valor: Sua chave de API do Asaas (obter em https://app.asaas.com)
   - Clique "Add"
   
   - Nome: `ASAAS_USE_SANDBOX`
   - Valor: `true` (dev) ou `false` (produção)
   - Clique "Add"

   **Para create-payment-mercadopago:**
   - Nome: `MERCADOPAGO_ACCESS_TOKEN`
   - Valor: Seu access token MP (obter em https://www.mercadopago.com/developers")
   - Clique "Add"
   
   - Nome: `MERCADOPAGO_USE_SANDBOX`
   - Valor: `true` (dev) ou `false` (produção)
   - Clique "Add"

   **Para create-payment-stripe:**
   - Nome: `STRIPE_SECRET_KEY`
   - Valor: `sk_test_...` (desenvolvimento) ou `sk_live_...` (produção)
   - Clique "Add"

### Opção 2: Via CLI

```bash
# Asaas
supabase secrets set ASAAS_API_KEY=<sua_chave_asaas> --project-ref seu_project_ref
supabase secrets set ASAAS_USE_SANDBOX=true --project-ref seu_project_ref

# Mercado Pago
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=<seu_token_mp> --project-ref seu_project_ref
supabase secrets set MERCADOPAGO_USE_SANDBOX=true --project-ref seu_project_ref

# Stripe
supabase secrets set STRIPE_SECRET_KEY=sk_test_<sua_chave> --project-ref seu_project_ref

# Verificar
supabase secrets list --project-ref seu_project_ref
```

### Verificar Variáveis

```bash
supabase secrets list

# Resultado esperado:
# ASAAS_API_KEY | (visible) = false
# ASAAS_USE_SANDBOX | (visible) = false
# MERCADOPAGO_ACCESS_TOKEN | (visible) = false
# MERCADOPAGO_USE_SANDBOX | (visible) = false
# STRIPE_SECRET_KEY | (visible) = false
```

---

## 🧪 Testes Pós-Deploy

### Teste 1: Validar Endpoint Armazenel

```bash
# Função URL (substituir seu_projeto com seu projeto real)
FUNCTION_URL="https://seu-projeto.supabase.co/functions/v1/create-payment-asaas"

# Teste básico (sem autenticação, deve falhar com 401)
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "test"}'

# Esperado: {"error": "Token de autorização inválido"}
```

### Teste 2: Teste Asaas com Sandbox

```bash
FUNCTION_URL="https://seu-projeto.supabase.co/functions/v1/create-payment-asaas"
TOKEN="your_supabase_anon_key_here"

curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tenantId": "teste123",
    "chargeId": "charge-asaas-100",
    "amount": 50.00,
    "description": "Teste de Cobrança Asaas",
    "dueDate": "2026-05-15",
    "paymentMethods": ["pix", "boleto"],
    "customerEmail": "teste@apivox.com",
    "customerName": "Teste User"
  }'

# Esperado: Status 200 com PaymentResponse
# {
#   "external_id": "pay_...",
#   "status": "pending",
#   "payment_link": "https://...",
#   ...
# }
```

### Teste 3: Teste Mercado Pago com Sandbox

```bash
FUNCTION_URL="https://seu-projeto.supabase.co/functions/v1/create-payment-mercadopago"
TOKEN="your_supabase_anon_key_here"

curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tenantId": "teste123",
    "chargeId": "charge-mp-200",
    "amount": 75.00,
    "description": "Teste de Cobrança Mercado Pago",
    "dueDate": "2026-05-20",
    "paymentMethods": ["pix", "creditCard"],
    "customerEmail": "teste@apivox.com",
    "customerName": "MP Test User"
  }'

# Esperado: Status 200 com PaymentResponse
```

### Teste 4: Teste Stripe com Sandbox

```bash
FUNCTION_URL="https://seu-projeto.supabase.co/functions/v1/create-payment-stripe"
TOKEN="your_supabase_anon_key_here"

curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tenantId": "teste123",
    "chargeId": "charge-stripe-300",
    "amount": 100.00,
    "description": "Teste de Cobrança Stripe",
    "dueDate": "2026-05-25",
    "paymentMethods": ["creditCard", "boleto"],
    "customerEmail": "teste@apivox.com",
    "customerName": "Stripe Test User"
  }'

# Esperado: Status 200 com PaymentResponse
```

### Teste 5: Validação da Resposta Padronizada

Para cada teste acima, validar que a resposta contém:

```json
{
  "external_id": "string",     // ✓ Deve estar preenchido
  "status": "string",          // ✓ pending, paid, failed, etc
  "payment_link": "string",    // ✓ URL para cliente pagar
  "payment_method": "string",  // ✓ "multiple" normalmente
  "amount": "number",          // ✓ Valor da cobrança
  "due_date": "string",        // ✓ Data ISO 8601
  "provider": "string",        // ✓ asaas, mercadopago, stripe
  "created_at": "string"       // ✓ Timestamp ISO 8601
}
```

Checklist:
- [ ] external_id não é nulo
- [ ] Status é válido (pending, paid, failed, etc)
- [ ] payment_link é uma URL válida
- [ ] amount é número positivo
- [ ] due_date está em formato ISO
- [ ] provider corresponde à função chamada
- [ ] created_at é timestamp válido

---

## 🔍 Validação End-to-End

### Teste no Frontend

1. **Abra a aplicação web dela APIVOX**
   ```bash
   npm run dev
   ```

2. **Navegue até ChargePage**

3. **Clique em "Criar Cobrança"** e:
   - Selecione **Gateway: Asaas** (ou outro)
   - Preencha os dados:
     - Valor: 100.00
     - Descrição: "Teste E2E"
     - Data de Vencimento: próxima semana
     - Cliente: seu email
   - Clique "Criar"

4. **Validar que:**
   - [ ] Redirecionado para página de pagamento do gateway
   - [ ] URL contém link único de pagamento
   - [ ] Na ChargePage, cobrança aparece com status PENDING
   - [ ] Badge mostra gateway correto (Asaas/MP/Stripe)

### Teste de Sincronização

```typescript
// No console do navegador (F12)
// Verificar que o provider chamou a Edge Function corretamente

// Você deve ver no Network:
// POST https://seu-projeto.supabase.co/functions/v1/create-payment-asaas
// Status: 200
// Response: { external_id, status, payment_link, ... }
```

---

## 🚨 Troubleshooting

### Erro: "401 Unauthorized"

**Causa**: Token Bearer faltando ou inválido

**Solução**:
1. Certificar que a chamada tem header `Authorization: Bearer token`
2. Token deve ser seu Supabase Anon Key (de Settings → API Keys)
3. Teste manualmente:
   ```bash
   curl -H "Authorization: Bearer seu_anon_key" ...
   ```

### Erro: "API Key not configured"

**Causa**: Variáveis de ambiente não setadas

**Solução**:
1. Ir para Supabase Dashboard → Settings → Functions
2. Verificar se as variáveis estão listadas:
   - ASAAS_API_KEY
   - MERCADOPAGO_ACCESS_TOKEN
   - STRIPE_SECRET_KEY
3. Se não estiverem, adicionar via Dashboard ou CLI
4. **Importante**: Redeploy a função após adicionar variável:
   ```bash
   supabase functions deploy create-payment-asaas
   ```

### Erro: "Invalid JSON in request body"

**Causa**: Dados enviados não são JSON válido

**Solução**:
1. Verificar que o JSON é válido (usar https://jsonlint.com)
2. Certificar que todos os campos obrigatórios estão presentes:
   - tenantId
   - chargeId
   - amount
   - description
   - dueDate
   - paymentMethods (array)
   - customerEmail

### Erro: "amount deve ser maior que 0"

**Causa**: Valor de cobrança é inválido

**Solução**:
1. Validar que `amount > 0`
2. Formato correto: número decimal (100.00, não "100.00")

### Webhook não recebe notificação

**Causa**: URL de webhook não foi configurada no gateway

**Solução**:
1. Ir para dashboard do gateway (Asaas/MP/Stripe)
2. Adicionar webhook endpoint:
   ```
   https://seu-dominio.com/api/webhooks/payments/{asaas|mercadopago|stripe}
   ```
3. Testar webhook manualmente no dashboard
4. Verificar se sua aplicação tem route para `/api/webhooks/payments/{gateway}`

---

## 📊 Checklist Final Completo

### Deploy
- [ ] `supabase functions deploy create-payment-asaas` com sucesso
- [ ] `supabase functions deploy create-payment-mercadopago` com sucesso
- [ ] `supabase functions deploy create-payment-stripe` com sucesso
- [ ] `supabase functions list` mostra as 3 funções

### Variáveis de Ambiente
- [ ] `ASAAS_API_KEY` setada
- [ ] `ASAAS_USE_SANDBOX` setada (true ou false)
- [ ] `MERCADOPAGO_ACCESS_TOKEN` setada
- [ ] `MERCADOPAGO_USE_SANDBOX` setada
- [ ] `STRIPE_SECRET_KEY` setada
- [ ] `supabase secrets list` mostra todas as variáveis

### Testes Locais
- [ ] Teste de autenticação 401 ✓
- [ ] Teste Asaas com dados válidos ✓
- [ ] Teste Mercado Pago com dados válidos ✓
- [ ] Teste Stripe com dados válidos ✓
- [ ] Cada resposta contém `external_id` ✓
- [ ] Cada resposta contém `payment_link` ✓
- [ ] Validação de erros de entrada funciona ✓

### Testes E2E
- [ ] Frontend consegue criar cobrança ✓
- [ ] Redirecionamento para payment_link funciona ✓
- [ ] ChargePage mostra cobrança com status correto ✓
- [ ] Badge de gateway aparece corretamente ✓

### Webhooks (Próxima Fase)
- [ ] Endpoint de webhook criado/testado
- [ ] Asaas webhooked configurado
- [ ] Mercado Pago webhook configurado
- [ ] Stripe webhook configurado
- [ ] Webhook consegue atualizar status de cobrança

---

## 📞 Próximos Passos

1. ✅ **FEITO**: Criar as 3 Edge Functions
2. ✅ **FEITO**: Deploy no Supabase
3. ✅ **FEITO**: Configurar variáveis de ambiente
4. ✅ **FEITO**: Testar isoladamente
5. **TODO**: Configurar webhooks nos gateways
6. **TODO**: Testar fluxo completo (pagamento → webhook → atualização)
7. **TODO**: Colocar em produção (mudar SANDBOX=false)

---

## 🎯 Notas Importantes

- **Não compartilhe suas API Keys/Access Tokens** - elas são sensíveis
- **Sempre use sandbox/test (SANDBOX=true, sk_test_)** antes de produção
- **Jeepre rastreie logs** se algo não funcionar:
  ```bash
  supabase functions logs create-payment-asaas --follow
  ```
- **Webhooks são críticos** - sem eles, status não atualiza automaticamente
- **Testate localmente primeiro** antes de colocar em produção

---

**Versão**: 1.0  
**Data**: 27 March 2026  
**Status**: Pronto para Deploy  
