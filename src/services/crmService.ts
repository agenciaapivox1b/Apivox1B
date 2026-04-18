// =====================================================
// CRM SERVICE - APIVOX (ATUALIZADO)
// 
// Serviço completo para Oportunidades e Follow-up
// Conecta: Conversas → Oportunidades → Funil
// =====================================================

import { supabase } from '@/lib/supabaseClient';
import { TenantService } from '@/services/tenantService';
import { calendarService } from '@/services/calendarService';

// =====================================================
// TIPOS
// =====================================================

export type OpportunityStatus = 'descoberta' | 'proposta' | 'negociacao' | 'fechado' | 'perdido';
export type OpportunityPriority = 'low' | 'medium' | 'high';
export type ActivityType = 
  | 'call' 
  | 'meeting' 
  | 'email' 
  | 'whatsapp' 
  | 'note' 
  | 'task'
  | 'proposal_sent'
  | 'proposal_viewed'
  | 'stage_change'
  | 'status_change';

export interface Opportunity {
  id: string;
  tenant_id: string;
  name: string;
  contact_id?: string;
  contact_info?: string; // legado - manter para compatibilidade
  conversation_id?: string;
  description?: string;
  amount: number;
  status: OpportunityStatus;
  probability: number;
  origin?: string;
  type: string;
  priority: OpportunityPriority;
  assigned_to?: string;
  expected_close_date?: string;
  source?: string;
  lost_reason?: string;
  linked_charge_id?: string;
  closed_at?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  
  // Campos enriquecidos (via join)
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  assigned_to_email?: string;
  conversation_last_message?: string;
}

export interface CreateOpportunityData {
  name: string;
  contact_id?: string;
  conversation_id?: string;
  description?: string;
  amount?: number;
  status?: OpportunityStatus;
  priority?: OpportunityPriority;
  assigned_to?: string;
  expected_close_date?: string;
  source?: string;
  metadata?: any;
}

export interface UpdateOpportunityData {
  name?: string;
  contact_id?: string;
  conversation_id?: string;
  description?: string;
  amount?: number;
  status?: OpportunityStatus;
  priority?: OpportunityPriority;
  assigned_to?: string;
  expected_close_date?: string;
  lost_reason?: string;
  metadata?: any;
}

export interface OpportunityActivity {
  id: string;
  tenant_id: string;
  opportunity_id: string;
  contact_id?: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  scheduled_at?: string;
  completed_at?: string;
  status: 'pending' | 'completed' | 'cancelled';
  metadata?: any;
  created_by?: string;
  created_by_email?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateActivityData {
  opportunity_id: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  scheduled_at?: string;
  contact_id?: string;
  metadata?: any;
}

// =====================================================
// TIPOS DE FOLLOW-UP (Sistema de Ações/Tarefas)
// =====================================================

export type FollowUpStatus = 'pending' | 'done' | 'overdue' | 'canceled';
export type FollowUpSource = 'manual' | 'automated' | 'ai_suggested';

export interface FollowUp {
  id: string;
  opportunity_id: string;
  tenant_id: string;
  action: string; // Ação curta: "Enviar proposta", "Ligar cliente"
  description?: string;
  due_date: string; // Data/hora ISO
  status: FollowUpStatus;
  source?: FollowUpSource; // Origem: manual, automated, ai_suggested
  created_by?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Campos para automação futura (n8n + IA)
  automation_config_id?: string; // Referência à configuração de automação
  recommended_message?: string; // Mensagem recomendada pela IA
  ai_context?: Record<string, any>; // Contexto adicional para processamento por IA
}

export interface CreateFollowUpData {
  opportunity_id: string;
  action: string;
  description?: string;
  due_date: string; // ISO string
}

export interface UpdateFollowUpData {
  action?: string;
  description?: string;
  due_date?: string;
  status?: FollowUpStatus;
}

export interface PipelineStage {
  id: OpportunityStatus;
  label: string;
  color: string;
  description: string;
  order: number;
}

// =====================================================
// CONSTANTES
// =====================================================

export const PIPELINE_STAGES: PipelineStage[] = [
  { 
    id: 'descoberta', 
    label: 'Descoberta', 
    color: 'bg-blue-500',
    description: 'Lead inicial, primeiro contato',
    order: 1
  },
  { 
    id: 'proposta', 
    label: 'Proposta', 
    color: 'bg-yellow-500',
    description: 'Proposta enviada, aguardando resposta',
    order: 2
  },
  { 
    id: 'negociacao', 
    label: 'Negociação', 
    color: 'bg-orange-500',
    description: 'Negociando valores e condições',
    order: 3
  },
  { 
    id: 'fechado', 
    label: 'Fechado (Ganho)', 
    color: 'bg-green-500',
    description: 'Negócio fechado com sucesso',
    order: 4
  },
  { 
    id: 'perdido', 
    label: 'Perdido', 
    color: 'bg-red-500',
    description: 'Negócio não prosseguiu',
    order: 5
  }
];

// =====================================================
// SERVIÇO DE OPORTUNIDADES
// =====================================================

export const opportunityService = {
  
  /**
   * Listar todas as oportunidades do tenant
   */
  async list(): Promise<Opportunity[]> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data as Opportunity[];
  },

  /**
   * Listar oportunidades por estágio (para o funil)
   */
  async listByStage(stage: OpportunityStatus): Promise<Opportunity[]> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', stage)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data as Opportunity[];
  },

  /**
   * Buscar oportunidade por ID (com dados enriquecidos)
   */
  async getById(id: string): Promise<Opportunity> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Oportunidade não encontrada');
    
    return data as Opportunity;
  },

  /**
   * Criar nova oportunidade
   */
  async create(data: CreateOpportunityData): Promise<Opportunity> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data: opportunity, error } = await supabase
      .from('opportunities')
      .insert({
        ...data,
        tenant_id: tenantId,
        status: data.status || 'descoberta',
        priority: data.priority || 'medium',
        amount: data.amount || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Registrar atividade de criação
    await this.addActivity({
      opportunity_id: opportunity.id,
      activity_type: 'note',
      title: 'Oportunidade criada',
      description: data.description || 'Oportunidade criada manualmente',
    });
    
    return opportunity as Opportunity;
  },

  /**
   * Criar oportunidade a partir de uma conversa
   */
  async createFromConversation(
    conversationId: string, 
    data: Partial<CreateOpportunityData>
  ): Promise<Opportunity> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    // Buscar dados da conversa
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('contact_id')
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (convError || !conversation) {
      throw new Error('Conversa não encontrada');
    }
    
    // Buscar nome do contato
    const { data: contact } = await supabase
      .from('contacts')
      .select('name')
      .eq('id', conversation.contact_id)
      .single();
    
    // Criar oportunidade
    const opportunityData: CreateOpportunityData = {
      name: data.name || `Oportunidade - ${contact?.name || 'Sem nome'}`,
      contact_id: conversation.contact_id,
      conversation_id: conversationId,
      description: data.description,
      amount: data.amount || 0,
      status: 'descoberta',
      priority: data.priority || 'medium',
      assigned_to: data.assigned_to,
      source: 'whatsapp_conversation',
    };
    
    return this.create(opportunityData);
  },

  /**
   * Atualizar oportunidade
   */
  async update(id: string, data: UpdateOpportunityData): Promise<Opportunity> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data: opportunity, error } = await supabase
      .from('opportunities')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    
    if (error) throw error;
    
    return opportunity as Opportunity;
  },

  /**
   * Atualizar estágio da oportunidade (com log automático)
   */
  async updateStatus(id: string, status: OpportunityStatus, notes?: string): Promise<void> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { error } = await supabase
      .from('opportunities')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    
    if (error) throw error;
    
    // Registrar atividade de mudança de estágio
    await this.addActivity({
      opportunity_id: id,
      activity_type: 'stage_change',
      title: `Mudança de estágio para ${PIPELINE_STAGES.find(s => s.id === status)?.label}`,
      description: notes,
    });
  },

  /**
   * Mover oportunidade entre estágios (usado no drag & drop)
   */
  async moveToStage(id: string, newStage: OpportunityStatus): Promise<void> {
    return this.updateStatus(id, newStage);
  },

  /**
   * Deletar oportunidade
   */
  async delete(id: string): Promise<void> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    
    if (error) throw error;
  },

  /**
   * Buscar oportunidades por contato
   */
  async getByContact(contactId: string): Promise<Opportunity[]> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Opportunity[];
  },

  /**
   * Buscar oportunidade por conversa
   */
  async getByConversation(conversationId: string): Promise<Opportunity | null> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('conversation_id', conversationId)
      .maybeSingle();
    
    if (error) throw error;
    return data as Opportunity | null;
  },

  /**
   * Adicionar atividade à oportunidade
   */
  async addActivity(data: CreateActivityData): Promise<OpportunityActivity> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data: activity, error } = await supabase
      .from('opportunity_activities')
      .insert({
        ...data,
        tenant_id: tenantId,
        status: data.scheduled_at ? 'pending' : 'completed',
        completed_at: data.scheduled_at ? null : new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return activity as OpportunityActivity;
  },

  /**
   * Listar atividades da oportunidade
   */
  async listActivities(opportunityId: string): Promise<OpportunityActivity[]> {
    const { data, error } = await supabase
      .from('opportunity_activities')
      .select(`
        *,
        created_by:auth.users(email)
      `)
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map((act: any) => ({
      ...act,
      created_by_email: act.created_by?.email,
    })) as OpportunityActivity[];
  },

  /**
   * Completar atividade pendente
   */
  async completeActivity(activityId: string): Promise<void> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { error } = await supabase
      .from('opportunity_activities')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', activityId)
      .eq('tenant_id', tenantId);
    
    if (error) throw error;
  },

  /**
   * Obter resumo do funil (para dashboard)
   */
  async getPipelineSummary(): Promise<{ stage: string; total: number; value: number }[]> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data, error } = await supabase
      .from('pipeline_summary')
      .select('*')
      .eq('tenant_id', tenantId);
    
    if (error) throw error;
    
    return (data || []).map((row: any) => ({
      stage: row.stage,
      total: row.total_opportunities,
      value: row.total_value,
    }));
  },

  /**
   * Obter histórico de mudanças de estágio
   */
  async getStageHistory(opportunityId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('opportunity_stage_history')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('moved_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
};

// =====================================================
// SERVIÇO DE FOLLOW-UP (Sistema de Ações/Tarefas)
// Separado do opportunityService para manter clareza
// =====================================================

export const followUpService = {
  /**
   * Criar novo follow-up para uma oportunidade
   */
  async create(data: CreateFollowUpData): Promise<FollowUp> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data: followUp, error } = await supabase
      .from('opportunity_follow_ups')
      .insert([{
        opportunity_id: data.opportunity_id,
        tenant_id: tenantId,
        action: data.action,
        description: data.description,
        due_date: data.due_date,
        status: 'pending',
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Sincronizar com calendário
    try {
      await calendarService.syncFollowUp({
        id: followUp.id,
        action: followUp.action,
        description: followUp.description,
        due_date: followUp.due_date,
        status: followUp.status,
        opportunity_id: followUp.opportunity_id,
        tenant_id: tenantId
      });
    } catch (syncError) {
      console.warn('[crmService] Erro ao sincronizar com calendário:', syncError);
      // Não bloquear a operação principal se a sincronização falhar
    }
    
    return followUp as FollowUp;
  },

  /**
   * Listar todos os follow-ups de uma oportunidade
   */
  async listByOpportunity(opportunityId: string): Promise<FollowUp[]> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data, error } = await supabase
      .from('opportunity_follow_ups')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    return (data || []) as FollowUp[];
  },

  /**
   * Buscar follow-up por ID
   */
  async getById(id: string): Promise<FollowUp> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data, error } = await supabase
      .from('opportunity_follow_ups')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Follow-up não encontrado');
    
    return data as FollowUp;
  },

  /**
   * Atualizar status do follow-up
   */
  async updateStatus(id: string, status: FollowUpStatus): Promise<void> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };
    
    // Se marcar como done, registrar data de conclusão
    if (status === 'done') {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }
    
    const { error } = await supabase
      .from('opportunity_follow_ups')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId);
    
    if (error) throw error;
    
    // Sincronizar com calendário
    try {
      const followUp = await this.getById(id);
      await calendarService.syncFollowUp({
        id: followUp.id,
        action: followUp.action,
        description: followUp.description,
        due_date: followUp.due_date,
        status,
        opportunity_id: followUp.opportunity_id,
        tenant_id: tenantId
      });
    } catch (syncError) {
      console.warn('[crmService] Erro ao sincronizar status com calendário:', syncError);
    }
  },

  /**
   * Reagendar follow-up (atualizar data)
   */
  async reschedule(id: string, newDueDate: string): Promise<void> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { error } = await supabase
      .from('opportunity_follow_ups')
      .update({ 
        due_date: newDueDate,
        status: 'pending', // Resetar status ao reagendar
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    
    if (error) throw error;
    
    // Sincronizar com calendário
    try {
      const followUp = await this.getById(id);
      await calendarService.syncFollowUp({
        id: followUp.id,
        action: followUp.action,
        description: followUp.description,
        due_date: newDueDate,
        status: 'pending',
        opportunity_id: followUp.opportunity_id,
        tenant_id: tenantId
      });
    } catch (syncError) {
      console.warn('[crmService] Erro ao sincronizar reagendamento com calendário:', syncError);
    }
  },

  /**
   * Atualizar follow-up completo
   */
  async update(id: string, data: UpdateFollowUpData): Promise<FollowUp> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data: followUp, error } = await supabase
      .from('opportunity_follow_ups')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Sincronizar com calendário
    try {
      await calendarService.syncFollowUp({
        id: followUp.id,
        action: followUp.action,
        description: followUp.description,
        due_date: followUp.due_date,
        status: followUp.status,
        opportunity_id: followUp.opportunity_id,
        tenant_id: tenantId
      });
    } catch (syncError) {
      console.warn('[crmService] Erro ao sincronizar atualização com calendário:', syncError);
    }
    
    return followUp as FollowUp;
  },

  /**
   * Deletar follow-up
   */
  async delete(id: string): Promise<void> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { error } = await supabase
      .from('opportunity_follow_ups')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    
    if (error) throw error;
    
    // Sincronizar exclusão com calendário
    try {
      await calendarService.deleteFollowUpEvent(id, tenantId);
    } catch (syncError) {
      console.warn('[crmService] Erro ao sincronizar exclusão com calendário:', syncError);
    }
  },

  /**
   * Verificar follow-ups atrasados
   * Útil para atualizar status automaticamente
   */
  async checkOverdue(opportunityId: string): Promise<FollowUp[]> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data, error } = await supabase
      .from('opportunity_follow_ups')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .eq('tenant_id', tenantId)
      .eq('status', 'overdue')
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    return (data || []) as FollowUp[];
  },

  /**
   * Buscar próximo follow-up pendente (o mais próximo da data)
   */
  async getNextPending(opportunityId: string): Promise<FollowUp | null> {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data, error } = await supabase
      .from('opportunity_follow_ups')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data as FollowUp | null;
  }
};

export default opportunityService;
