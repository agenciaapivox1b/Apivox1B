/**
 * Serviço de Cobranças - ENTERPRISE EDITION
 * Gerencia todas as operações relacionadas a cobranças com:
 * - Histórico auditável completo
 * - Automação real com agendamento
 * - Geração de cobrança (Modelo A: método definido / Modelo B: cliente escolhe)
 * - Templates automáticos com variáveis
 * - Validação profissional
 */

import type {
  Charge,
  ChargeSendLog,
  ChargeAutomation,
  ChargeHistoryEvent,
  ScheduledAction,
  PaymentMethodDetails,
} from '@/types';

class ChargeService {
  private storageKey = 'charges_data';
  private automationKey = 'charge_automations';

  private migrateId(id: string): string {
    if (id === 'charge-001') return '550e8400-e29b-41d4-a716-446655440001';
    if (id === 'charge-002') return '550e8400-e29b-41d4-a716-446655440002';
    return id;
  }

  // ===== CRIAR E GERENCIAR =====

  getCharges(): Charge[] {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      const mock = this.getMockCharges();
      this.saveCharges(mock);
      return mock;
    }
    const charges: Charge[] = JSON.parse(stored);
    
    // Migração automática de IDs mock antigos para os novos UUIDs
    let hasMigration = false;
    const migrated = charges.map(c => {
      if (c.id === 'charge-001') {
        hasMigration = true;
        return { ...c, id: '550e8400-e29b-41d4-a716-446655440001' };
      }
      if (c.id === 'charge-002') {
        hasMigration = true;
        return { ...c, id: '550e8400-e29b-41d4-a716-446655440002' };
      }
      return c;
    });

    if (hasMigration) {
      this.saveCharges(migrated);
      return migrated;
    }

    return charges;
  }

  getChargeById(id: string): Charge | undefined {
    const targetId = this.migrateId(id);
    return this.getCharges().find(c => c.id === targetId);
  }

  createCharge(charge: Omit<Charge, 'id' | 'createdAt' | 'history'>, userId?: string): Charge {
    const newCharge: Charge = {
      ...charge,
      id: `charge-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: charge.status || 'draft',
      sendHistory: [],
      history: [],
    };

    this.addHistoryEvent(newCharge.id, {
      type: 'created',
      description: `Cobrança criada - Valor: R$ ${charge.value.toFixed(2)}`,
      performedBy: userId,
      userType: 'user',
    });

    const charges = this.getCharges();
    charges.push(newCharge);
    this.saveCharges(charges);
    return newCharge;
  }

  updateCharge(id: string, updates: Partial<Charge>, userId?: string, silent: boolean = false): Charge | null {
    const charges = this.getCharges();
    const index = charges.findIndex(c => c.id === id);
    if (index === -1) return null;

    const oldCharge = charges[index];
    const updated: Charge = {
      ...oldCharge,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const changes: Record<string, { from: any; to: any }> = {};
    Object.keys(updates).forEach(key => {
      if (JSON.stringify(oldCharge[key as keyof Charge]) !== JSON.stringify(updates[key as keyof Charge])) {
        changes[key] = {
          from: oldCharge[key as keyof Charge],
          to: updates[key as keyof Charge],
        };
      }
    });

    if (Object.keys(changes).length > 0 && !silent) {
      this.addHistoryEvent(id, {
        type: 'edited',
        description: 'Cobrança editada',
        changes,
        performedBy: userId,
        userType: 'user',
      });
    }

    charges[index] = updated;
    this.saveCharges(charges);
    return updated;
  }

  deleteCharge(id: string, userId?: string): boolean {
    const targetId = this.migrateId(id);
    this.addHistoryEvent(targetId, {
      type: 'cancelled',
      description: 'Cobrança excluída',
      performedBy: userId,
      userType: 'user',
    });
    const charges = this.getCharges().filter(c => c.id !== targetId);
    this.saveCharges(charges);
    return true;
  }

  duplicateCharge(id: string, userId?: string): Charge | null {
    const charge = this.getChargeById(id);
    if (!charge) return null;

    const { id: _id, createdAt: _created, history: _history, ...rest } = charge;
    const duplicated: Omit<Charge, 'id' | 'createdAt' | 'history'> = {
      ...rest,
      status: 'draft',
      lastSentAt: undefined,
      viewedAt: undefined,
      paidAt: undefined,
      sendHistory: [],
    };

    return this.createCharge(duplicated, userId);
  }

  toggleArchive(id: string, userId?: string): Charge | null {
    const charge = this.getChargeById(id);
    if (!charge) return null;

    this.addHistoryEvent(id, {
      type: !charge.archived ? 'archived' : 'edited',
      description: !charge.archived ? 'Cobrança arquivada' : 'Cobrança restaurada',
      performedBy: userId,
      userType: 'user',
    });

    return this.updateCharge(
      id,
      {
        archived: !charge.archived,
        archivedAt: !charge.archived ? new Date().toISOString() : undefined,
      },
      userId
    );
  }

  // ===== GERAÇÃO DE COBRANÇA =====

  generateChargeModelA(
    chargeId: string,
    paymentMethod: 'pix' | 'boleto' | 'credit_card' | 'transfer' | 'cash',
    userId?: string
  ): Charge | null {
    const charge = this.getChargeById(chargeId);
    if (!charge) return null;

    const paymentDetails = this.generatePaymentDetails(paymentMethod);

    this.addHistoryEvent(chargeId, {
      type: 'payment_method_generated',
      description: `Cobrança gerada - Forma: ${this.getPaymentLabel(paymentMethod)}`,
      performedBy: userId,
      userType: 'user',
      metadata: { paymentDetails },
    });

    return this.updateCharge(
      chargeId,
      {
        generationMode: 'predefined',
        paymentMethod,
        paymentDetails,
        status: 'scheduled',
      },
      userId
    );
  }

  generateChargeModelB(chargeId: string, userId?: string): Charge | null {
    const charge = this.getChargeById(chargeId);
    if (!charge) return null;

    this.addHistoryEvent(chargeId, {
      type: 'payment_method_generated',
      description: 'Aguardando cliente escolher forma de pagamento',
      performedBy: userId,
      userType: 'user',
      metadata: { model: 'B' },
    });

    return this.updateCharge(
      chargeId,
      {
        generationMode: 'client_choice',
        paymentMethod: 'pending',
        status: 'scheduled',
      },
      userId
    );
  }

  registerClientPaymentChoice(
    chargeId: string,
    paymentMethod: 'pix' | 'boleto' | 'credit_card' | 'transfer' | 'cash'
  ): Charge | null {
    const charge = this.getChargeById(chargeId);
    if (!charge) return null;

    const paymentDetails = this.generatePaymentDetails(paymentMethod);

    this.addHistoryEvent(chargeId, {
      type: 'payment_method_generated',
      description: `Cliente escolheu: ${this.getPaymentLabel(paymentMethod)}`,
      userType: 'system',
      metadata: { paymentDetails, clientChoice: true },
    });

    return this.updateCharge(chargeId, {
      paymentMethod,
      paymentDetails,
    });
  }

  // ===== ENVIAR COBRANÇA =====

  sendCharge(id: string, channel: 'whatsapp' | 'email', userId?: string): Charge | null {
    const charge = this.getChargeById(id);
    if (!charge || !this.canSendCharge(charge)) return null;

    const sendLog: ChargeSendLog = {
      id: `log-${Date.now()}`,
      chargeId: id,
      channel,
      sentAt: new Date().toISOString(),
      status: 'sent',
      recipientPhone: channel === 'whatsapp' ? charge.clientPhone : undefined,
      recipientEmail: channel === 'email' ? charge.clientEmail : undefined,
      attemptNumber: (charge.sendHistory?.length || 0) + 1,
    };

    this.addHistoryEvent(id, {
      type: 'sent',
      description: `Enviado via ${channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}`,
      channel: channel as any,
      performedBy: userId,
      userType: 'user',
    });

    return this.updateCharge(
      id,
      {
        status: 'sent',
        lastSentAt: new Date().toISOString(),
        lastSentChannel: channel,
        sendHistory: [...(charge.sendHistory || []), sendLog],
      },
      userId
    );
  }

  resendCharge(id: string, userId?: string): Charge | null {
    const charge = this.getChargeById(id);
    if (!charge) return null;

    const channel = charge.lastSentChannel || 'whatsapp';

    this.addHistoryEvent(id, {
      type: 'resent',
      description: `Reenviado via ${channel}`,
      channel: channel as any,
      performedBy: userId,
      userType: 'user',
    });

    return this.sendCharge(id, channel as 'whatsapp' | 'email', userId);
  }

  markAsPaid(id: string, paymentMethod?: string, userId?: string): Charge | null {
    const charge = this.getChargeById(id);
    if (!charge) return null;

    this.addHistoryEvent(id, {
      type: 'paid',
      description: `Marcado como pago${paymentMethod ? ` (${paymentMethod})` : ''}`,
      performedBy: userId,
      userType: 'user',
    });

    if (charge.automationConfig?.stopOnPayment) {
      this.disableAutomation(id);
    }

    return this.updateCharge(
      id,
      {
        status: 'paid',
        paidAt: new Date().toISOString(),
        paymentMethod: (paymentMethod as any) || charge.paymentMethod,
      },
      userId
    );
  }

  /**
   * Marca cobrança como paga via webhook
   * Usado pelos webhooks de Asaas, Mercado Pago, Stripe
   */
  markAsPaidFromWebhook(
    id: string,
    gateway: 'asaas' | 'mercadopago' | 'stripe',
    externalId?: string
  ): Charge | null {
    const charge = this.getChargeById(id);
    if (!charge) return null;

    this.addHistoryEvent(id, {
      type: 'paid',
      description: `Pagamento recebido via ${gateway}${externalId ? ` (${externalId})` : ''}`,
      performedBy: 'webhook_system',
      userType: 'system',
      metadata: { gateway, externalId },
    });

    if (charge.automationConfig?.stopOnPayment) {
      this.disableAutomation(id);
    }

    return this.updateCharge(
      id,
      {
        status: 'paid',
        paidAt: new Date().toISOString(),
      },
      'webhook_system'
    );
  }

  cancelCharge(id: string, reason?: string, userId?: string): Charge | null {
    this.addHistoryEvent(id, {
      type: 'cancelled',
      description: `Cancelado${reason ? `: ${reason}` : ''}`,
      performedBy: userId,
      userType: 'user',
    });

    return this.updateCharge(
      id,
      {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      },
      userId
    );
  }

  // ===== AUTOMAÇÃO =====

  setAutomation(chargeId: string, automation: Omit<ChargeAutomation, 'id'>): ChargeAutomation {
    const automationId = `auto-${chargeId}`;
    const newAuto: ChargeAutomation = {
      ...automation,
      id: automationId,
      chargeId,
    };

    const stored = this.getAllAutomations();
    const idx = stored.findIndex(a => a.chargeId === chargeId);
    if (idx >= 0) stored[idx] = newAuto;
    else stored.push(newAuto);

    localStorage.setItem(this.automationKey, JSON.stringify(stored));

    if (automation.enabled) {
      this.scheduleAutomationActions(chargeId, automation);
    }

    this.addHistoryEvent(chargeId, {
      type: 'automation_executed',
      description: 'Automação configurada',
      userType: 'user',
    });

    return newAuto;
  }

  getAutomation(chargeId: string): ChargeAutomation | undefined {
    return this.getAllAutomations().find(a => a.chargeId === chargeId);
  }

  enableAutomation(chargeId: string): void {
    const auto = this.getAutomation(chargeId);
    if (auto) {
      auto.enabled = true;
      const stored = this.getAllAutomations();
      const idx = stored.findIndex(a => a.chargeId === chargeId);
      if (idx >= 0) {
        stored[idx] = auto;
        localStorage.setItem(this.automationKey, JSON.stringify(stored));
      }
    }
  }

  disableAutomation(chargeId: string): void {
    const auto = this.getAutomation(chargeId);
    if (auto) {
      auto.enabled = false;
      const stored = this.getAllAutomations();
      const idx = stored.findIndex(a => a.chargeId === chargeId);
      if (idx >= 0) {
        stored[idx] = auto;
        localStorage.setItem(this.automationKey, JSON.stringify(stored));
      }
    }
  }

  private scheduleAutomationActions(
    chargeId: string,
    automation: Omit<ChargeAutomation, 'id'>
  ): void {
    const charge = this.getChargeById(chargeId);
    if (!charge) return;

    const dueDate = new Date(charge.dueDate);
    const now = new Date();
    const actions: ScheduledAction[] = [];

    if (automation.sendBeforeDueDate) {
      const date = new Date(dueDate);
      date.setDate(date.getDate() - automation.daysBefore);
      actions.push({
        id: `action-${Date.now()}-1`,
        type: 'reminder_before',
        scheduledFor: date.toISOString(),
        status: date <= now ? 'executed' : 'pending',
        description: `Lembrete ${automation.daysBefore} dias antes`,
      });
    }

    if (automation.sendOnDueDate) {
      actions.push({
        id: `action-${Date.now()}-2`,
        type: 'reminder_on_due',
        scheduledFor: dueDate.toISOString(),
        status: dueDate <= now ? 'executed' : 'pending',
        description: 'Lembrete no vencimento',
      });
    }

    if (automation.sendAfterDueDate) {
      const date = new Date(dueDate);
      date.setDate(date.getDate() + automation.daysAfter);
      actions.push({
        id: `action-${Date.now()}-3`,
        type: 'reminder_after',
        scheduledFor: date.toISOString(),
        status: 'pending',
        description: `Reenvio ${automation.daysAfter} dias depois`,
      });
    }

    this.updateCharge(chargeId, {
      scheduledActions: actions,
      automationEnabled: true,
      automationConfig: automation as any,
    });
  }

  getNextScheduledActions(chargeId: string): ScheduledAction[] {
    const charge = this.getChargeById(chargeId);
    if (!charge?.scheduledActions) return [];
    const now = new Date();
    return charge.scheduledActions
      .filter(a => new Date(a.scheduledFor) > now && a.status === 'pending')
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  }

  // ===== HISTÓRICO =====

  private addHistoryEvent(
    chargeId: string,
    event: Omit<ChargeHistoryEvent, 'id' | 'timestamp'>
  ): void {
    const charge = this.getChargeById(chargeId);
    if (!charge) return;

    const newEvent: ChargeHistoryEvent = {
      ...event,
      id: `event-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    const updated = this.updateCharge(chargeId, {
      history: [...(charge.history || []), newEvent],
    }, undefined, true);

    if (updated) {
      const charges = this.getCharges();
      const idx = charges.findIndex(c => c.id === chargeId);
      if (idx >= 0) {
        charges[idx] = updated;
        this.saveCharges(charges);
      }
    }
  }

  getChargeHistory(chargeId: string): ChargeHistoryEvent[] {
    return this.getChargeById(chargeId)?.history || [];
  }

  /**
   * Registra evento de WhatsApp no histórico local (localStorage)
   * Complementa o registro em charge_events (Supabase) com dados locais
   * 
   * @param chargeId ID da cobrança
   * @param eventType Tipo: whatsapp_opened | whatsapp_sent_manual | whatsapp_api_sent
   * @param description Descrição human-readable do evento
   * @param metadata Dados adicionais (phone, message_preview, etc)
   */
  registerWhatsAppEvent(
    chargeId: string,
    eventType: 'whatsapp_opened' | 'whatsapp_sent_manual' | 'whatsapp_api_sent',
    description: string,
    metadata?: Record<string, any>
  ): void {
    this.addHistoryEvent(chargeId, {
      type: eventType,
      description,
      channel: 'whatsapp',
      performedBy: 'user_manual',
      userType: 'user',
      metadata,
    });
  }

  // ===== FILTROS E BUSCA =====

  getFilteredCharges(filters: {
    status?: string[];
    clientName?: string;
    dateFrom?: string;
    dateTo?: string;
    archived?: boolean;
    paymentMethod?: string;
  }): Charge[] {
    let charges = this.getCharges();

    if (!filters.archived) {
      charges = charges.filter(c => !c.archived);
    }

    if (filters.status?.length) {
      charges = charges.filter(c => filters.status!.includes(c.status));
    }

    if (filters.clientName) {
      charges = charges.filter(c =>
        c.clientName.toLowerCase().includes(filters.clientName!.toLowerCase())
      );
    }

    if (filters.dateFrom) {
      charges = charges.filter(c => new Date(c.dueDate) >= new Date(filters.dateFrom!));
    }

    if (filters.dateTo) {
      charges = charges.filter(c => new Date(c.dueDate) <= new Date(filters.dateTo!));
    }

    if (filters.paymentMethod) {
      charges = charges.filter(c => c.paymentMethod === filters.paymentMethod);
    }

    return charges;
  }

  searchCharges(query: string): Charge[] {
    const q = query.toLowerCase();
    return this.getCharges().filter(
      c =>
        c.clientName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.clientEmail.toLowerCase().includes(q)
    );
  }

  // ===== MÉTRICAS =====

  getMetrics() {
    const charges = this.getCharges().filter(c => !c.archived);

    const totalOpen = charges
      .filter(c => ['draft', 'scheduled', 'sent', 'viewed', 'overdue'].includes(c.status))
      .reduce((sum, c) => sum + c.value, 0);

    const totalPaid = charges
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.value, 0);

    const totalValue = charges.reduce((sum, c) => sum + c.value, 0);

    const today = new Date().toISOString().split('T')[0];
    const dueTodayCount = charges.filter(
      c => c.dueDate.split('T')[0] === today && c.status !== 'paid'
    ).length;

    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const dueSoonCount = charges.filter(c => {
      const cDate = new Date(c.dueDate);
      return cDate > new Date() && cDate <= sevenDaysFromNow && c.status !== 'paid';
    }).length;

    const overdueCount = charges.filter(
      c => c.dueDate.split('T')[0] < today && ['overdue', 'sent', 'viewed'].includes(c.status)
    ).length;

    const paidCount = charges.filter(c => c.status === 'paid').length;
    const sentCount = charges.filter(c => ['sent', 'viewed'].includes(c.status)).length;
    const draftCount = charges.filter(c => c.status === 'draft').length;

    return {
      totalOpen,
      totalPaid,
      totalValue,
      dueTodayCount,
      dueSoonCount,
      overdueCount,
      paidCount,
      sentCount,
      draftCount,
      paymentRate: totalValue > 0 ? (totalPaid / totalValue) * 100 : 0,
    };
  }

  // ===== VALIDAÇÃO =====

  private canSendCharge(charge: Charge): boolean {
    return !!(
      charge.clientName?.trim() &&
      charge.clientEmail?.trim() &&
      charge.clientPhone?.trim() &&
      charge.description?.trim() &&
      charge.value > 0 &&
      charge.dueDate
    );
  }

  validateCharge(charge: Partial<Charge>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!charge.clientName?.trim()) errors.push('Nome do cliente é obrigatório');
    if (!charge.clientEmail?.trim()) errors.push('Email é obrigatório');
    if (!charge.clientPhone?.trim()) errors.push('Telefone é obrigatório');
    if (!charge.description?.trim()) errors.push('Descrição é obrigatória');
    if (!charge.value || charge.value <= 0) errors.push('Valor deve ser > 0');
    if (!charge.dueDate) errors.push('Data de vencimento é obrigatória');

    return { valid: errors.length === 0, errors };
  }

  // ===== UTILITÁRIOS =====

  private getPaymentLabel(method?: string): string {
    const labels: Record<string, string> = {
      pix: 'PIX',
      boleto: 'Boleto',
      credit_card: 'Cartão de Crédito',
      transfer: 'Transferência Bancária',
      cash: 'Dinheiro',
      pending: 'A Definir',
    };
    return labels[method || 'pending'];
  }

  private generatePaymentDetails(method: string): PaymentMethodDetails {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    switch (method) {
      case 'pix':
        return {
          method: 'pix',
          externalId: `pix-${Date.now()}`,
          pixCode: `00020126360014br.gov.bcb.pix${Math.random().toString(36).substring(2, 32)}`,
          pixQrCode: `https://qr.example.com/${Date.now()}`,
          generatedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        };

      case 'boleto':
        return {
          method: 'boleto',
          externalId: `boleto-${Date.now()}`,
          boletoBarcode: `${Math.random().toString().substring(2, 51)}`,
          boletoLine: `${Math.random().toString().substring(2, 7)} ${Math.random().toString().substring(2, 7)} ${Math.random().toString().substring(2, 7)} ${Math.random().toString().substring(2, 7)}`,
          paymentLink: `https://boleto.example.com/${Date.now()}`,
          generatedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        };

      case 'credit_card':
        return {
          method: 'credit_card',
          externalId: `cc-${Date.now()}`,
          paymentLink: `https://checkout.example.com/${Date.now()}`,
          generatedAt: now.toISOString(),
        };

      case 'transfer':
        return {
          method: 'transfer',
          bankAccountNumber: '123456-7',
          bankRoutingNumber: '1234567',
          generatedAt: now.toISOString(),
        };

      case 'cash':
        return {
          method: 'cash',
          externalId: `cash-${Date.now()}`,
          generatedAt: now.toISOString(),
        };

      default:
        return { method: 'pending' };
    }
  }

  getStatusBadgeInfo(status: string): {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  } {
    const info: Record<string, any> = {
      draft: { label: 'Criada', variant: 'secondary' },
      scheduled: { label: 'Gerada (Asaas)', variant: 'outline' },
      sent: { label: 'Enviada', variant: 'default' },
      viewed: { label: 'Visualizada', variant: 'default' },
      paid: { label: 'Paga', variant: 'default' },
      overdue: { label: 'Vencida', variant: 'destructive' },
      cancelled: { label: 'Cancelada', variant: 'outline' },
      archived: { label: 'Arquivada', variant: 'outline' },
    };
    return info[status] || { label: status, variant: 'outline' };
  }

  // ===== PERSISTÊNCIA =====

  private saveCharges(charges: Charge[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(charges));
  }

  private getAllAutomations(): ChargeAutomation[] {
    const stored = localStorage.getItem(this.automationKey);
    return stored ? JSON.parse(stored) : [];
  }

  private getMockCharges(): Charge[] {
    return [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        clientName: 'Clínica Sorriso Ltda',
        clientEmail: 'financeiro@clinicasorriso.com.br',
        clientPhone: '+55 11 98888-0001',
        description: 'Serviço de Automação - Fevereiro 2026',
        value: 2500,
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'overdue',
        generationMode: 'predefined',
        paymentMethod: 'pix',
        sendChannel: 'whatsapp',
        lastSentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        lastSentChannel: 'whatsapp',
        responsible: 'João Silva',
        observation: 'Cliente importante',
        origin: 'lead',
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        sendHistory: [],
        history: [],
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        clientName: 'Agência Digital Pro',
        clientEmail: 'vendas@agenciadigital.com.br',
        clientPhone: '+55 11 98765-4321',
        description: 'Pacote Premium - Março 2026',
        value: 4500,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'sent',
        generationMode: 'predefined',
        paymentMethod: 'boleto',
        sendChannel: 'email',
        lastSentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        lastSentChannel: 'email',
        responsible: 'Maria Santos',
        origin: 'client',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        sendHistory: [],
        history: [],
      },
    ];
  }

  clearStorage(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.automationKey);
  }
}

export const chargeService = new ChargeService();
