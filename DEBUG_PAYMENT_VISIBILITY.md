# 🔧 GUIA DE DEBUG - Por que PaymentSettingsSection não aparece?

Se você não consegue ver a seção "💳 Cobranças" no dashboard, use este guia.

---

## PASSO 1: Verificar se tenantId está no localStorage

**O que fazer:**
1. Abra o Dashboard
2. Aperte **F12** (DevTools)
3. Vá na aba **Console**
4. Cole este código:

```javascript
const user = localStorage.getItem('user');
console.log('User no localStorage:', user);
if (user) {
  try {
    const parsed = JSON.parse(user);
    console.log('tenant_id:', parsed.tenant_id);
  } catch (e) {
    console.log('Erro ao fazer parse:', e);
  }
}
```

**Esperado:**
- Você deve ver um objeto JSON com `tenant_id` 
- Se não vir nada ou erro, **essa é a causa do problema**

**Se não tiver tenant_id:**
1. Faça logout e login novamente
2. Tente o teste acima de novo
3. Se continuar sem tenant_id, contacte admin

---

## PASSO 2: Verificar se a seção está renderizada (mas talvez oculta)

**O que fazer:**
1. Abra DevTools (F12)
2. Vá na aba **Elements** (ou **Inspector**)
3. Aperte Ctrl+F (search)
4. Digite: `"Cobranças"` ou `"chargeMode"`

**Esperado:**
- Você encontra o elemento no HTML
- Se encontrar, significa que está renderizado mas talvez oculto visualmente

**Se encontrar:**
1. Clique com botão direito no elemento
2. Escolha "Scroll into view"
3. A seção deve ficar visível
4. Se aparecer, é um problema de **scroll/posicionamento**, não de renderização

---

## PASSO 3: Procurar por erros no Console

**O que fazer:**
1. DevTools aberto (F12)
2. Vá na aba **Console**
3. Procure por qualquer mensagem **EM VERMELHO**
4. Especialmente procure por:
   - `Cannot find module`
   - `PaymentSettingsSection`
   - `tenantPaymentSettingsService`
   - `Error loading`

**Comum de encontrar:**
```
❌ Error: Cannot read property 'getByTenantId' of undefined
```

Se ver mensagens assim, copie a mensagem e cole aqui.

---

## PASSO 4: Teste se PaymentSettingsSection existe como componente

**O que fazer:**
1. DevTools Console (F12)
2. Cole este código:

```javascript
// Verifica se o módulo foi importado
console.log('Procurando PaymentSettingsSection...');

// Se o React estiver disponível no window
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('React DevTools detectado');
} else {
  console.log('Aviso: React DevTools não encontrado');
}

// Tenta procurar o elemento no DOM
const cards = document.querySelectorAll('[class*="bg-card"]');
console.log('Cards encontrados:', cards.length);
cards.forEach((card, i) => {
  const text = card.innerText || card.textContent;
  console.log(`Card ${i}:`, text.substring(0, 100));
});
```

**Esperado:**
- Você deve ver vários Cards listados
- Um deles deve conter "Cobranças"
- Se não encontrar, a seção não está sendo renderizada

---

## PASSO 5: Forçar reload e limpar cache

**Se nenhum dos passos acima funcionou:**

1. Abra DevTools (F12)
2. Vá em **Network** 
3. Marque "Disable cache" (checkbox)
4. Agora tente Ctrl+Shift+R (hard refresh)
5. Espere a página carregar completamente
6. Procure pela seção "Cobranças" de novo

---

## PASSO 6: Verificar se SettingsPage.tsx está deletado acidentalmente

**O que fazer:**
1. No seu editor (VS Code), abra: `src/pages/SettingsPage.tsx`
2. Procure por: `PaymentSettingsSection`
3. Você deve encontrar:
   - Uma linha com `import PaymentSettingsSection`
   - Uma linha com `<PaymentSettingsSection tenantId={tenantId} />`

**Se não encontrar nada:**
1. Algo deletou ou sobrescreveu o arquivo
2. Você precisa restaurar o arquivo from source control ou refazer as mudanças

---

## PASSO 7: Resultado dos Testes

Cole aqui as informações que encontrou:

```markdown
## Resultado do Debug

**Passo 1 - tenantId no localStorage:**
[ ] (sim/não/erro) → Resultado: ___________________

**Passo 2 - Seção renderizada no HTML:**
[ ] (sim/não) → Encontrado: ___________________

**Passo 3 - Erros no Console:**
[ ] (sim/não) → Erros encontrados:
___________________

**Passo 4 - PaymentSettingsSection existe:**
[ ] (sim/não) → Cards encontrados: ___

**Passo 6 - Arquivo SettingsPage.tsx:**
[ ] (sim/não) → PaymentSettingsSection importado: ___

**Conclusão:** ___________________
```

---

## 🎯 Diagnóstico Automático

Se você quer saber instantaneamente o problema, execute este código completo no Console (F12):

```javascript
console.log('=== DIAGNÓSTICO AUTOMÁTICO ===\n');

// 1. Check tenant_id
const user = localStorage.getItem('user');
let hasTenantId = false;
if (user) {
  try {
    const parsed = JSON.parse(user);
    hasTenantId = !!parsed.tenant_id;
    console.log('✓ tenantId encontrado:', parsed.tenant_id);
  } catch (e) {
    console.log('✗ Erro no localStorage user:', e.message);
  }
} else {
  console.log('✗ user não encontrado no localStorage');
}

// 2. Check DOM
const cobrancasSection = Array.from(document.querySelectorAll('*'))
  .find(el => el.textContent.includes('Cobranças') && el.textContent.includes('Configure'));
console.log(cobrancasSection ? '✓ Seção encontrada no DOM' : '✗ Seção NÃO encontrada no DOM');

// 3. Check errors
const consoleErrors = [];
const originalError = console.error;
console.error = function(...args) {
  consoleErrors.push(args.join(' '));
  originalError.apply(console, args);
};

// 4. Summary
console.log('\n=== RESUMO ===');
console.log('tenantId carregado:', hasTenantId ? 'SIM ✓' : 'NÃO ✗');
console.log('Seção visível:', cobrancasSection ? 'SIM ✓' : 'NÃO ✗');
console.log('Erros encontrados:', consoleErrors.length);

if (!hasTenantId) {
  console.log('\n⚠️ PROBLEMA: tenantId não carregado. Tente fazer logout e login novamente.');
} else if (!cobrancasSection) {
  console.log('\n⚠️ PROBLEMA: Seção não está rendendo. Pode haver erro no console (veja acima).');
} else {
  console.log('\n✅ TUDO OK! Seção deveria estar visível.');
}
```

Copie e cole tudo isso no Console e você terá um diagnóstico automático.

---

## 🆘 Se NADA funcionar

Se você fez todos os passos acima e ainda não consegue ver a seção:

1. **Verifique se o arquivo `PaymentSettingsSection.tsx` realmente existe:**
   ```
   src/components/settings/PaymentSettingsSection.tsx
   ```
   Abra no VS Code. Se não existir, o arquivo foi deletado.

2. **Verifique se há erros de build:**
   Abra o terminal e execute:
   ```bash
   npm run build
   ```
   ou
   ```bash
   bun run build
   ```
   Procure por erros de TypeScript/compilação.

3. **Tente limpar node_modules:**
   ```bash
   rm -rf node_modules .next
   npm install
   ```

4. **Se estiver usando Vite, tente restart o servidor de dev:**
   ```bash
   npm run dev
   ```

---

**Depois de fazer os testes, me diga qual passo falhou e vou ajudar a corrigir o problema específico.**
