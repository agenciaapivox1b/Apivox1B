import { supabase } from '@/lib/supabaseClient';

// Tipos estendidos com novos campos
export interface CalendarEvent {
  id: string;
  tenant_id: string;
  contact_id?: string | null;
  reference_id?: string | null;
  type: 'followup' | 'charge' | 'manual' | 'reuniao' | 'ligacao' | 'tarefa' | 'retorno';
  title: string;
  description: string | null;
  event_date: string; // formato YYYY-MM-DD
  start_time: string | null; // formato HH:mm
  end_time: string | null; // formato HH:mm
  event_end_date: string | null; // mantido para compatibilidade
  status: 'pending' | 'done' | 'overdue' | 'canceled';
  reminder_minutes: number | null;
  metadata: {
    client_name?: string;
    client_phone?: string;
    opportunity_id?: string;
    opportunity_name?: string;
    charge_id?: string;
    charge_value?: number;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  // deleted_at será usado quando a migration for executada
}

export interface CalendarEventInput {
  contact_id?: string | null;
  reference_id?: string | null;
  type: 'followup' | 'charge' | 'manual' | 'reuniao' | 'ligacao' | 'tarefa' | 'retorno';
  title: string;
  description?: string | null;
  event_date: string; // YYYY-MM-DD
  start_time?: string | null; // HH:mm
  end_time?: string | null; // HH:mm
  status?: 'pending' | 'done' | 'overdue' | 'canceled';
  reminder_minutes?: number | null;
  metadata?: Record<string, any>;
}

export type EventTimeCategory = 'overdue' | 'today' | 'future' | 'concluido';

export interface EventWithCategory extends CalendarEvent {
  time_category: EventTimeCategory;
}

export const calendarService = {
  // ==================== CRUD BÁSICO ====================

  async getEvents(tenantId: string, filters?: {
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    types?: string[];
    statuses?: string[];
  }): Promise<CalendarEvent[]> {
    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true });
    
    if (filters?.startDate) {
      query = query.gte('event_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('event_date', filters.endDate);
    }
    if (filters?.types && filters.types.length > 0) {
      query = query.in('type', filters.types);
    }
    if (filters?.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[calendarService] Erro ao buscar eventos:', error);
      throw error;
    }
    return data || [];
  },

  async getEventsByDate(tenantId: string, date: string): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('event_date', date)
      .order('start_time', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[calendarService] Erro ao buscar eventos por data:', error);
      throw error;
    }
    return data || [];
  },

  async getEventById(eventId: string, tenantId: string): Promise<CalendarEvent | null> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      console.error('[calendarService] Erro ao buscar evento:', error);
      return null;
    }
    return data;
  },

  async createEvent(event: CalendarEventInput, tenantId: string): Promise<CalendarEvent> {
    // Determinar status baseado na data
    const eventDate = new Date(event.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let status = event.status || 'pending';
    if (status === 'pending' && eventDate < today) {
      status = 'overdue';
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .insert([{
        ...event,
        tenant_id: tenantId,
        status
      }])
      .select()
      .single();

    if (error) {
      console.error('[calendarService] Erro ao criar evento:', error);
      throw error;
    }
    return data;
  },

  async updateEvent(eventId: string, updates: Partial<CalendarEventInput>, tenantId: string): Promise<CalendarEvent> {
    // Se a data mudou, recalcular status
    let status = updates.status;
    if (updates.event_date && !status) {
      const eventDate = new Date(updates.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (eventDate < today) {
        status = 'overdue';
      } else {
        status = 'pending';
      }
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .update({
        ...updates,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('[calendarService] Erro ao atualizar evento:', error);
      throw error;
    }
    return data;
  },

  async deleteEvent(eventId: string, tenantId: string): Promise<void> {
    // Por enquanto faz delete real até a coluna deleted_at ser adicionada
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('[calendarService] Erro ao deletar evento:', error);
      throw error;
    }
  },

  async markAsDone(eventId: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('calendar_events')
      .update({
        status: 'done',
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },

  async cancelEvent(eventId: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('calendar_events')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },

  // ==================== VISUALIZAÇÕES ESPECÍFICAS ====================

  async getTodayEvents(tenantId: string): Promise<EventWithCategory[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('event_date', today)
      .in('status', ['pending', 'overdue'])
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[calendarService] Erro ao buscar eventos de hoje:', error);
      throw error;
    }

    return (data || []).map(event => ({
      ...event,
      time_category: this.getEventTimeCategory(event)
    }));
  },

  async getOverdueEvents(tenantId: string): Promise<EventWithCategory[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .lt('event_date', today)
      .in('status', ['pending', 'overdue'])
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[calendarService] Erro ao buscar eventos atrasados:', error);
      throw error;
    }

    return (data || []).map(event => ({
      ...event,
      time_category: 'overdue'
    }));
  },

  async getUpcomingEvents(tenantId: string, days: number = 7): Promise<EventWithCategory[]> {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const endDate = futureDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('event_date', today)
      .lte('event_date', endDate)
      .in('status', ['pending'])
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[calendarService] Erro ao buscar próximos eventos:', error);
      throw error;
    }

    return (data || []).map(event => ({
      ...event,
      time_category: this.getEventTimeCategory(event)
    }));
  },

  // ==================== ESTATÍSTICAS ====================

  async getEventStats(tenantId: string): Promise<{
    overdue: number;
    today: number;
    upcoming: number;
    done: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const weekEnd = futureDate.toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const doneStart = weekStart.toISOString().split('T')[0];

    const results = await Promise.all([
      // Atrasados
      supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .lt('event_date', today)
        .in('status', ['pending', 'overdue']),

      // Hoje
      supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('event_date', today)
        .in('status', ['pending', 'overdue']),

      // Próximos 7 dias
      supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gt('event_date', today)
        .lte('event_date', weekEnd)
        .eq('status', 'pending'),

      // Concluídos (últimos 7 dias)
      supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'done')
        .gte('event_date', doneStart)
        .eq('status', 'done')
    ]);

    return {
      overdue: results[0].count || 0,
      today: results[1].count || 0,
      upcoming: results[2].count || 0,
      done: results[3].count || 0
    };
  },

  // ==================== HELPERS ====================

  getEventTimeCategory(event: CalendarEvent): EventTimeCategory {
    if (event.status === 'done') return 'concluido';

    const eventDate = new Date(event.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventDay = new Date(eventDate);
    eventDay.setHours(0, 0, 0, 0);

    if (eventDay < today) return 'overdue';
    if (eventDay.getTime() === today.getTime()) return 'today';
    return 'future';
  },

  getEventTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'followup': 'Follow-up',
      'charge': 'Cobrança',
      'manual': 'Tarefa',
      'reuniao': 'Reunião',
      'ligacao': 'Ligação',
      'tarefa': 'Tarefa',
      'retorno': 'Retorno'
    };
    return labels[type] || type;
  },

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': 'Pendente',
      'done': 'Concluído',
      'overdue': 'Atrasado',
      'canceled': 'Cancelado'
    };
    return labels[status] || status;
  }
};
