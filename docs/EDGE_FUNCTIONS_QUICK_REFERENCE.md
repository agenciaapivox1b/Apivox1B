# 🚀 Edge Functions - Referência Rápida

Consulte rápido quando precisar. Para mais detalhes, veja os guias completos.

---

## 📍 URLs das Edge Functions

```
Local (Desenvolvimento):
  http://localhost:54321/functions/v1/create-payment-asaas
  http://localhost:54321/functions/v1/create-payment-mercadopago
  http://localhost:54321/functions/v1/create-payment-stripe

Produção:
  https://YOUR_PROJECT.supabase.co/functions/v1/create-payment-asaas
  https://YOUR_PROJECT.supabase.co/functions/v1/create-payment-mercadopago
  https://YOUR_PROJECT.supabase.co/functions/v1/create-payment-stripe
```

---

## 📤 Formato da Requisição

```bash
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "tenantId": "tenant-id-aqui",
    "chargeId": "charge-id-unico",
    "amount": 150.00,
    "description": "Descrição da cobrança",
    "dueDate": "2026-04-30",
    "paymentMethods": ["pix", "boleto"],
    "customerEmail": "cliente@exemplo.com",
    "customerName": "Nome Cliente",
    "customerDocument": "12345678901",
    "webhookUrl": "https://seu-dominio.com/api/webhooks/payments"
  }'
```

### Campos Obrigatórios
- `tenantId` - Seu ID de tenant
- `chargeId` - ID único da cobrança
- `amount` - Valor > 0
- `description` - Descrição clara
- `dueDate` - Data ISO 8601 (ex: 2026-04-30)
- `paymentMethods` - Array com ["pix"] ou ["boleto"] ou ["creditCard"] ou combinações
- `customerEmail` - Email válido com @

### Campos Opcionais
- `customerName` - Nome do cliente (padrão: "Cliente")
- `customerDocument` - CPF/CNPJ
- `webhookUrl` - Para receber notificações de pagamento

---

## 📥 Formato da Resposta

```json
{
  "external_id": "pay_ABC123DEF456",
  "status": "pending",
  "payment_link": "https://asaas.com/p/pay_ABC123DEF456",
  "payment_method": "multiple",
  "amount": 150.00,
  "due_date": "2026-04-30",
  "provider": "asaas",
  "pix_qr_code": "00020126580...[QR Code em base64]",
  "pix_copy_paste": "00020126...",
  "boleto_barcode": "2341234123412341234",
  "boleto_url": "https://asaas.com/p/pay_ABC123DEF456",
  "created_at": "2026-03-27T14:30:00.000Z"
}
```

**Campos Sempre Presentes**: external_id, status, payment_link, provider, amount, due_date, created_at  
**Campos Gateway-Específicos**: pix_qr_code, pix_copy_paste, boleto_barcode, boleto_url (podem ser undefined)

---

## 🔧 Deploy Rápido

```bash
# 1. Login
supabase login

# 2. Deploy (sem esperar, execute 3 vezes)
supabase functions deploy create-payment-asaas
supabase functions deploy create-payment-mercadopago
supabase functions deploy create-payment-stripe

# 3. Verificar
supabase functions list
```

---

## 🔐 Variáveis de Ambiente

### Asaas
```
ASAAS_API_KEY=cole-sua-chave-aqui
ASAAS_USE_SANDBOX=true  # false em produção
```
Obter em: https://app.asaas.com → Configurações → Tokens

### Mercado Pago
```
MERCADOPAGO_ACCESS_TOKEN=cole-seu-token-aqui
MERCADOPAGO_USE_SANDBOX=true  # false em produção
```
Obter em: https://www.mercadopago.com/developers → Integrações

### Stripe
```
STRIPE_SECRET_KEY=sk_test_cole-sua-chave-aqui
```
Obter em: https://dashboard.stripe.com → Develop → API Keys

### Settar em Supabase
```bash
# Opção 1: Dashboard (Settings → Functions → Environment variables)
# Opção 2: CLI
supabase secrets set ASAAS_API_KEY=valor
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=valor
supabase secrets set STRIPE_SECRET_KEY=valor

# Verificar
supabase secrets list
```

---

## 🧪 Testes Rápidos

### Teste 1: Verificar Autenticação
```bash
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Esperado: {"error": "Token de autorização inválido"}
```

### Teste 2: Verificar Validação
```bash
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"amount": -50}'

# Esperado: {"error": "amount deve ser maior que 0"}
```

### Teste 3: Criar Cobrança Real
```bash
FUNCTION_URL="https://seu-projeto.supabase.co/functions/v1/create-payment-asaas"
ANON_KEY="seu_anon_key_aqui"

curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "tenantId": "test",
    "chargeId": "charge-001",
    "amount": 100,
    "description": "Teste",
    "dueDate": "2026-05-15",
    "paymentMethods": ["pix"],
    "customerEmail": "teste@example.com"
  }'

# Esperado: Status 200 com external_id, payment_link, etc
```

---

## 🐛 Erros Comuns

| Erro | Solução |
|------|---------|
| 401 Unauthorized | Adicionar header `Authorization: Bearer token` |
| ASAAS_API_KEY not configured | Settar variável em Supabase Dashboard/CLI + redeploy |
| Invalid JSON | Validar JSON em https://jsonlint.com |
| amount deve ser maior que 0 | Enviar amount > 0 |
| customerEmail é obrigatório | Enviar email válido com @ |
| 500 Internal Server Error | Ver logs: `supabase functions logs create-payment-asaas` |

---

## 📊 Integração Frontend

Providers já chamam automaticamente:

```typescript
// src/services/payments/providers/asaasProvider.ts
const { data } = await supabase.functions.invoke('create-payment-asaas', {
  body: {...},
  headers: { Authorization: `Bearer ${token}` }
});

// data = { external_id, payment_link, ... }
window.location.href = data.payment_link;
```

**Nenhuma mudança necessária** - está tudo integrado!

---

## 🔗 Webhooks (Próxima Etapa)

Após pagamento, gateway faz POST para:
```
https://seu-dominio.com/api/webhooks/payments/asaas
https://seu-dominio.com/api/webhooks/payments/mercadopago
https://seu-dominio.com/api/webhooks/payments/stripe
```

A URL de webhook é passada na requisição via `webhookUrl` (opcional).

---

## 📚 Documentação Completa

| Documento | Para... |
|-----------|---------|
| `EDGE_FUNCTIONS_COMPLETE_V2.md` | Deploy completo + testes |
| `EDGE_FUNCTIONS_ARCHITECTURE.md` | Entender como funciona |
| `EDGE_FUNCTIONS_VALIDATION_CHECKLIST.md` | Validar passo-a-passo |
| `EDGE_FUNCTIONS_README.md` | Overview rápido |
| Este arquivo | Referência rápida |

---

## ✅ Checklist Deploy (3 min)

- [ ] `supabase login` executado
- [ ] `supabase functions deploy create-payment-asaas` ✓
- [ ] `supabase functions deploy create-payment-mercadopago` ✓
- [ ] `supabase functions deploy create-payment-stripe` ✓
- [ ] Variáveis setadas via Dashboard ou CLI
- [ ] Teste com curl retorna 200
- [ ] Response contém `external_id` e `payment_link`

---

## 🎯 Status

| Item | Status |
|------|--------|
| Código | ✅ Pronto |
| Documentação | ✅ Completa |
| Integração | ✅ Feita |
| Build | ✅ Passa |
| Pronto para Usar | ✅ Sim |

**Próximo Passo**: `supabase functions deploy create-payment-asaas` 🚀
