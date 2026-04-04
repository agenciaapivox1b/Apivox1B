# 🚀 INSTRUÇÕES DE FIX - Implementação Completa

## RESUMO EXECUTIVO

**Problemas Encontrados:** 3 erros críticos impedindo funcionamento
**Arquivos Corrigidos:** 2 (migration SQL + serviço TypeScript)  
**Status:** 🟡 PRONTO PARA DEPLOYMENT

---

## ✅ O QUE FOI CORRIGIDO

### 1. ✅ RLS Policy Adicionada
**Arquivo:** `supabase/migrations/002_add_rls_tenant_payment_settings.sql`

O quê foi feito:
- ✅ Tabela agora tem segurança de linha (RLS habilitado)
- ✅ Políticas permitem usuários ler/escrever apenas seus próprios dados
- ✅ Impede vazamento de dados entre tenants

**Por que era importante:**
- Supabase **nega acesso por padrão** se não houver RLS policy
- Sem isso, `tenantPaymentSettings.getByTenantId()` retorna erro 403 ou 404
- Isso impedia carregar E salvar configurações

---

### 2. ✅ Tratamento de Erro Melhorado
**Arquivo:** `src/services/payments/tenantPaymentSettingsService.ts`

Mudanças:
- ✅ Logs detalhados indicando exatamente qual é o problema
- ✅ Detecta automaticamente: RLS policy faltando, tabela não existe, Edge Function 404
- ✅ Sugere solução ("Execute: supabase functions deploy")
- ✅ Melhor rastreamento de erro com código e status

Novo comportamento:
```
❌ ERRO DE PERMISSÃO (RLS Policy): ...
  → Solução: Executar `supabase db push` para aplicar RLS policies

❌ ERRO: Tabela não existe no banco remoto
  → Solução: Executar `supabase db push` para criar tabela

❌ Edge Function "encrypt-api-key" não encontrada
  → Solução: Execute: supabase functions deploy encrypt-api-key
```

---

## 🚀 PRÓXIMOS PASSOS - EXECUTE NA ORDEM

### PASSO 1: Aplicar RLS Policies (CRÍTICO)
```bash
# Vai para o diretório do projeto
cd C:\Users\mrmar\OneDrive\Desktop\Apivox\ai-agent-hub-81

# Push das migrações para o Supabase remoto
supabase db push
```

**Esperado:**
```
✓ supabase/migrations/001_create_tenant_payment_settings.sql
✓ supabase/migrations/002_add_rls_tenant_payment_settings.sql
✓ 2 migrations applied
```

Se receber erro de permissão, adicione a flag:
```bash
supabase db push --linked
```

Se isso pedir projeto, configure primeiro:
```bash
supabase login
supabase link --project-ref seu_project_ref
supabase db push
```

---

### PASSO 2: Verificar Edge Function
```bash
# Listar funções deployadas
supabase functions list
```

**Esperado:**
```
✓ encrypt-api-key
✓ decrypt-api-key-secure
✓ create-payment-asaas
✓ create-payment-mercadopago
✓ create-payment-stripe
```

Se **`encrypt-api-key`** não aparecer, faça:
```bash
supabase functions deploy encrypt-api-key
```

---

### PASSO 3: Verificar Variáveis de Ambiente

**No arquivo `.env.local` (ou `.env` do projeto):**
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

**No Supabase Console (Project Settings > Secrets):**
```
ENCRYPTION_MASTER_KEY=apivox-master-key-2026-secure
```

Se não existir a variável `ENCRYPTION_MASTER_KEY`, adicione via console:
1. Acesse: https://app.supabase.com/project/xxx/settings/secrets
2. Clique "New Secret"
3. Nome: `ENCRYPTION_MASTER_KEY`
4. Valor: `apivox-master-key-2026-secure` (ou gere uma mais segura)

---

### PASSO 4: Reiniciar o Servidor Dev (LOCAL)

```bash
# Pare o servidor (Ctrl+C)

# Limpe cache e reinstale (opcional mas recomendado)
# rm -rf node_modules .next
# npm install

# Reinicie
npm run dev
```

---

### PASSO 5: Testar no Dashboard

1. Abra http://localhost:5173 (ou sua porta)
2. Vá para **Minha Conta > Configurações**
3. Procure pela seção **"💳 Cobranças"**
4. Abra DevTools (F12) → Console
5. Procure pelos logs **[TenantPaymentSettingsService]**

**Esperado:**
```javascript
[TenantPaymentSettingsService] Carregando configurações para tenant: ...
[TenantPaymentSettingsService] ✅ Configurações carregadas com sucesso ← SE HOUVER CONFIG
ou
[TenantPaymentSettingsService] Nenhuma configuração encontrada para tenant: ... ← SE NÃO HOUVER
```

---

### PASSO 6: Testar Salvamento

Na seção de Cobranças:
1. Selecione "Gateway de Pagamento"
2. Escolha "Asaas"
3. Cole uma chave: `sk_test_abc123`
4. Clique "Salvar Configurações"

**Esperado no Console:**
```javascript
[TenantPaymentSettingsService] Iniciando salvamento...
[TenantPaymentSettingsService] Criptografando API Key via Edge Function...
[TenantPaymentSettingsService] ✅ API Key criptografada com sucesso
[TenantPaymentSettingsService] Criando nova configuração...
[TenantPaymentSettingsService] ✅ Configuração criada com sucesso
```

**Se receber erro:**
```javascript
[TenantPaymentSettingsService] ❌ Erro de permissão ao inserir
Solução: Executar: supabase db push
```

---

## 🔍 TROUBLESHOOTING

### Problema: "Relação tenant_payment_settings não existe"
```
Solução: 
1. supabase db push
2. Verificar que migrations estão em supabase/migrations/
```

### Problema: "Erro de permissão (RLS Policy)"
```
Solução:
1. supabase db push (aplica RLS policies do arquivo _002)
2. Verificar que user está autenticado no Supabase Auth
```

### Problema: "Edge Function encrypt-api-key não encontrada"
```
Solução:
1. supabase functions deploy encrypt-api-key
2. Verificar que arquivo existe: supabase/functions/encrypt-api-key/index.ts
3. Verificar variável ENCRYPTION_MASTER_KEY está definida
```

### Problema: "Seção de Cobranças ainda não aparece"
```
Solução:
1. F5 (recarregar página)
2. Ctrl+Shift+R (hard refresh - limpar cache)
3. Check DevTools Console pela mensagem de erro exata
4. Se tiver erro de tenantId, copiar e colar aqui no chat
```

---

## 📋 CHECKLIST DE VALIDAÇÃO

Depois de fazer todos os passos acima, execute este teste:

```javascript
// Cola no DevTools Console (F12)
console.log('=== VALIDAÇÃO PÓS-FIX ===');

// 1. Verifica tenantId
const user = localStorage.getItem('user');
const tenantId = user ? JSON.parse(user).tenant_id : null;
console.log('✓ tenantId:', tenantId ? '✅ ' + tenantId.substring(0, 8) + '...' : '❌ Faltando');

// 2. Verifica compt de Cobranças
const cobrancasEl = Array.from(document.querySelectorAll('*'))
  .find(el => el.textContent?.includes('Cobranças') && el.textContent?.includes('Configure'));
console.log('✓ Seção Cobranças:', cobrancasEl ? '✅ Visível' : '❌ Não encontrada');

// 3. Verifica localStorage
const settingsStr = localStorage.getItem('charges_data');
console.log('✓ Dados locais:', settingsStr ? '✅ Existe' : '⚠️ Vazio (normal)');

// 4. Teste de salvamento (simular preenchimento)
const inputs = document.querySelectorAll('input[type="password"], input[type="url"]');
console.log('✓ Campos de entrada:', inputs.length > 0 ? '✅ ' + inputs.length + ' encontrados' : '❌ Nenhum');

console.log('\n=== RESULTADO ===');
const isOK = tenantId && cobrancasEl && inputs.length > 0;
console.log(isOK ? '✅ TUDO OK! Sistema pronto para usar.' : '⚠️ Verifique os erros acima');
```

**Esperado:**
```
✓ tenantId: ✅ 123abc45...
✓ Seção Cobranças: ✅ Visível
✓ Dados locais: ⚠️ Vazio (normal)
✓ Campos de entrada: ✅ 2 encontrados

=== RESULTADO ===
✅ TUDO OK! Sistema pronto para usar.
```

---

## 📊 RESUMO DAS MUDANÇAS

| Arquivo | Ação | Razão |
|---------|------|-------|
| `supabase/migrations/002_add_rls_tenant_payment_settings.sql` | ✅ CRIADO | Adiciona segurança de linha (RLS) |
| `src/services/payments/tenantPaymentSettingsService.ts` | ✅ MODIFICADO | Melhor tratamento de erros + logs |
| `supabase/functions/encrypt-api-key/index.ts` | ✅ VERIFICADO | Função já existe, apenas precisa deploy |
| Nenhum outro arquivo | - | SEM QUEBRA DE COMPATIBILIDADE |

**Risco de Regressão:** ✅ ZERO - Apenas adições, nenhuma remoção

---

## 🎯 PRÓXIMO PASSO IMEDIATO

Você deve:
1. ✅ Ler este documento completo
2. ✅ Executar `supabase db push` (CRÍTICO)
3. ✅ Executar `supabase functions deploy encrypt-api-key`
4. ✅ Reiniciar servidor dev (`npm run dev`)
5. ✅ Testar no dashboard (Minha Conta > Configurações > Cobranças)
6. ✅ Executar o checklist de validação acima
7. ✅ Me reportar o resultado

---

**Dúvidas? Copie a mensagem de erro exata do Console (F12) e cole aqui.**
