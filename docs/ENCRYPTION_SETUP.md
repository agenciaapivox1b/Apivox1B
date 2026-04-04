# Setup das Edge Functions - GUIA PRÁTICO

## 📋 Resumo

Você precisa deploiar 2 Edge Functions no Supabase para que a criptografia de API Keys funcione:

1. `encrypt-api-key` - Criptografa API Key (pode ser chamada do frontend)
2. `decrypt-api-key` - Descriptografa API Key (backend only)

---

## 🚀 Passos de Implementação

### 1. Setup Local do Supabase CLI

```bash
# Instalar Supabase CLI (se não tiver)
npm install -g supabase

# Fazer login
supabase login

# Navegar para a pasta do projeto
cd c:\Users\mrmar\OneDrive\Desktop\Apivox\ai-agent-hub-81
```

### 2. Criar os arquivos das functions (JÁ FEITO)

✅ Os arquivos já estão em:
- `supabase/functions/encrypt-api-key/index.ts`
- `supabase/functions/decrypt-api-key/index.ts`

### 3. Deploy das Functions

```bash
# Fazer deploy de ambas as functions
supabase functions deploy encrypt-api-key
supabase functions deploy decrypt-api-key

# Ou, se preferir, uma por uma:
supabase functions deploy encrypt-api-key --project-id=YOUR_PROJECT_ID
supabase functions deploy decrypt-api-key --project-id=YOUR_PROJECT_ID
```

### 4. Verificar Endpoints

Após o deploy, as functions estarão disponíveis em:
- `https://YOUR_PROJECT_ID.supabase.co/functions/v1/encrypt-api-key`
- `https://YOUR_PROJECT_ID.supabase.co/functions/v1/decrypt-api-key`

O Supabase Client do seu app chama automaticamente via `supabase.functions.invoke()`.

### 5. Variáveis de Ambiente (Importante!)

No **Supabase Dashboard**:
1. Ir para: Settings → Functions
2. Adicionar variável de ambiente:
   ```
   ENCRYPTION_MASTER_KEY=seu-valor-muito-seguro-e-aleatorio
   ```

⚠️ **RECOMENDAÇÃO**: Use um valor ALEATÓRIO e FORTE como:
```
ENCRYPTION_MASTER_KEY=aX9k@mP#7qL$vW2zQ&mRn5pJ8sT!yU
```

---

## 🧪 Testar as Functions

### Via Supabase Dashboard

1. Ir para: Functions → encrypt-api-key
2. Clicar em "Invoke" ou "Test"
3. Body:
   ```json
   {
     "apiKey": "test-api-key-12345",
     "tenantId": "tenant-uuid-123"
   }
   ```
4. Deve retornar:
   ```json
   {
     "success": true,
     "encrypted": "base64_string_aqui"
   }
   ```

---

## ⚙️ Fluxo de Funcionamento

```
1. Usuário preenche API Key em PaymentSettingsSection
2. Clica "Salvar Configurações"
3. tenantPaymentSettingsService.save() é chamado
4. Detecta que tem apiKey e chama encryptApiKey()
5. encryptApiKey() chama supabase.functions.invoke('encrypt-api-key')
6. Edge Function criptografa e retorna encrypted string
7. encrypted string é salvo no banco em "encrypted_api_key"
8. API Key original NUNCA é armazenada no banco
```

---

## 🔐 Segurança Implementada

✅ **Criptografia AES-256-GCM**
- IV aleatório (12 bytes)
- Salt aleatório (16 bytes)
- PBKDF2 para derivação de chave

✅ **Nunca expor API Key**
- Frontend envia PLAIN ao backend via HTTPS
- Backend criptografa imediatamente
- Descriptografia apenas quando necessário (backend)

✅ **Autenticação**
- decrypt-api-key requer header Authorization
- Validação de JWT do Supabase

---

## 📝 Código da Feature

### PaymentSettingsSection.tsx
```typescript
// Usuário preenche API Key
<Input
  id="apiKey"
  type="password"
  placeholder="Cole sua API key do Asaas"
  value={apiKey}
  onChange={(e) => setApiKey(e.target.value)}
/>

// Ao salvar
const result = await tenantPaymentSettingsService.save({
  tenantId,
  chargeMode,
  apiKey, // PLAIN text
  // ...
});
```

### tenantPaymentSettingsService.ts
```typescript
// Detecta que tem apiKey e criptografa
if (input.apiKey) {
  encryptedApiKey = await this.encryptApiKey(input.apiKey, input.tenantId);
}

// Chama Edge Function
private async encryptApiKey(apiKey: string, tenantId: string) {
  const { data, error } = await supabase.functions.invoke('encrypt-api-key', {
    body: { apiKey, tenantId },
  });
  return data.encrypted;
}
```

### Database
```sql
-- A tabela tenant_payment_settings já tem a coluna
encrypted_api_key VARCHAR(1024) -- Armazena base64 criptografado
```

---

## 🚨 Troubleshooting

### Erro: "Function not found"
- Verificar se o deploy foi bem-sucedido
- Rodar: `supabase functions list`
- Verificar se o projeto ID está correto

### Erro: "Module not found" em encrypt-api-key
- Verificar se as URLs de import estão corretas
- Usar: `https://deno.land/std@0.168.0/...`

### Erro: "ENCRYPTION_MASTER_KEY not set"
- Adicionar variável de ambiente no Supabase Dashboard
- Fazer novo deploy após adicionar

### API Key não é criptografada
- Verificar se o navegador consegue chamar a function
- Abrir DevTools → Network → Verificar resposta de `/functions/v1/encrypt-api-key`

---

## ✅ Checklist de Implementação

- [ ] Instalar Supabase CLI
- [ ] Fazer login com `supabase login`
- [ ] Deploy das 2 functions
- [ ] Adicionar ENCRYPTION_MASTER_KEY no Supabase Dashboard
- [ ] Testar encrypt-api-key via API
- [ ] Testar salvamento de TenantPaymentSettings (deve chamar function)
- [ ] Verificar que API Key está criptografada no banco
- [ ] Testar webhook de pagamento (usa encrypted_api_key do banco)

---

## 📚 Documentação Relacionada

- [PAYMENT_ARCHITECTURE.md](../docs/PAYMENT_ARCHITECTURE.md)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Deno Crypto](https://deno.land/std@0.168.0/crypto)

---

**Última atualização**: 27/03/2026  
**Status**: Pronto para deploy ✅
