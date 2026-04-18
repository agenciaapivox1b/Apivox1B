import { supabase } from '@/lib/supabaseClient';

export interface AutoFollowUp {
  id: string;
  contact_id: string;
  conversation_id?: string;
  opportunity_id?: string;
  type: 'no_response';
  status: 'pending' | 'done' | 'canceled';
  action: string;
  due_date: string;
  created_at: string;
  completed_at?: string;
  message?: string;
}

const HOURS_WITHOUT_RESPONSE = 24;

export class AutoFollowUpService {
  
  // Verificar conversas sem resposta e criar follow-ups
  async checkAndCreateFollowUps(): Promise<void> {
    try {
      console.log('[AutoFollowUp] Checking for conversations without response...');
      
      const tenantId = await this.getCurrentTenantId();
      if (!tenantId) {
        console.error('[AutoFollowUp] No tenant found');
        return;
      }

      // Buscar conversas ativas onde última mensagem foi do usuário/sistema
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          id,
          contact_id,
          last_message_at,
          last_message_by,
          contacts:contact_id (
            id,
            name,
            phone
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .not('last_message_by', 'eq', 'contact')
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('[AutoFollowUp] Error fetching conversations:', error);
        return;
      }

      if (!conversations?.length) {
        console.log('[AutoFollowUp] No conversations to check');
        return;
      }

      const now = new Date();
      const cutoffTime = new Date(now.getTime() - HOURS_WITHOUT_RESPONSE * 60 * 60 * 1000);

      for (const conversation of conversations) {
        const lastMessageTime = new Date(conversation.last_message_at);
        
        // Se passou mais de 24h sem resposta do cliente
        if (lastMessageTime < cutoffTime) {
          // Verificar se já existe follow-up pendente
          const hasPending = await this.hasPendingFollowUp(conversation.contact_id, tenantId);
          
          if (!hasPending) {
            await this.createFollowUp({
              contact_id: conversation.contact_id,
              conversation_id: conversation.id,
              tenant_id: tenantId,
              type: 'no_response',
              action: 'Cobrar resposta',
              message: 'Oi, conseguiu ver nossa última mensagem?'
            });
          }
        }
      }

      console.log('[AutoFollowUp] Check completed');
    } catch (error) {
      console.error('[AutoFollowUp] Error:', error);
    }
  }

  // Criar follow-up automático
  private async createFollowUp(data: {
    contact_id: string;
    conversation_id: string;
    tenant_id: string;
    type: string;
    action: string;
    message?: string;
  }): Promise<void> {
    try {
      const now = new Date();
      
      const { error } = await supabase
        .from('auto_follow_ups')
        .insert({
          contact_id: data.contact_id,
          conversation_id: data.conversation_id,
          type: data.type,
          action: data.action,
          status: 'pending',
          due_date: now.toISOString(),
          message: data.message,
          tenant_id: data.tenant_id
        });

      if (error) {
        console.error('[AutoFollowUp] Error creating follow-up:', error);
        return;
      }

      console.log('[AutoFollowUp] Created follow-up for contact:', data.contact_id);
    } catch (error) {
      console.error('[AutoFollowUp] Error creating follow-up:', error);
    }
  }

  // Verificar se já existe follow-up pendente
  private async hasPendingFollowUp(contactId: string, tenantId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('auto_follow_ups')
      .select('id')
      .eq('contact_id', contactId)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[AutoFollowUp] Error checking pending:', error);
    }

    return !!data;
  }

  // Buscar follow-ups pendentes para mostrar no funil
  async getPendingFollowUps(tenantId: string): Promise<AutoFollowUp[]> {
    const { data, error } = await supabase
      .from('auto_follow_ups')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('due_date', { ascending: true });

    if (error) {
      console.error('[AutoFollowUp] Error fetching follow-ups:', error);
      return [];
    }

    return data || [];
  }

  // Obter follow-up para um contato específico
  async getFollowUpForContact(contactId: string, tenantId: string): Promise<AutoFollowUp | null> {
    const { data, error } = await supabase
      .from('auto_follow_ups')
      .select('*')
      .eq('contact_id', contactId)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[AutoFollowUp] Error fetching follow-up:', error);
    }

    return data || null;
  }

  // Cancelar follow-up quando cliente responde
  async cancelFollowUpOnResponse(contactId: string, tenantId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('auto_follow_ups')
        .update({
          status: 'canceled',
          completed_at: new Date().toISOString()
        })
        .eq('contact_id', contactId)
        .eq('tenant_id', tenantId)
        .eq('status', 'pending');

      if (error) {
        console.error('[AutoFollowUp] Error canceling follow-up:', error);
        return;
      }

      console.log('[AutoFollowUp] Canceled follow-up for contact:', contactId);
    } catch (error) {
      console.error('[AutoFollowUp] Error canceling follow-up:', error);
    }
  }

  // Marcar follow-up como concluído
  async completeFollowUp(followUpId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('auto_follow_ups')
        .update({
          status: 'done',
          completed_at: new Date().toISOString()
        })
        .eq('id', followUpId);

      if (error) {
        console.error('[AutoFollowUp] Error completing follow-up:', error);
      }
    } catch (error) {
      console.error('[AutoFollowUp] Error completing follow-up:', error);
    }
  }

  // Obter cor do badge baseado na data
  getFollowUpBadgeColor(dueDate: string): string {
    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = (now.getTime() - due.getTime()) / (1000 * 60 * 60);

    if (diffHours > 24) return 'bg-red-500'; // Atrasado
    if (diffHours > 0) return 'bg-amber-500'; // Hoje
    return 'bg-green-500'; // Futuro
  }

  // Obter texto do badge
  getFollowUpBadgeText(dueDate: string): string {
    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60));

    if (diffHours > 24) return 'Atrasado';
    if (diffHours > 0) return 'Hoje';
    return 'Em breve';
  }

  private async getCurrentTenantId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (error) {
        console.error('[AutoFollowUp] Error getting tenant:', error);
        return null;
      }

      return tenant?.id || null;
    } catch (error) {
      console.error('[AutoFollowUp] Error getting tenant:', error);
      return null;
    }
  }
}

export const autoFollowUpService = new AutoFollowUpService();
