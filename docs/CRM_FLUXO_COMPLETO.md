# 🎯 CRM APIVOX - FLUXO COMPLETO

## Arquitetura: Conversas → Oportunidades → Funil → Follow-up

---

## 📊 DIAGRAMA DE FLUXO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DE OPORTUNIDADES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐                                                            │
│  │   CONTATO    │◄──────────────────────────────────────────────────────┐   │
│  │  (contacts)  │                                                       │   │
│  └──────┬───────┘                                                       │   │
│         │                                                               │   │
│         │ 1:N                                                           │   │
│         ▼                                                               │   │
│  ┌──────────────┐        ┌──────────────────┐        ┌──────────────┐   │   │
│  │  CONVERSA    │◄───────│   OPORTUNIDADE   │◄───────│  ATIVIDADES  │   │   │
│  │(conversations│  1:1   │ (opportunities)  │  1:N   │(opportunity_ │   │   │
│  │              │        │                  │        │  activities) │   │   │
│  └──────────────┘        └────────┬─────────┘        └──────────────┘   │   │
│                                   │                                     │   │
│                                   │ 1:N                                 │   │
│                                   ▼                                     │   │
│                          ┌──────────────────┐                         │   │
│                          │ STAGE HISTORY    │                         │   │
│                          │(opportunity_stage│                         │   │
│                          │    _history)      │                         │   │
│                          └──────────────────┘                         │   │
│                                                                         │   │
└─────────────────────────────────────────────────────────────────────────┘   │
                                                                              │
┌─────────────────────────────────────────────────────────────────────────────┤
│                         FUNIL DE VENDAS (KANBAN)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ DESCOBERTA  │  │  PROPOSTA   │  │ NEGOCIAÇÃO  │  │  FECHADO    │        │
│  │   (blue)    │──►  (yellow)  │──►  (orange)   │──►   (green)   │        │
│  │             │  │             │  │             │  │  ✓ GANHO   │        │
│  │ • Lead 1    │  │ • Lead 3    │  │ • Lead 2    │  │             │        │
│  │ • Lead 4    │  │             │  │             │  └─────────────┘        │
│  │             │  └─────────────┘  └─────────────┘                        │
│  └─────────────┘                                                        │
│         │                                                                 │
│         │ (drag & drop)                                                 │
│         ▼                                                                 │
│  ┌─────────────┐                                                         │
│  │   PERDIDO   │                                                         │
│  │   (red)     │                                                         │
│  │     ✗       │                                                         │
│  └─────────────┘                                                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUXOS DETALHADOS

### **FLUXO 1: Criar Oportunidade Manualmente**

```
Usuário clica "Nova Oportunidade"
         │
         ▼
┌─────────────────────────┐
│ 1. Preencher formulário │
│    - Nome               │
│    - Valor (R$)         │
│    - Descrição          │
│    - Contato (select)   │
│    - Responsável        │
│    - Prioridade         │
│    - Previsão fechamento│
└──────────┬──────────────┘
           │
           ▼ POST /rest/v1/opportunities
┌─────────────────────────┐
│ 2. INSERT opportunities │
│    - tenant_id          │
│    - name               │
│    - contact_id         │
│    - amount             │
│    - status='descoberta'│
│    - source='manual'    │
└──────────┬──────────────┘
           │
           ▼ (trigger)
┌─────────────────────────┐
│ 3. INSERT activity      │
│    type: 'note'         │
│    title: 'Criada'      │
└──────────┬──────────────┘
           │
           ▼
    🎉 Oportunidade criada!
           │
           ▼
    Aparece no Funil
    (coluna "Descoberta")
```

---

### **FLUXO 2: Criar Oportunidade a partir de Conversa**

```
Usuário está na Inbox
         │
         ▼
┌─────────────────────────┐
│ 1. Visualiza conversa   │
│    com João (WhatsApp)  │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 2. Clica "Criar Opp"    │
│    no chat              │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 3. Preenche dados:      │
│    - Nome: "Projeto X"  │
│    - Valor: R$ 5.000    │
│    - Descrição...       │
└──────────┬──────────────┘
           │
           ▼ RPC: create_opportunity_from_conversation()
┌─────────────────────────┐
│ 4. Busca contact_id da  │
│    conversation         │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 5. INSERT opportunity   │
│    - contact_id         │
│    - conversation_id    │
│    - source='whatsapp'  │
│    - status='descoberta'│
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 6. INSERT activity      │
│    type: 'note'         │
│    "Criada da conversa" │
└──────────┬──────────────┘
           │
           ▼
    🎉 Oportunidade criada!
           │
           ▼
    Redireciona para:
    /opportunities/:id
```

---

### **FLUXO 3: Mover no Funil (Drag & Drop)**

```
Usuário no SalesFunnelPage
         │
         ▼
┌─────────────────────────┐
│ 1. Arrasta card         │
│    "Projeto X"          │
│    de: Descoberta       │
│    para: Proposta       │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 2. Drop na coluna       │
│    "Proposta"           │
└──────────┬──────────────┘
           │
           ▼ PATCH /rest/v1/opportunities
┌─────────────────────────┐
│ 3. UPDATE opportunities │
│    SET status='proposta'│
│    WHERE id = :id       │
└──────────┬──────────────┘
           │
           ▼ (trigger log_stage_change)
┌─────────────────────────┐
│ 4. INSERT stage_history │
│    from: 'descoberta'   │
│    to: 'proposta'       │
│    moved_at: NOW()      │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 5. INSERT activity      │
│    type: 'stage_change' │
│    title: "Mudou estágio"│
└──────────┬──────────────┘
           │
           ▼
    ✅ Card aparece na nova coluna
```

---

### **FLUXO 4: Abrir Conversa da Oportunidade**

```
Usuário na OpportunityDetailPage
         │
         ▼
┌─────────────────────────┐
│ 1. Visualiza oportunidade│
│    "Projeto X"          │
│    - Valor: R$ 5.000    │
│    - Contato: João      │
│    - Conversa: 3 msgs   │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 2. Clica "Ver Conversa" │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 3. Busca conversation_id│
│    da oportunidade      │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 4. GET /conversations/  │
│    :conversation_id     │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 5. GET /messages?       │
│    conversation_id=... │
└──────────┬──────────────┘
           │
           ▼
    📱 Mostra chat embed
    com histórico completo
```

---

### **FLUXO 5: Adicionar Atividade (Follow-up)**

```
Usuário na OpportunityDetailPage
         │
         ▼
┌─────────────────────────┐
│ 1. Clica "Nova Atividade"│
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 2. Escolhe tipo:        │
│    • Ligação            │
│    • Reunião            │
│    • WhatsApp           │
│    • Email              │
│    • Nota               │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 3. Preenche:            │
│    - Título             │
│    - Descrição          │
│    - Agendar? (data)    │
└──────────┬──────────────┘
           │
           ▼ POST /rest/v1/opportunity_activities
┌─────────────────────────┐
│ 4. INSERT activity      │
│    - opportunity_id     │
│    - activity_type      │
│    - title              │
│    - scheduled_at       │
│    - status='pending'   │
└──────────┬──────────────┘
           │
           ▼
    ✅ Aparece na timeline
```

---

## 📋 ESTRUTURA DE ESTÁGIOS (FUNIL)

```typescript
const PIPELINE_STAGES = [
  { 
    id: 'descoberta', 
    label: 'Descoberta', 
    color: 'bg-blue-500',
    description: 'Lead inicial, primeiro contato'
  },
  { 
    id: 'proposta', 
    label: 'Proposta', 
    color: 'bg-yellow-500',
    description: 'Proposta enviada, aguardando resposta'
  },
  { 
    id: 'negociacao', 
    label: 'Negociação', 
    color: 'bg-orange-500',
    description: 'Negociando valores e condições'
  },
  { 
    id: 'fechado', 
    label: 'Fechado (Ganho)', 
    color: 'bg-green-500',
    description: 'Negócio fechado com sucesso'
  },
  { 
    id: 'perdido', 
    label: 'Perdido', 
    color: 'bg-red-500',
    description: 'Negócio não prosseguiu'
  }
] as const;
```

---

## 🔗 VÍNCULOS ENTRE ENTIDADES

### **Relacionamentos:**

```
contacts (1) ←────── (N) opportunities
    │                    │
    │                    │
    └──────── (1) ←──────┘
           conversations
              │
              │ (1:N)
              ▼
         messages
```

### **Campos de Ligação:**

| Tabela | Campo | Referência | Descrição |
|--------|-------|------------|-----------|
| opportunities | contact_id | contacts.id | Contato vinculado |
| opportunities | conversation_id | conversations.id | Conversa de origem |
| opportunities | assigned_to | auth.users.id | Responsável |
| opportunity_activities | opportunity_id | opportunities.id | Atividades da opp |
| opportunity_activities | contact_id | contacts.id | Contato da atividade |
| opportunity_stage_history | opportunity_id | opportunities.id | Histórico de movimentação |

---

## 🎨 COMPONENTES DO FRONTEND

### **Páginas:**

| Página | Arquivo | Descrição |
|--------|---------|-----------|
| SalesFunnelPage | `src/pages/SalesFunnelPage.tsx` | Kanban drag-and-drop |
| OpportunitiesPage | `src/pages/OpportunitiesPage.tsx` | Lista com filtros |
| OpportunityDetailPage | `src/pages/OpportunityDetailPage.tsx` | Detalhe + chat embed |
| InboxPage | `src/pages/InboxPage.tsx` | Botão "Criar Opp" no chat |

### **Componentes:**

| Componente | Arquivo | Props |
|------------|---------|-------|
| FunnelColumn | `src/components/funnel/FunnelColumn.tsx` | stage, leads, onDrop |
| LeadCard | `src/components/funnel/LeadCard.tsx` | lead, onDragStart |
| OpportunityForm | `src/components/opportunities/OpportunityForm.tsx` | onSubmit, initialData |
| ActivityTimeline | `src/components/opportunities/ActivityTimeline.tsx` | activities |
| CreateFromChat | `src/components/opportunities/CreateFromChat.tsx` | conversationId, contactId |

---

## 🔐 SEGURANÇA (MULTI-TENANT)

### **RLS Policies:**

```sql
-- Todas as tabelas têm:
USING (tenant_id IN (
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
))
```

### **Validações:**

1. Usuário só vê oportunidades do seu tenant
2. Usuário só move oportunidades do seu tenant
3. Atividades isoladas por tenant
4. Histórico isolado por tenant

---

## 📊 QUERIES PRINCIPAIS

### **Listar oportunidades do funil:**

```sql
SELECT * FROM opportunities 
WHERE tenant_id = :tenant_id 
  AND status IN ('descoberta', 'proposta', 'negociacao')
ORDER BY updated_at DESC;
```

### **Buscar oportunidade com dados enriquecidos:**

```sql
SELECT * FROM opportunities_enriched 
WHERE id = :opportunity_id;
```

### **Atividades da oportunidade:**

```sql
SELECT * FROM opportunity_activities 
WHERE opportunity_id = :id 
ORDER BY created_at DESC;
```

### **Resumo do funil:**

```sql
SELECT * FROM pipeline_summary 
WHERE tenant_id = :tenant_id;
```

---

## 🚀 PRÓXIMOS PASSOS DE IMPLEMENTAÇÃO

1. **Executar Migration:** `20250407_crm_opportunities_complete.sql`
2. **Criar Edge Functions:** (se necessário para lógica complexa)
3. **Atualizar Services:** `crmService.ts`
4. **Conectar Funil:** `SalesFunnelPage.tsx` → dados reais
5. **Chat Embed:** `OpportunityDetailPage.tsx`
6. **Botão Inbox:** `InboxPage.tsx` → criar oportunidade

---

## ✨ FEATURES FUTURAS (Não incluídas agora)

- [ ] Automação de follow-up (lembretes)
- [ ] Integração com cobranças (linked_charge_id)
- [ ] Análise de conversão por estágio
- [ ] Forecast de vendas
- [ ] Duplicação de oportunidades
- [ ] Campos customizados por tenant

---

**Documento criado em:** Abril 2026  
**Versão:** 1.0 - Estrutura Completa
