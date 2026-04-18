export interface Client {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

export interface Bot {
  id: string;
  client_id: string;
  name: string;
  status: 'active' | 'paused' | 'draft';
  is_active: boolean;
  prompt: string;
  webhook_url?: string;
  fallback_message: string;
  business_hours: string;
  created_at: string;
  updated_at: string;
  messages_count: number;
  conversations_count: number;
}

export interface Conversation {
  id: string;
  bot_id: string;
  bot_name: string;
  contact_name: string;
  contact_phone: string;
  status: 'active' | 'waiting_human' | 'resolved' | 'vip';
  tags: string[];
  last_message: string;
  last_message_at: string;
  created_at: string;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'bot' | 'user' | 'agent';
  content: string;
  timestamp: string;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error';
  enabled: boolean;
  last_sync?: string;
}

export interface KnowledgeItem {
  id: string;
  category: 'faq' | 'rules' | 'products' | 'policies';
  title: string;
  content: string;
  updated_at: string;
}

export interface MetricCard {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
}

export interface ActivityItem {
  id: string;
  type: 'conversation' | 'agent' | 'automation';
  description: string;
  timestamp: string;
}

/**
 * ENUM: Geração de Cobrança
 * Modelo A: Sistema define o método de pagamento
 * Modelo B: Cliente escolhe o método de pagamento
 */
export type ChargeGenerationMode = 'predefined' | 'client_choice';

/**
 * INTERFACE: Detalhes da Forma de Pagamento
 * Dados reais da cobrança gerada (boleto, PIX, link, etc)
 */
export interface PaymentMethodDetails {
  method: 'pix' | 'boleto' | 'credit_card' | 'transfer' | 'cash' | 'external' | 'manual' | 'pending';
  provider?: 'asaas' | 'mercadopago' | 'stripe' | 'manual' | 'external' | 'other';
  externalId?: string;
  reference?: string;
  // PIX
  pixCode?: string;
  pixQrCode?: string;
  // Boleto
  boletoLine?: string;
  boletoBarcode?: string;
  // Links e códigos externos (ERP, banco, etc)
  paymentLink?: string;
  externalLink?: string;
  externalCode?: string;
  // Cartão
  cardLastFour?: string;
  // Transferência
  bankAccountNumber?: string;
  bankRoutingNumber?: string;
  generatedAt?: string;
  expiresAt?: string;
}

/**
 * INTERFACE: Ação Agendada Automática
 * Próximas ações que serão executadas automaticamente
 */
export interface ScheduledAction {
  id: string;
  type: 'reminder_before' | 'reminder_on_due' | 'reminder_after' | 'notify_responsible' | 'mark_overdue';
  scheduledFor: string;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  description: string;
  channel?: 'whatsapp' | 'email' | 'internal';
  executedAt?: string;
  failureReason?: string;
}

/**
 * INTERFACE: Evento do Histórico Auditável
 * Cada ação importante gera um evento registrado
 * 
 * Event types:
 * - WhatsApp específicos: whatsapp_opened, whatsapp_sent_manual, whatsapp_api_sent
 * - E-mail específicos: email_sent, email_failed
 * - Gerais: created, edited, sent, resent, viewed, paid, overdue, cancelled, archived, automation_executed, error, payment_method_generated
 */
export interface ChargeHistoryEvent {
  id: string;
  timestamp: string;
  type: 'created' | 'edited' | 'sent' | 'resent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'archived' | 'automation_executed' | 'error' | 'payment_method_generated' | 'whatsapp_opened' | 'whatsapp_sent_manual' | 'whatsapp_api_sent' | 'email_sent' | 'email_failed';
  description: string;
  performedBy?: string;
  userType?: 'user' | 'automation' | 'system';
  changes?: Record<string, { from: any; to: any }>;
  channel?: 'whatsapp' | 'email' | 'internal';
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * INTERFACE: Template de Mensagem
 * Templates predefinidos para envios automáticos
 */
export interface ChargeTemplate {
  id: string;
  name: string;
  type: 'initial' | 'reminder_before' | 'reminder_on_due' | 'reminder_overdue' | 'payment_confirmed';
  channel: 'whatsapp' | 'email' | 'both';
  subject?: string;
  content: string;
  variables: string[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt?: string;
  example?: Record<string, string>;
}

/**
 * INTERFACE: Charge (Cobrança)
 * Representa uma cobrança / fatura no sistema
 * ENTERPRISE: Tipo, status, automação, histórico completo
 */
export interface Charge {
  id: string;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientCpf?: string; // CPF do cliente para gateway
  
  description: string;
  value: number;
  dueDate: string;
  
  status: 'draft' | 'scheduled' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'archived';
  statusUpdatedAt?: string;
  
  // Forma de Pagamento
  generationMode?: ChargeGenerationMode;
  paymentMethod?: 'pix' | 'boleto' | 'credit_card' | 'transfer' | 'cash' | 'external' | 'manual' | 'pending';
  paymentDetails?: PaymentMethodDetails;
  
  // Recorrência
  recurrence?: 'none' | 'monthly' | 'quarterly' | 'yearly';
  recurrenceEndDate?: string;
  parentChargeId?: string;
  
  // Canais de Envio
  sendChannel?: 'whatsapp' | 'email' | 'both';
  lastSentAt?: string;
  lastSentChannel?: 'whatsapp' | 'email';
  viewedAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  archivedAt?: string;
  
  // Responsáveis e Notas
  responsible?: string;
  observation?: string;
  internalNotes?: string;
  tags?: string[];
  
  // Origem
  origin?: 'lead' | 'client' | 'manual' | 'integration' | 'external';
  linkedLeadId?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt?: string;
  
  // Automação
  automationEnabled?: boolean;
  automationConfig?: ChargeAutomation;
  scheduledActions?: ScheduledAction[];
  
  // Template de mensagem utilizado
  templateId?: string;
  lastTemplateUsed?: string;
  
  // Histórico Completo
  history?: ChargeHistoryEvent[];
  sendHistory?: ChargeSendLog[];
  
  // Gateway Integration
  gatewayChargeId?: string;
  paymentLink?: string;
  pixCode?: string;
  barcode?: string;
  qrCode?: string;
  
  // Auditoria
  archived?: boolean;
}

export interface ChargeSendLog {
  id: string;
  chargeId: string;
  channel: 'whatsapp' | 'email';
  sentAt: string;
  status: 'sent' | 'failed' | 'viewed';
  recipientPhone?: string;
  recipientEmail?: string;
  failureReason?: string;
  attemptNumber: number;
}

export interface ChargeAutomation {
  id: string;
  chargeId: string;
  
  // Master control
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
  
  // Lembretes
  sendBeforeDueDate: boolean;
  daysBefore: number;
  sendOnDueDate: boolean;
  
  // Reenvio após atraso
  sendAfterDueDate: boolean;
  daysAfter: number;
  maxResendAttempts?: number;
  resendAttemptCount?: number;
  
  // Notificações internas
  notifyResponsible: boolean;
  notifyOnOverdue: boolean;
  
  // Configurações
  preferredChannel: 'whatsapp' | 'email' | 'both';
  templateId?: string;
  
  // Controle
  autoMarkAsPaid?: boolean;
  stopOnPayment?: boolean;
  pauseUntilDate?: string;
  
  // Auditoria
  lastExecutedAt?: string;
  nextScheduledFor?: string;
  executionLog?: ScheduledAction[];
}

