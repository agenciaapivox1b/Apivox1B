# ✅ COMO ACESSAR A CONFIGURAÇÃO DE COBRANÇAS NO DASHBOARD

## 📍 Localização Exata

**Caminho no Dashboard:**
```
Minha Conta (menu superior direito)
    ↓
Configurações
    ↓
[Seção "Cobranças"]  ← AQUI
```

## 🖥️ Passo a Passo Para Acessar

### 1. Abra o Menu de Usuário
- Clique no seu nome/avatar no canto **superior direito** do dashboard

### 2. Selecione "Configurações"
- Opção que abre a página de Configurações completa

### 3. Procure pela Seção "Cobranças"
- Está **após as seções de**:
  - Aparência
  - Notificações
  - Preferências do Sistema
  
- E **antes de**:
  - Funil de Vendas
  - Região e Idioma

### 4. Você verá:
```
┌─────────────────────────────────────────────────┐
│ 💳 Cobranças          [Status visual]           │
│ Configure como deseja processar os pagamentos   │
│                                                  │
│ ℹ️ A APIVOX é a camada de automação...         │
│                                                  │
│ Tipo de Cobrança:                               │
│ ◉ Gateway de Pagamento        ○ Link Manual     │
│                                                  │
│ Selecione o Gateway:                            │
│ ┌──────────────────────────┐                   │
│ │ Asaas ▼                  │                   │
│ │ Mercado Pago            │                   │
│ │ Stripe                  │                   │
│ └──────────────────────────┘                   │
│                                                  │
│ API Key / Token de Acesso:                     │
│ ┌──────────────────────────┐                   │
│ │ ●●●●●●●●●●●●●●●●●●●  │                   │
│ └──────────────────────────┘                   │
│                                                  │
│ ✅ A chave é criptografada...                  │
│                                                  │
│ [Testar Conexão]  [Salvar Configurações]       │
└─────────────────────────────────────────────────┘
```

## ✨ O Que Você Pode Fazer

### Opção 1: Gateway de Pagamento (Recomendado)
1. Selecione **"Gateway de Pagamento"**
2. Escolha seu gateway:
   - **Asaas** (PIX, Boleto, Cartão)
   - **Mercado Pago** (PIX, Boleto)
   - **Stripe** (Cartão Internacional)
3. Cole sua **API Key** obtida do painel do gateway
4. Clique **"Testar Conexão"** (opcional)
5. Clique **"Salvar Configurações"**

**Resultado**: Cobranças criadas usarão seu gateway automaticamente

### Opção 2: Link Manual (Alternativa)
1. Selecione **"Link Manual"**
2. Cole seu **link de pagamento**:
   - Ex: `https://picpay.me/seu-usuario`
   - Ou: `https://seu-site.com/pagar`
3. Clique **"Salvar Configurações"**

**Resultado**: Cobranças enviarão esse link + farão automação de lembretes

## 🔍 Indicador de Status

No lado direito da seção "Cobranças" você vê:

- 🟢 **Verde "Conectado ao [gateway]"** = Gateway configurado e pronto
- 🟠 **Amber "Nenhuma configuração ativa"** = Você precisa de uma configuração primeiro

## 💾 Persistência

✅ Quando você clica **"Salvar Configurações"**:
1. Dados são salvos no banco de dados
2. API Key é **criptografada** (PBKDF2 + AES-GCM)
3. Ao recarregar página, configuração aparece novamente
4. Você pode alterar quando quiser

## 🧪 Como Testar Visualmente

### Teste 1: Acesso
- [ ] Login no dashboard
- [ ] Clique em seu nome (canto superior direito)
- [ ] Selecione "Configurações"
- [ ] Procure por "Cobranças" (seção com 💳 ícone)
- [ ] A seção deve estar **visível**

### Teste 2: Interface
- [ ] Você vê **dois radio buttons** (Gateway vs Link Manual)?
- [ ] Ao selecionar "Gateway", aparecem campos de gateway?
- [ ] Ao selecionar "Link Manual", desaparecem e aparece campo de link?
- [ ] Os campos mudam dinamicamente?

### Teste 3: Salvamento
- [ ] Selecione "Gateway de Pagamento"
- [ ] Escolha "Asaas"
- [ ] Cole uma API key (pode ser fake para teste)
- [ ] Clique "Salvar Configurações"
- [ ] Você vê mensagem de sucesso (toast)?
- [ ] Recarregue a página (F5)
- [ ] A configuração continua lá?

### Teste 4: Status Visual
- [ ] Depois de salvar, o status muda para 🟢 "Conectado ao asaas"?
- [ ] Se você apagar o link/key e salvar sem nada, ficar 🟠 "Nenhuma configuração"?

## 📋 Checklist de Funcionamento

- [ ] Seção "Cobranças" está visível na página de Configurações
- [ ] Você consegue escolher entre Gateway e Link Manual
- [ ] Ao escolher Gateway, aparecem os campos corretos
- [ ] Ao escolher Link Manual, aparece campo de URL
- [ ] Botão "Salvar Configurações" funciona  
- [ ] Dados são salvos e recarregam após F5
- [ ] Status visual muda conforme configuração
- [ ] Não há erros no console (F12)
- [ ] Toast (notificação) aparece ao salvar

## 🆘 Se Não Ver a Seção

### Verificar
1. Você está logado? (verifique se avatar aparece no canto superior direito)
2. Você tem um `tenant_id` válido? (abra DevTools > Console e procure por erros)
3. A página de Configurações carregou? (procure por outras seções como "Aparência", "Notificações")

### Debug (F12 DevTools)
```javascript
// No Console, execute:
const user = localStorage.getItem('user');
console.log('User:', user);

// Se retornar null ou sem tenant_id, o problema é lá
```

## 📞 Arquivo Criado

Componente principal:
- `src/components/settings/PaymentSettingsSection.tsx` ← Aqui está toda a UI

Componentes auxiliares:
- `src/components/settings/PaymentConnectionStatus.tsx` ← Indicador de status
- `src/components/settings/GatewayTestConnection.tsx` ← Botão testar

Página que renderiza:
- `src/pages/SettingsPage.tsx` ← Já importa e renderiza PaymentSettingsSection

Banco de dados:
- `tenant_payment_settings` table ← Onde dados são salvos

---

**Status**: ✅ Interface 100% implementada e visível no dashboard
