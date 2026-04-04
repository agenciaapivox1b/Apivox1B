# Edge Functions - Guia Completo de Deploy e Configuração

Esta é a documentação completa para deploying as 3 Edge Functions que fazem o backend da integração multi-gateway da APIVOX.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Deploy Local (Desenvolvimento)](#deploy-local-desenvolvimento)
3. [Deploy Produção (Supabase)](#deploy-produção-supabase)
4. [Configuração de Variáveis de Ambiente](#configuração-de-variáveis-de-ambiente)
5. [Testes Locais](#testes-locais)
6. [Testes em Produção](#testes-em-produção)
7. [Validação Final](#validação-final)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Pré-requisitos

### Sistema
- Node.js 18+ (para usar Supabase CLI)
- Deno 1.40+ (se testar localmente com `deno run`)
- Git configurado

### Accounts
- Supabase CLI instalado: `npm install -g supabase`
- Acesso a projeto Supabase
- Chaves de API de cada gateway:
  - **Asaas**: API Key (obter em https://dashboard.asaas.com)
  - **Mercado Pago**: Access Token (obter em https://www.mercadopago.com/developers)
  - **Stripe**: Secret Key (obter em https://dashboard.stripe.com)

### Verificar Instalaçãoholdingsativamente
```bash
# Verificar Supabase CLI
supabase --version

# Verificar Deno
deno --version

# Verificar Node
node --version
```

Se não tiver Supabase CLI:
```bash
npm install -g supabase
```

---

## 🚀 Deploy Local (Desenvolvimento)

### Passo 1: Inicializar Supabase Local

```bash
cd c:\Users\mrmar\OneDrive\Desktop\Apivox\ai-agent-hub-81

# Login no Supabase
supabase login

# Inicializar projeto (se ainda não fez)
supabase init

# Iniciar serviços locais (Docker precisa estar rodando)
supabase start
```

### Passo 2: Servir Edge Functions Localmente

#### Para testar Asaas:
```bash
# Terminal 1: Serve a função localmente
supabase functions serve create-payment-asaas \
  --env-file .env.local \
  --import-map supabase/functions/import_map.json

# A função estará em: http://localhost:54321/functions/v1/create-payment-asaas
```

#### Para testar Mercado Pago:
```bash
# Terminal 2: Em paralelo
supabase functions serve create-payment-mercadopago \
  --env-file .env.local \
  --import-map supabase/functions/import_map.json

# A função estará em: http://localhost:54321/functions/v1/create-payment-mercadopago
```

#### Para testar Stripe:
```bash
# Terminal 3: Em paralelo
supabase functions serve create-payment-stripe \
  --env-file .env.local \
  --import-map supabase/functions/import_map.json

# A função estará em: http://localhost:54321/functions/v1/create-payment-stripe
```

### Passo 3: Criar .env.local para Testes

Criar arquivo `.env.local` na raiz do projeto:

```bash
# Asaas
ASAAS_API_KEY=sua_chave_asaas_aqui
ASAAS_USE_SANDBOX=true

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=seu_access_token_mercadopago
MERCADOPAGO_USE_SANDBOX=true

# Stripe
STRIPE_SECRET_KEY=sk_test_sua_chave_stripe_test_aqui

# Encryption (se tiver)
ENCRYPTION_MASTER_KEY=sua_chave_criptografia
```

---

## 🌍 Deploy Produção (Supabase)

### Passo 1: Connect a Projeto Remoto

```bash
cd c:\Users\mrmar\OneDrive\Desktop\Apivox\ai-agent-hub-81

# Listar projetos disponíveis
supabase projects list

# Vincular ao seu projeto (se não estiver já)
supabase link --project-ref seu_project_id
```

### Passo 2: Deploy as Funções

```bash
# Deploy Asaas
supabase functions deploy create-payment-asaas

# Deploy Mercado Pago
supabase functions deploy create-payment-mercadopago

# Deploy Stripe
supabase functions deploy create-payment-stripe
```

Output esperado:
```
✓ Deployed function create-payment-asaas
✓ URL: https://seu-project.supabase.co/functions/v1/create-payment-asaas

✓ Deployed function create-payment-mercadopago
✓ URL: https://seu-project.supabase.co/functions/v1/create-payment-mercadopago

✓ Deployed function create-payment-stripe
✓ URL: https://seu-project.supabase.co/functions/v1/create-payment-stripe
```

### Passo 3: Verificar Deploy

```bash
# Listar funções deployed
supabase functions list

# Ver logs de uma função
supabase functions logs create-payment-asaas
```

---

## 🔐 Configuração de Variáveis de Ambiente

### No Supabase Dashboard

1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá para **Settings → Edge Functions**
4. Clique em **Environment variables** ou acesse diretamente cada função

#### Para cada função:

**create-payment-asaas:**
- `ASAAS_API_KEY`: Sua chave de API do Asaas
- `ASAAS_USE_SANDBOX`: `true` (desenvolvimento) ou `false` (produção)

**create-payment-mercadopago:**
- `MERCADOPAGO_ACCESS_TOKEN`: Seu access token do Mercado Pago
- `MERCADOPAGO_USE_SANDBOX`: `true` (desenvolvimento) ou `false` (produção)

**create-payment-stripe:**
- `STRIPE_SECRET_KEY`: Sua secret key do Stripe (começa com `sk_test_` ou `sk_live_`)

### Via CLI

Alternativa de linha de comando:

```bash
# Asaas
supabase secrets set ASAAS_API_KEY=sua_chave --project-ref seu_project_id

# Mercado Pago
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=seu_token --project-ref seu_project_id

# Stripe
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx --project-ref seu_project_id
```

---

## 🧪 Testes Locais

### Setup para Testes

```bash
# 1. Ter Supabase rodando localmente
supabase start

# 2. Em outro terminal, servir as funções
supabase functions serve create-payment-asaas --env-file .env.local
```

### Teste 1: Criar Cobrança Asaas

```bash
curl -X POST http://localhost:54321/functions/v1/create-payment-asaas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "tenantId": "tenant123",
    "chargeId": "charge-asaas-001",
    "amount": 150.00,
    "description": "Serviço de consultoria",
    "dueDate": "2026-04-15",
    "paymentMethods": ["pix", "boleto"],
    "customerEmail": "cliente@example.com",
    "customerName": "João Silva",
    "customerDocument": "12345678910"
  }'
```

**Resposta esperada (sucesso):**
```json
{
  "external_id": "pay_123456789",
  "status": "pending",
  "payment_link": "https://asaas.com/p/pay_123456789",
  "payment_method": "multiple",
  "amount": 150,
  "due_date": "2026-04-15",
  "provider": "asaas",
  "pix_qr_code": "00020126580... [QR code em base64]",
  "pix_copy_paste": "000201265...",
  "boleto_url": "https://asaas.com/p/pay_123456789",
  "created_at": "2026-03-27T10:30:00.000Z"
}
```

### Teste 2: Criar Cobrança Mercado Pago

```bash
curl -X POST http://localhost:54321/functions/v1/create-payment-mercadopago \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "tenantId": "tenant123",
    "chargeId": "charge-mp-001",
    "amount": 200.00,
    "description": "Licença anual APIVOX",
    "dueDate": "2026-04-20",
    "paymentMethods": ["pix", "creditCard"],
    "customerEmail": "cliente@example.com",
    "customerName": "Maria Santos"
  }'
```

**Resposta esperada (sucesso):**
```json
{
  "external_id": "987654321",
  "status": "pending",
  "payment_link": "https://www.mercadopago.com.br/checkout/v1/xxx",
  "payment_method": "multiple",
  "amount": 200,
  "due_date": "2026-04-27",
  "provider": "mercadopago",
  "created_at": "2026-03-27T10:35:00.000Z"
}
```

### Teste 3: Criar Cobrança Stripe

```bash
curl -X POST http://localhost:54321/functions/v1/create-payment-stripe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "tenantId": "tenant123",
    "chargeId": "charge-stripe-001",
    "amount": 300.00,
    "description": "Plano Premium 1 ano",
    "dueDate": "2026-05-15",
    "paymentMethods": ["creditCard", "boleto"],
    "customerEmail": "cliente@example.com",
    "customerName": "Carlos Mendes"
  }'
```

**Resposta esperada (sucesso):**
```json
{
  "external_id": "cs_test_b1234567890",
  "status": "unpaid",
  "payment_link": "https://checkout.stripe.com/pay/cs_test_b123...",
  "payment_method": "multiple",
  "amount": 300,
  "due_date": "2026-03-28",
  "provider": "stripe",
  "created_at": "2026-03-27T10:40:00.000Z"
}
```

---

## ✅ Testes em Produção

### Passo 1: Testar no Supabase Deployment

```bash
# Obter a URL da função (exemplo)
FUNCTION_URL="https://seu-project.supabase.co/functions/v1/create-payment-asaas"

# Teste 1: Asaas em produção
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "tenantId": "prod-tenant-001",
    "chargeId": "prod-charge-001",
    "amount": 500.00,
    "description": "Cobrança Real - Teste de Produção",
    "dueDate": "2026-04-30",
    "paymentMethods": ["pix"],
    "customerEmail": "teste@apivox.com"
  }'
```

### Passo 2: Validar Resposta Padronizada

Verificar que a resposta contém TODOS esses campos:
- ✅ `external_id` (ID no gateway)
- ✅ `status` (pending, paid, failed)
- ✅ `payment_link` (URL para pagar)
- ✅ `provider` (asaas, mercadopago, stripe)
- ✅ `amount` (valor em reais)
- ✅ `due_date` (data de vencimento)
- ✅ `created_at` (ISO 8601 timestamp)

### Passo 3: Testar Integração com Frontend

No seu código React/Frontend:

```typescript
// No chargeService.tsx ou similar, as Edge Functions são chamadas assim:

const response = await supabase.functions.invoke('create-payment-asaas', {
  body: {
    tenantId: currentTenant.id,
    chargeId: charge.id,
    amount: charge.amount,
    description: charge.description,
    dueDate: charge.dueDate,
    paymentMethods: ['pix', 'boleto'],
    customerEmail: charge.customer.email,
    customerName: charge.customer.name,
  },
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
});

if (response.error) {
  console.error('Erro ao criar pagamento:', response.error);
} else {
  console.log('Pagamento criado:', response.data);
  // Redirecionar para payment_link
  window.location.href = response.data.payment_link;
}
```

---

## 🔍 Validação Final

### Checklist de Validação

Execute este checklist completo:

- [ ] **Asaas**
  - [ ] `supabase functions list` mostra `create-payment-asaas`
  - [ ] Teste local com curl retorna status 200
  - [ ] Campo `external_id` começa com `pay_` (formato Asaas)
  - [ ] `pix_qr_code` está preenchido
  - [ ] Webhook consegue alcançar seu endpoint

- [ ] **Mercado Pago**
  - [ ] `supabase functions list` mostra `create-payment-mercadopago`
  - [ ] Teste local retorna status 200
  - [ ] `payment_link` contém `mercadopago.com.br`
  - [ ] Campo `external_id` é um número (ID do checkout)
  - [ ] Webhook consegue alcançar seu endpoint

- [ ] **Stripe**
  - [ ] `supabase functions list` mostra `create-payment-stripe`
  - [ ] Teste local retorna status 200
  - [ ] `payment_link` contém `stripe.com/pay`
  - [ ] `external_id` começa com `cs_` (checkout session)
  - [ ] Webhook consegue alcançar seu endpoint

### Validar Erro Handling

Testar com dados inválidos:

```bash
# Teste: tenantId faltando
curl -X POST http://localhost:54321/functions/v1/create-payment-asaas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "chargeId": "charge-001",
    "amount": 100
  }'

# Resposta esperada:
# {"error": "tenantId é obrigatório"}
```

```bash
# Teste: amount inválido
curl -X POST http://localhost:54321/functions/v1/create-payment-asaas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "tenantId": "tenant123",
    "chargeId": "charge-001",
    "amount": -50
  }'

# Resposta esperada:
# {"error": "amount deve ser maior que 0"}
```

---

## 🌐 Endpoints para Configureqruação de Webhooks

Após testar e validar as Edge Functions, você precisa configurar os endpoints de webhook em cada gateway.

### Asaas

1. Acesse https://app.asaas.com/webhooks
2. Clique em "Adicionar novo webhook"
3. Configure:
   - **URL**: `https://seu-projeto.supabase.co/functions/v1/webhooks/asaas`
   - **Eventos**: Selecione `CHARGE.*` (ou específicos como CHARGE-PAID, CHARGE-OVERDUE)
   - **Ativo**: Marcado
4. Salve e teste a conexão

### Mercado Pago

1. Acesse https://www.mercadopago.com/developers/panel
2. Vá para **Aplicações → Sua Aplicação → Configurações**
3. Seção "Notificações":
   - **URL IPN**: `https://seu-projeto.supabase.co/functions/v1/webhooks/mercadopago`
   - **URL de Webhook**: `https://seu-projeto.supabase.co/functions/v1/webhooks/mercadopago`
4. Selecione eventos: payment.created, payment.updated
5. Salve

### Stripe

1. Acesse https://dashboard.stripe.com/webhooks
2. Clique em "+ Add endpoint"
3. Configure:
   - **URL**: `https://seu-projeto.supabase.co/functions/v1/webhooks/stripe`
   - **Eventos**:
     - charge.succeeded
     - charge.failed
     - payment_intent.succeeded
     - payment_intent.payment_failed
     - invoice.paid
4. Clique em "Add endpoint"
5. Copie a chave secreta (Signing secret) e adicione a `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

---

## 🐛 Troubleshooting

### Problema: "CORS error" ao chamar função

**Solução**:
As Edge Functions do Supabase têm CORS habilitado por padrão. Se receber erro:
1. Verifique o header `Authorization` está no formato `Bearer token`
2. Teste via curl primeiro (sem CORS):
   ```bash
   curl -X POST https://seu-projeto.supabase.co/functions/v1/create-payment-asaas \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test" \
     -d '{...}'
   ```

### Problema: "API Key not found" ao chamar gateway

**Solução**:
1. Verificar se as variáveis de ambiente foram setadas:
   ```bash
   supabase secrets list
   ```
2. Se não aparecer, setá-las novamente:
   ```bash
   supabase secrets set ASAAS_API_KEY=valor
   ```
3. Redeploy a função:
   ```bash
   supabase functions deploy create-payment-asaas
   ```

### Problema: Função retorna "500 Internal Server Error"

**Solução**:
1. Ver logs:
   ```bash
   supabase functions logs create-payment-asaas
   ```
2. Procure por mensagens de erro
3. Causas comuns:
   - API Key expirada ou inválida
   - Gateway retornando erro (verificar status do gateway)
   - Dados de entrada malformados

### Problema: Webhook não recebe evento

**Solução**:
1. Verificar se a URL do webhook está correta (sem typo)
2. Verificar se a função `/webhooks/{gateway}` está deployed (criar se necessário)
3. Testar webhook manualmente no dashboard do gateway
4. Verificar logs de webhook no gateway

---

## 📊 Resumo Final

| Componente | Local | Produção | Status |
|-----------|-------|----------|--------|
| create-payment-asaas | ✅ | ✅ | Pronto |
| create-payment-mercadopago | ✅ | ✅ | Pronto |
| create-payment-stripe | ✅ | ✅ | Pronto |
| Variáveis de Ambiente | Manual | Dashboard | Configurar |
| Webhooks | Local | Prod | Configurar no Gateway |
| Testes E2E | Em Progresso | Quando pronto | Validar |

---

## 🎯 Próximos Passos

1. ✅ **FEITO**: Crear as 3 Edge Functions
2. **TODO**: Deployer para Supabase
3. **TODO**: Configurar variáveis de ambiente
4. **TODO**: Testar cada função isoladamente
5. **TODO**: Testar integrações com webhooks
6. **TODO**: Testar fluxo completo (criação → webhook → atualização de status)
7. **TODO**: Configurar endpoints de webhook nos gateways

---

## 📞 Suporte

Se encontrar problemas:

1. Verificar os logs:
   ```bash
   supabase functions logs create-payment-asaas
   ```

2. Testée o error handling das funções (ver testes acima)

3. Validar que as variáveis de ambiente estão setadas:
   ```bash
   supabase secrets list
   ```

4. Redirar para documentações oficiais:
   - Asaas: https://docs.asaas.com
   - Mercado Pago: https://www.mercadopago.com.br/developers
   - Stripe: https://stripe.com/docs

---

## 📝 Versionamento

- **Edge Functions Version**: 1.0.0
- **Last Updated**: 27 March 2026
- **Compatible with**: APIVOX Multi-Gateway v1.0+
