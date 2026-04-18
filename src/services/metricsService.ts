import { supabase } from '@/lib/supabaseClient';

export interface TenantMetricConfig {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  metric_type: 'count' | 'sum' | 'average' | 'percentage';
  data_source: 'opportunities' | 'charges' | 'follow_ups' | 'contacts' | 'custom';
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface MetricValue {
  metric_id: string;
  value: number;
  period: string;
  recorded_at: string;
}

export interface StandardMetrics {
  // Métricas de Ação Imediata
  leadsWithoutResponse: number;
  overdueFollowUps: number;
  stalledOpportunities: number;
  atRiskCharges: number;
  conversationsWithoutReply: number;
  
  // Métricas de Performance
  stageConversionRate: Record<string, number>;
  avgResponseTime: number;
  followUpCompletionRate: number;
  potentialUpsellClients: number;
  
  // Métricas de Volume
  totalActiveOpportunities: number;
  pipelineValue: number;
  monthlyRevenue: number;
  newContactsThisMonth: number;
  
  // Métricas para AnalyticsPage (mapeamento)
  totalLeads: number;              // leadsWithoutResponse
  opportunitiesOpen: number;     // totalActiveOpportunities
  conversionRate: number;          // calculado
  totalRevenue: number;            // monthlyRevenue
  paidCharges: number;            // calculado
  pendingCharges: number;          // calculado
  followUpsPending: number;        // overdueFollowUps + pendentes
}

export const metricsService = {
  // Configurações de métricas personalizadas
  async getTenantMetricsConfig(tenantId: string): Promise<TenantMetricConfig[]> {
    const { data, error } = await supabase
      .from('tenant_metrics_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async createMetricConfig(config: Omit<TenantMetricConfig, 'id' | 'created_at' | 'updated_at'>): Promise<TenantMetricConfig> {
    const { data, error } = await supabase
      .from('tenant_metrics_config')
      .insert({
        ...config,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateMetricConfig(id: string, updates: Partial<TenantMetricConfig>): Promise<TenantMetricConfig> {
    const { data, error } = await supabase
      .from('tenant_metrics_config')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteMetricConfig(id: string): Promise<void> {
    const { error } = await supabase
      .from('tenant_metrics_config')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Cálculo de métricas padrão (foco estratégico)
  async getStandardMetrics(tenantId: string): Promise<StandardMetrics> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Buscar dados
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('*')
      .eq('tenant_id', tenantId);

    const { data: charges } = await supabase
      .from('charges')
      .select('*')
      .eq('tenant_id', tenantId);

    const { data: followUps } = await supabase
      .from('opportunity_follow_ups')
      .select('*')
      .eq('tenant_id', tenantId);

    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', tenantId);

    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId);

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    // Métricas de Ação Imediata
    const leadsWithoutResponse = conversations?.filter(conv => {
      const lastMessage = messages?.find(msg => msg.conversation_id === conv.id);
      return lastMessage?.direction === 'inbound';
    }).length || 0;

    const overdueFollowUps = followUps?.filter(fu => 
      fu.status === 'pending' && new Date(fu.due_date) < now
    ).length || 0;

    const stalledOpportunities = opportunities?.filter(opp => {
      const lastUpdate = new Date(opp.updated_at);
      return opp.status !== 'fechado' && opp.status !== 'perdido' && 
             (now.getTime() - lastUpdate.getTime()) > 7 * 24 * 60 * 60 * 1000; // 7 dias sem atualização
    }).length || 0;

    const atRiskCharges = charges?.filter(charge => 
      charge.status === 'overdue' || 
      (charge.due_date && new Date(charge.due_date) < now && charge.status !== 'paid')
    ).length || 0;

    const conversationsWithoutReply = conversations?.filter(conv => {
      const convMessages = messages?.filter(msg => msg.conversation_id === conv.id);
      if (!convMessages || convMessages.length === 0) return false;
      
      const lastMessage = convMessages[0]; // Mais recente
      return lastMessage.direction === 'inbound' && 
             (now.getTime() - new Date(lastMessage.created_at).getTime()) > 2 * 60 * 60 * 1000; // 2 horas sem resposta
    }).length || 0;

    // Métricas de Performance
    const stageConversionRate = {
      descoberta: opportunities?.filter(o => o.status === 'proposta' || o.status === 'negociacao' || o.status === 'fechado').length || 0,
      proposta: opportunities?.filter(o => o.status === 'negociacao' || o.status === 'fechado').length || 0,
      negociacao: opportunities?.filter(o => o.status === 'fechado').length || 0,
    };

    const avgResponseTime = conversations && conversations.length > 0
      ? conversations.reduce((sum, conv) => {
          const convMessages = messages?.filter(msg => msg.conversation_id === conv.id);
          if (!convMessages || convMessages.length < 2) return sum;
          
          const inbound = convMessages.find(msg => msg.direction === 'inbound');
          const outbound = convMessages.find(msg => msg.direction === 'outbound' && 
            new Date(msg.created_at) > new Date(inbound!.created_at));
          
          if (inbound && outbound) {
            const diff = new Date(outbound.created_at).getTime() - new Date(inbound.created_at).getTime();
            return sum + (diff / (1000 * 60)); // minutos
          }
          return sum;
        }, 0) / conversations.length
      : 0;

    const followUpCompletionRate = followUps && followUps.length > 0
      ? (followUps.filter(fu => fu.status === 'done').length / followUps.length) * 100
      : 0;

    const potentialUpsellClients = charges?.filter(charge => 
      charge.status === 'paid' && 
      new Date(charge.created_at) > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Pagos nos últimos 30 dias
    ).length || 0;

    // Métricas de Volume
    const totalActiveOpportunities = opportunities?.filter(o => 
      o.status !== 'fechado' && o.status !== 'perdido'
    ).length || 0;

    const pipelineValue = opportunities?.filter(o => 
      o.status !== 'fechado' && o.status !== 'perdido'
    ).reduce((sum, o) => sum + (o.amount || 0), 0) || 0;

    const monthlyRevenue = charges?.filter(charge => 
      charge.status === 'paid' && 
      new Date(charge.created_at) >= startOfMonth
    ).reduce((sum, charge) => sum + (charge.value || 0), 0) || 0;

    const newContactsThisMonth = contacts?.filter(contact => 
      new Date(contact.created_at) >= startOfMonth
    ).length || 0;

    // Métricas calculadas para AnalyticsPage
    const totalLeads = leadsWithoutResponse;
    const opportunitiesOpen = totalActiveOpportunities;
    const conversionRate = opportunities && opportunities.length > 0
      ? Math.round((opportunities.filter(o => o.status === 'fechado').length / opportunities.length) * 100)
      : 0;
    const totalRevenue = monthlyRevenue;
    const paidCharges = charges?.filter(c => c.status === 'paid').length || 0;
    const pendingCharges = charges?.filter(c => c.status === 'pending' || c.status === 'overdue').length || 0;
    const followUpsPending = followUps?.filter(fu => fu.status === 'pending' || fu.status === 'overdue').length || 0;

    return {
      // Métricas de Ação Imediata
      leadsWithoutResponse,
      overdueFollowUps,
      stalledOpportunities,
      atRiskCharges,
      conversationsWithoutReply,
      
      // Métricas de Performance
      stageConversionRate,
      avgResponseTime,
      followUpCompletionRate,
      potentialUpsellClients,
      
      // Métricas de Volume
      totalActiveOpportunities,
      pipelineValue,
      monthlyRevenue,
      newContactsThisMonth,
      
      // Métricas para AnalyticsPage
      totalLeads,
      opportunitiesOpen,
      conversionRate,
      totalRevenue,
      paidCharges,
      pendingCharges,
      followUpsPending,
    };
  },

  // Cálculo de métricas personalizadas
  async calculateCustomMetric(config: TenantMetricConfig, tenantId: string): Promise<number> {
    switch (config.data_source) {
      case 'opportunities':
        return await calculateOpportunityMetric(config, tenantId);
      case 'charges':
        return await calculateChargeMetric(config, tenantId);
      case 'follow_ups':
        return await calculateFollowUpMetric(config, tenantId);
      case 'contacts':
        return await calculateContactMetric(config, tenantId);
      case 'custom':
        return 0; // Implementar lógica customizada
      default:
        return 0;
    }
  },

  // Salvar valor de métrica
  async saveMetricValue(metricId: string, value: number, period: string): Promise<void> {
    await supabase
      .from('tenant_metrics_values')
      .insert({
        metric_id: metricId,
        value,
        period,
        recorded_at: new Date().toISOString(),
      });
  },

  // Buscar valores históricos
  async getMetricHistory(metricId: string, days: number = 30): Promise<MetricValue[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('tenant_metrics_values')
      .select('*')
      .eq('metric_id', metricId)
      .gte('recorded_at', cutoffDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};

// Funções auxiliares para cálculo de métricas
async function calculateOpportunityMetric(config: TenantMetricConfig, tenantId: string): Promise<number> {
  const { data } = await supabase
    .from('opportunities')
    .select('*')
    .eq('tenant_id', tenantId);

  if (!data || data.length === 0) return 0;

  switch (config.metric_type) {
    case 'count':
      return data.length;
    case 'sum':
      return data.reduce((sum, opp) => sum + (opp.amount || 0), 0);
    case 'average':
      return data.reduce((sum, opp) => sum + (opp.amount || 0), 0) / data.length;
    case 'percentage':
      // Ex: percentual de oportunidades fechadas
      const closed = data.filter(opp => opp.status === 'fechado').length;
      return (closed / data.length) * 100;
    default:
      return 0;
  }
}

async function calculateChargeMetric(config: TenantMetricConfig, tenantId: string): Promise<number> {
  const { data } = await supabase
    .from('charges')
    .select('*')
    .eq('tenant_id', tenantId);

  if (!data || data.length === 0) return 0;

  switch (config.metric_type) {
    case 'count':
      return data.length;
    case 'sum':
      return data.reduce((sum, charge) => sum + (charge.value || 0), 0);
    case 'average':
      return data.reduce((sum, charge) => sum + (charge.value || 0), 0) / data.length;
    case 'percentage':
      // Ex: percentual de cobranças pagas
      const paid = data.filter(charge => charge.status === 'paid').length;
      return (paid / data.length) * 100;
    default:
      return 0;
  }
}

async function calculateFollowUpMetric(config: TenantMetricConfig, tenantId: string): Promise<number> {
  const { data } = await supabase
    .from('opportunity_follow_ups')
    .select('*')
    .eq('tenant_id', tenantId);

  if (!data || data.length === 0) return 0;

  switch (config.metric_type) {
    case 'count':
      return data.length;
    case 'percentage':
      // Ex: percentual de follow-ups concluídos
      const completed = data.filter(fu => fu.status === 'done').length;
      return (completed / data.length) * 100;
    default:
      return 0;
  }
}

async function calculateContactMetric(config: TenantMetricConfig, tenantId: string): Promise<number> {
  const { data } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId);

  if (!data || data.length === 0) return 0;

  switch (config.metric_type) {
    case 'count':
      return data.length;
    default:
      return 0;
  }
}
