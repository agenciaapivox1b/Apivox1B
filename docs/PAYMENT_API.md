# 📊 API de Pagamentos da APIVOX - Documentação

## 🎯 Visão Geral

Sistema escalável de processamento de pagamentos multi-tenant com suporte a múltiplos gateways.

**Versão**: 2.0  
**Status**: ✅ Produção  
**Última Atualização**: 27/03/2026

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    ChargePage (UI)                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ NewChargeModal   │  │ PaymentLinks     │                 │
│  │                  │  │ Drawer           │                 │
│  └────────┬─────────┘  └──────────────────┘                 │
│           │                                                   │
│  ┌────────┴─────────────────────────────────────┐           │
│  │                                               │            │
│  ▼                                               ▼            │
│  chargeCreationService.createChargeWithFlexibleFlow()       │
│           │                      │                           │
│           ├─ Lê config do tenant  ─┤                        │
│           │                      │                           │
│  ┌────────▼──────────┐    ┌──────▼──────────────┐           │
│  │ Config com        │    │ Config sem config  │           │
│  │ settings salvas   │    │ (legacy)           │           │
│  └────────┬──────────┘    └──────┬──────────────┘           │
│           │                      │                           │
│  ┌────────▼────────────┐    ┌────▼──────────────┐           │
│  │ createChargeV2()    │    │ paymentGateway    │           │
│  │ (novo fluxo)        │    │ Service           │           │
│  └────────┬────────────┘    └────┬──────────────┘           │
│           │                      │                           │
│  ┌────────▼──────────────────────▼──────────────┐           │
│  │                                               │            │
│  │  Resolver de Provider                        │           │
│  │  (getPaymentProvider)                        │           │
│  │                                               │            │
│  └────────┬──────────────────────┬──────────────┘           │
│           │                      │                           │
│  ┌────────▼─────────────┐  ┌─────▼────────────┐            │
│  │  AsaasProvider       │  │ ManualProvider   │            │
│  │                      │  │                  │            │
│  │  .createPayment()    │  │ .createPayment() │            │
│  │  .getStatus()        │  │ .getStatus()     │            │
│  │  .cancelPayment()    │  │ .cancelPayment() │            │
│  └──────────────────────┘  └──────────────────┘            │
│                                                               │
└─────────────────────────────────────────────────────────────┘

    │                              │
    ▼                              ▼
┌──────────────────┐      ┌──────────────────┐
│ Edge Function    │      │ chargeService    │
│ create-charge    │      │ (localStorage)   │
│ (Asaas)          │      │                  │
└──────────────────┘      └──────────────────┘

    │
    ▼
┌──────────────────────┐
│ Supabase Webhooks    │
│ POST /webhooks/      │
│   payments/asaas     │
│                      │
│ webhookService       │
│ .processAsaas        │
│  Webhook()           │
└──────────────────────┘
```

---

## 🔧 Serviços Principais

### 1. `chargeCreationService`

**Responsabilidade**: Camada inteligente que decide qual fluxo usar.

```typescript
// Uso
const result = await chargeCreationService
  .createChargeWithFlexibleFlow({
    tenantId: 'tenant-123',
    customerName: 'João Silva',
    customerEmail: 'joao@example.com',
    customerPhone: '11999999999',
    amount: 100.00,
    dueDate: '2026-04-27T00:00:00Z',
    description: 'Venda de Produto X',
    paymentMethod: 'pix',
    shouldSendEmail: true,
    createdBy: 'user@company.com'
  });
```

**Lógica**:
- Se tenant tem `TenantPaymentSettings` → usa `createChargeV2` (novo)
- Se não tem config → usa `paymentGatewayService` (legado)

---

### 2. `createChargeV2()`

**Responsabilidade**: Fluxo moderno de criação de cobrança.

```typescript
const result = await createChargeV2({
  tenantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  dueDate: string; // ISO
  description: string;
  paymentMethod: 'pix' | 'boleto' | 'credit_card' | 'link';
  cpfCnpj?: string;
  userId?: string;
});

// Retorna
{
  success: boolean;
  chargeId?: string;
  paymentLink?: string;
  error?: string;
}
```

**Fluxo**:
1. Busca `TenantPaymentSettings` do tenant
2. Resolve provider apropriado (`AsaasProvider` ou `ManualProvider`)
3. Cria pagamento no provider
4. Salva cobrança no banco + chargeService
5. Retorna resultado com link de pagamento

---

### 3. `getPaymentProvider(config)`

**Responsabilidade**: Factory de providers.

```typescript
const provider = getPaymentProvider({
  chargeMode: 'gateway', // ou 'manual'
  gatewayName: 'asaas',
  manualPaymentLinkDefault: 'https://...'
});

// Provider implementa interface
interface PaymentProvider {
  createPayment(data: CreatePaymentData): Promise<CreatePaymentResult>;
  getPaymentStatus(id: string): Promise<PaymentStatusResult>;
  cancelPayment(id: string): Promise<void>;
}
```

---

### 4. `tenantPaymentSettingsService`

**Responsabilidade**: CRUD de configurações por tenant.

```typescript
// Salvar configuração
const result = await tenantPaymentSettingsService.save({
  tenantId: 'tenant-123',
  chargeMode: 'gateway', // ou 'manual'
  gatewayName: 'asaas',
  apiKey: 'xxx', // Criptografada ao salvar
  manualPaymentLinkDefault: 'https://...'
});

// Buscar configuração
const settings = await tenantPaymentSettingsService
  .getByTenantId('tenant-123');

// Estrutura retornada
interface TenantPaymentSettings {
  id: string;
  tenant_id: string;
  charge_mode: 'gateway' | 'manual';
  gateway_name: string | null;
  encrypted_api_key: string | null; // Nunca descriptografada no frontend
  manual_payment_link_default: string | null;
  created_at: string;
  updated_at: string;
}
```

---

### 5. `webhookService`

**Responsabilidade**: Processar webhooks do Asaas.

```typescript
// Webhook POST handler chama
const result = await webhookService.processAsaasWebhook({
  event: 'CHARGE-PAID',
  payment: {
    id: 'asaas-payment-123',
    status: 'CONFIRMED',
    value: 100.00,
    // ...
  },
  charge: {
    id: 'asaas-charge-123',
    status: 'CONFIRMED',
    // ...
  }
});
```

**Eventos Suportados**:
- `CHARGE-PAID` → status: 'paid'
- `CHARGE-OVERDUE` → status: 'overdue'
- `CHARGE-EXPIRED` → status: 'cancelled'
- `CHARGE-REFUNDED` → status: 'cancelled'

**Features**:
- ✅ Idempotência (não processa mesmo evento 2x)
- ✅ Validação de assinatura (HMAC - em progresso)
- ✅ Atualiza status de cobrança no banco
- ✅ Logging completo

---

### 6. `webhookManagementService`

**Responsabilidade**: Registrar e gerenciar webhooks no Asaas.

```typescript
// Registrar webhook
await webhookManagementService.registerWebhook(asaasApiKey);

// Testar webhook
await webhookManagementService.testWebhook();

// Verificar status
await webhookManagementService.checkWebhookStatus(asaasApiKey);

// Remover webhook
await webhookManagementService.removeWebhook(asaasApiKey, webhookId);
```

---

### 7. `encryptionService`

**Responsabilidade**: Criptografia segura de dados sensíveis (API Keys).

```typescript
// Criptografar (no frontend/backend)
const encrypted = EncryptionService.encrypt(
  'chave-da-api-do-asaas',
  'tenant-123' // salt adicional
);

// Descriptografar (apenas backend)
const plainKey = EncryptionService.decrypt(encrypted, 'tenant-123');

// Verificar se está criptografado
const isEncrypted = EncryptionService.isEncrypted(value);
```

**Algoritmo**: AES-256-CBC com IV aleatório + HMAC-SHA256

---

## 📊 Providers

### AsaasProvider

**Como funciona**:
1. Chama Edge Function `create-charge` do Supabase
2. Edge Function comunica com API do Asaas
3. Retorna dados de pagamento (PIX, Boleto, Link)

**Métodos**:
```typescript
async createPayment(data: CreatePaymentData): Promise<CreatePaymentResult>
// Cria cobrança no Asaas
// Retorna: { id, externalId, paymentLink, pixQrCode, pixCode, barcode }

async getPaymentStatus(id: string): Promise<PaymentStatusResult>
// Verifica status do pagamento (pendente, recebido, vencido, etc)

async cancelPayment(id: string): Promise<void>
// Cancela cobrança
```

### ManualProvider

**Como funciona**:
1. Usa link configurado no `TenantPaymentSettings`
2. Não integra com gateway
3. Ideal para pagamentos fora do sistema (PIX manual, TED, etc)

**Métodos**:
```typescript
async createPayment(data: CreatePaymentData): Promise<CreatePaymentResult>
// Retorna link salvo na config
// Resultado: { id, externalId, paymentLink }

async getPaymentStatus(id: string): Promise<PaymentStatusResult>
// Status sempre "pending" (cliente confirma manualmente)

async cancelPayment(id: string): Promise<void>
// Log apenas
```

---

## 📱 Interface (ChargePage)

### 1. NewChargeModal

Automaticamente decente qual fluxo usar:
- **Com config Asaas**: Cria cobrança com PIX/Boleto/Link
- **Com config Manual**: Cria cobrança com link padrão
- **Sem config**: Usa fluxo legado (paymentGatewayService)

### 2. ChargeActionsMenu

Nova opção: **"Ver Links de Pagamento"**
- Mostra PIX QR Code (imagem escaneável)
- Mostra código PIX (cópia e cola)
- Mostra boleto (código de barras)
- Link de pagamento genérico
- Opções de compartilhar (WhatsApp, Email)

### 3. PaymentLinksDrawer

Drawer elegante com:
- Dados da cobrança
- Visualização de todos os links
- Botões de copiar
- Ações de compartilhamento integradas

---

## 🔐 Segurança

### API Keys
- ✅ Criptografadas ao salvar (AES-256)
- ✅ Nunca retornadas descriptografadas ao frontend
- ✅ Backend sempre descriptografa para usar

### Webhooks
- ✅ Validação de assinatura HMAC (em implementação)
- ✅ Idempotência garantida
- ✅ Logging auditável

### Dados Sensíveis
- CPF/CNPJ: Armazenados no banco
- Email/Telefone: Visíveis na UI (conforme esperado)
- API Keys: Criptografadas (ver acima)

---

## 🔄 Fluxos Completos

### Fluxo 1: Criar Cobrança (Nova)

```
1. Usuário clica "Nova Cobrança"
2. Preenche formulário
3. Clica "Salvar como Rascunho" ou "Criar e Enviar"
   ↓
chargeCreationService.createChargeWithFlexibleFlow()
   ├─ Lê TenantPaymentSettings
   │
   ├─ Config Asaas?
   │  └─ createChargeV2() → AsaasProvider.createPayment()
   │      ├─ Chama Edge Function create-charge
   │      ├─ Retorna PIX/Boleto/Link
   │      └─ Salva cobrança com paymentDetails
   │
   └─ Config Manual?
      └─ createChargeV2() → ManualProvider.createPayment()
          ├─ Usa link da config
          └─ Salva cobrança com link padrão
   
4. Retorna ID da cobrança
5. Atualiza UI (ChargePage)
6. Abre drawer de links de pagamento (opcional)
```

### Fluxo 2: Webhook de Pagamento

```
1. Cliente paga (PIX, Boleto, etc)
2. Asaas detecta pagamento
3. POST para /api/webhooks/payments/asaas
   ↓
webhookService.processAsaasWebhook()
   ├─ Valida payload
   ├─ Verifica idempotência
   ├─ Mapeia evento para status interno
   ├─ Busca cobrança por ID externo
   └─ Atualiza status no banco
        (draft → paid, scheduled → paid, etc)
   
4. Retorna 200 OK ao Asaas
5. ChargePage se recarrega / atualização em tempo real
6. Status muda para "Paga" automaticamente
```

### Fluxo 3: Visualizar Links de Pagamento

```
1. Usuário clica "Ver Links de Pagamento" na linha
   ↓
ChargeActionsMenu → onViewPaymentLinks
   ↓
ChargePage abre PaymentLinksDrawer
   ↓
PaymentLinksDrawer extrai paymentDetails da cobrança
   ├─ charge.paymentDetails.pixQrCode → Mostra imagem
   ├─ charge.paymentDetails.pixCode → Cópia e cola
   ├─ charge.paymentDetails.boletoLine → Código de barras
   └─ charge.paymentDetails.paymentLink → Link genérico
   
2. Usuário vê tudo de uma vez
3. Pode copiar ou compartilhar
```

---

## 🚀 Próximas Fases

### v2.1 (Recomendado)
- [ ] Validação de assinatura de webhook (HMAC)
- [ ] Suporte a novos gateways (Stripe, PagSeguro)
- [ ] Webhook retry automático
- [ ] Reconciliação de pagamentos

### v2.2
- [ ] Dashboard de analytics de pagamentos
- [ ] Exportação de relatórios
- [ ] Suporte a SMS para notificação de links
- [ ] Integração com contabilidade

### v2.3
- [ ] Suporte a parcelamento
- [ ] Planos recorrentes
- [ ] Splitting de pagamentos
- [ ] Dispute/Chargeback handling

---

## 📝 Banco de Dados

### Tabela: tenant_payment_settings

```sql
CREATE TABLE tenant_payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL UNIQUE,
  charge_mode VARCHAR(20) NOT NULL DEFAULT 'gateway',
  gateway_name VARCHAR(50) DEFAULT 'asaas',
  encrypted_api_key TEXT,
  manual_payment_link_default TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenant_payment_settings_tenant_id
ON tenant_payment_settings(tenant_id);
```

**Campos**:
- `charge_mode`: Define comportamento ('gateway' = integrado, 'manual' = link só)
- `gateway_name`: Qual gateway usar ('asaas' inicialmente)
- `encrypted_api_key`: API Key do gateway (CRIPTOGRAFADA)
- `manual_payment_link_default`: Link padrão para modo manual

---

## 🔗 Endpoints de Webhook

### POST /api/webhooks/payments/asaas

**Recebe eventos do Asaas**:

```json
{
  "event": "CHARGE-PAID",
  "payment": {
    "id": "asaas-payment-123",
    "status": "CONFIRMED",
    "value": 100.00,
    "dateTime": "2026-03-27T14:30:00Z"
  },
  "charge": {
    "id": "asaas-charge-123",
    "status": "CONFIRMED"
  }
}
```

**Resposta**:
```json
{
  "received": true,
  "message": "Webhook de CHARGE-PAID processado com sucesso",
  "eventId": "asaas-payment-123"
}
```

---

## 📈 Monitoramento

### Logs Importantes

```typescript
// Criação de cobrança
'[ChargeCreationService] Iniciando criação de cobrança para tenant: tenant-123'
'[ChargeCreationService] Usando novo fluxo (createChargeV2)'
'[AsaasProvider] Criação de cobrança bem-sucedida: ID_EXTERNO'

// Webhook
'[WebhookService] Processando webhook Asaas: CHARGE-PAID'
'[WebhookService] Cobrança tenant-123 atualizada para status paid'

// Encriptação
'[TenantPaymentSettingsService] Api Key criptografada com sucesso'
'[EncryptionService] Falha ao criptografar (logs de erro)'
```

---

## ✅ Checklist de Implementação

- ✅ Arquitetura de providers (Asaas + Manual)
- ✅ Serviço de configuração por tenant
- ✅ Criptografia de API Key (AES-256)
- ✅ createChargeV2 funcional
- ✅ Webhook de pagamento
- ✅ Flexibilidade no fluxo de criação de cobrança
- ✅ UI para visualizar links de pagamento
- ⏳ Validação HMAC de webhooks
- ⏳ Suporte a novos gateways
- ⏳ Analytics de pagamentos

---

## 📞 Suporte

Para dúvidas ou implementação de novos gateways, consulte:
- Documentação Asaas: https://docs.asaas.com
- Tipos TypeScript: `src/types/index.ts`
- Serviços: `src/services/payments/`

---

**Última atualização**: 27/03/2026  
**Versão da documentação**: 2.0
