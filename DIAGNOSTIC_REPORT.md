# 🔍 DIAGNÓSTICO DOS ERROS - Relatório Completo

## ERROS ENCONTRADOS (Conforme relatado pelo usuário)

```
1. Failed to load resource: 404
2. [TenantPaymentSettingsService] Erro ao buscar configurações
3. [ChargeCreationService] Usando fluxo antigo (paymentGatewayService)
```

---

## ANÁLISE: Apontando as Causas Raízes

### ❌ ERRO 1: "Failed to load resource: 404"

**Causa Identificada:** 
A função Edge `encrypt-api-key` está sendo chamada, mas há problemas:

1. **Caminho da chamada:** `supabase.functions.invoke('encrypt-api-key')`
   - Arquivo: `src/services/payments/tenantPaymentSettingsService.ts` linha 109
   - Chamada quando usuário tenta salvar API Key

2. **Problema:**
   - Edge Function EXISTE: ✅ `supabase/functions/encrypt-api-key/index.ts`
   - MAS pode não estar deployada no Supabase remoto
   - OU não tem permissões CORS configuradas corretamente
   - OU está retornando erro porque master key não está em variável de ambiente

3. **Onde falha exatamente:**
   ```typescript
   // tenantPaymentSettingsService.ts linha 109
   const { data: responseData, error } = await supabase.functions.invoke('encrypt-api-key', {
     body: {
       apiKey,
       tenantId,
     },
   });
   ```

---

### ❌ ERRO 2: "[TenantPaymentSettingsService] Erro ao buscar configurações"

**Causa Identificada:**
Há dois potenciais problemas:

1. **Problema A - RLS Policy Faltando:**
   - Arquivo migração: `supabase/migrations/001_create_tenant_payment_settings.sql`
   - Tabela `tenant_payment_settings` criada SEM RLS policies
   - Supabase por DEFAULT nega acesso se não houver policy
   - Código: linha 30 em `tenantPaymentSettingsService.ts`
     ```typescript
     const { data, error } = await supabase
       .from('tenant_payment_settings')
       .select('*')
       .eq('tenant_id', tenantId)
       .single();
     ```

2. **Problema B - Tabela não existe:**
   - Migração criada mas NUNCA foi executada no banco de dados remoto
   - Banco local dev pode ter a tabela, mas produção não
   - Falta executar: `supabase db push`

3. **Sintoma:**
   ```javascript
   console.error('[TenantPaymentSettingsService] Erro ao buscar configurações:', error)
   return null; // Retorna null silenciosamente
   ```

---

### ❌ ERRO 3: "[ChargeCreationService] Usando fluxo antigo"

**Causa Identificada:**
Isso é por design, MAS a razão é porque o erro anterior (ERRO 2) faz com que:

```
Fluxo esperado:
1. chargeCreationService chama tenantPaymentSettingsService.getByTenantId()
2. Se retorna settings → usa novo fluxo (createChargeV2)
3. Se retorna NULL → usa fluxo antigo (paymentGatewayService) ← AQUI ESTAMOS

Fluxo atual (quebrado):
1. tenantPaymentSettingsService.getByTenantId() SEMPRE retorna NULL (porque erro 404 ou RLS)
2. Então chargeCreationService.ts linha 60 sempre usa fluxo antigo
3. Log: '[ChargeCreationService] Usando fluxo antigo (paymentGatewayService)'
```

**Cadeia de Culpas:**
- Erro 1 (404 encrypt-api-key) → Impede salvar configuração
- Erro 2 (RLS policy) → Impede ler configuração
- Erro 3 (fluxo antigo) → É consequência dos dois primeiros

---

## RESUMO: O QUE ESTÁ QUEBRADO

| Item | Status | Motivo | Impacto |
|------|--------|--------|--------|
| Salvar API Key | ❌ Falha | Edge Function `encrypt-api-key` retorna 404 | Usuário não consegue configurar gateway |
| Carregar Config | ❌ Falha | RLS policy não existe na tabela | PaymentSettingsSection fica vago, com erro no console |
| Usar novo fluxo | ❌ Nunca | Por causa dos dois acima, sempre fallback | Charges sempre usam fluxo antigo (Asaas) |
| UI Visível | ❌ Não | Erro silencioso em loadSettings() | Seção não renderiza ou renderiza vaga |

---

## PLANO DE CORREÇÃO

### Correção 1: Adicionar RLS Policies à Tabela
**Arquivo:** Nova migração `supabase/migrations/002_add_rls_tenant_payment_settings.sql`

RLS policy deve permitir:
- ✅ Usuários autenticados **PODEM** LER sua própria config (WHERE tenant_id = auth.jwt())
- ✅ Usuários autenticados **PODEM** ESCREVER sua própria config
- ✅ Ninguém pode ver config de outro tenant

### Correção 2: Script para Deploy da Edge Function
**Arquivo:** Instruções no README ou script shell

Garantir que `encrypt-api-key` está deployada:
```bash
supabase functions deploy encrypt-api-key
```

E variável de ambiente `ENCRYPTION_MASTER_KEY` está definida.

### Correção 3: Melhorar Tratamento de Erros
**Arquivo Modify:** `src/services/payments/tenantPaymentSettingsService.ts`

Adicionar:
- Log mais detalhado (incluir código de erro)
- Tentativa de retry automático
- Fallback gracioso se Edge Function não existir

### Correção 4: Verificar Environment Variables
**Arquivo:** `.env` ou `.env.local`

Garantir que existem:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

E no Supabase Secret Manager:
```
ENCRYPTION_MASTER_KEY=xxx
```

---

## RESPOSTA ÀS 6 PERGUNTAS DO USUÁRIO

### 1. Qual endpoint/arquivo está dando 404?

**Edge Function: `encrypt-api-key`** 
- Path: `supabase/functions/encrypt-api-key/index.ts`
- Chamado de: `src/services/payments/tenantPaymentSettingsService.ts` linha 109
- Causa: Não está deployada OU retorna erro de permissão/master key

### 2. Por que o tenantPaymentSettingsService está falhando?

**3 causas:**
1. **RLS Policy faltando** - Tabela criada sem `ENABLE RLS`
2. **Tabela não existe no remoto** - Migração não foi executada
3. **Edge Function retorna erro** - Impede salvar, e carregamento às vezes sem dados

### 3. Qual componente deveria renderizar a seção de cobrança?

**`PaymentSettingsSection.tsx`**
- Path: `src/components/settings/PaymentSettingsSection.tsx`
- Propriedade: `tenantId` (string)
- Renderiza: RadioGroup, Select, Input, Button, Alert

### 4. Qual página deveria exibir essa seção?

**`SettingsPage.tsx`**
- Path: `src/pages/SettingsPage.tsx`
- Local: Linha 293
- Renderização: `{tenantId && <PaymentSettingsSection tenantId={tenantId} />}`

### 5. O que você vai corrigir para fazer a UI aparecer de verdade?

**4 correções:**
1. ✅ Criar RLS policy para `tenant_payment_settings` (migração SQL)
2. ✅ Adicionar retry logic e melhor error handling em `tenantPaymentSettingsService`
3. ✅ Garantir Edge Function `encrypt-api-key` está deployada e funcional
4. ✅ Adicionar debug logs para facilitar diagnóstico futuro

### 6. Quais arquivos vai alterar?

| Prioridade | Arquivo | Ação |
|------------|---------|------|
| 🔴 Crítica | `supabase/migrations/002_add_rls_tenant_payment_settings.sql` | CRIAR |
| 🔴 Crítica | `src/services/payments/tenantPaymentSettingsService.ts` | MODIFICAR |
| 🟡 Média   | `supabase/functions/encrypt-api-key/index.ts` | Verificar|
| 🟡 Média   | `.env` | Verificar |

---

## PRÓXIMOS PASSOS

1. **Você vai fazer o debug no console** (os 7 passos que forneci antes)
2. **Colhe exatamente qual erro aparece** (copia o erro completo)
3. **Eu vou criar as migrations SQL** para adicionar RLS policies
4. **Eu vou melhorar o tenantPaymentSettingsService** para tratar os erros
5. **Você executa `supabase functions deploy`** para garantir EF está ativa
6. **Testamos novamente** e refazemos se precisar

---

**Status**: 🔴 BLOQUEADO - 3 erros impedem funcionamento
**Prioridade**: 🔴 CRÍTICA - Afeta toda UI de cobranças
**Risco de Regressão**: ✅ BAIXO - Mudanças são apenas adições, nada é removido
