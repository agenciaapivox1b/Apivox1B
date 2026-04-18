import { supabase } from '@/lib/supabaseClient';

export interface PostSaleRule {
  id: string;
  tenant_id: string;
  name: string;
  trigger_type: 'payment_received' | 'opportunity_closed' | 'service_delivered';
  delay_days: number;
  action_type: 'create_opportunity' | 'create_followup' | 'send_message';
  action_config: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpsellOpportunity {
  id: string;
  tenant_id: string;
  original_charge_id?: string;
  original_opportunity_id?: string;
  customer_name: string;
  customer_phone?: string;
  product_name: string;
  current_value: number;
  suggested_products: string[];
  suggested_value: number;
  probability: number;
  status: 'pending' | 'contacted' | 'accepted' | 'rejected';
  created_at: string;
  follow_up_date?: string;
}

export const postSaleService = {
  // Regras de pós-venda
  async createRule(rule: Omit<PostSaleRule, 'id' | 'created_at' | 'updated_at'>): Promise<PostSaleRule> {
    const { data, error } = await supabase
      .from('post_sale_rules')
      .insert({
        ...rule,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getRules(tenantId: string): Promise<PostSaleRule[]> {
    const { data, error } = await supabase
      .from('post_sale_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async updateRule(id: string, updates: Partial<PostSaleRule>): Promise<PostSaleRule> {
    const { data, error } = await supabase
      .from('post_sale_rules')
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

  async deleteRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('post_sale_rules')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Oportunidades de upsell
  async createUpsellOpportunity(opp: Omit<UpsellOpportunity, 'id' | 'created_at'>): Promise<UpsellOpportunity> {
    const { data, error } = await supabase
      .from('upsell_opportunities')
      .insert({
        ...opp,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUpsellOpportunities(tenantId: string): Promise<UpsellOpportunity[]> {
    const { data, error } = await supabase
      .from('upsell_opportunities')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async updateUpsellOpportunity(id: string, updates: Partial<UpsellOpportunity>): Promise<UpsellOpportunity> {
    const { data, error } = await supabase
      .from('upsell_opportunities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Processar triggers automáticos
  async processPaymentReceived(chargeId: string, tenantId: string): Promise<void> {
    try {
      // Buscar informações da cobrança
      const { data: charge } = await supabase
        .from('charges')
        .select('customer_name, customer_phone, value, description')
        .eq('id', chargeId)
        .eq('tenant_id', tenantId)
        .single();

      if (!charge) return;

      // Buscar regras ativas para este trigger
      const rules = await this.getRules(tenantId);
      const paymentRules = rules.filter(rule => rule.trigger_type === 'payment_received');

      for (const rule of paymentRules) {
        await this.executeRule(rule, {
          charge: {
            id: chargeId,
            ...charge
          },
          tenantId
        });
      }
    } catch (error) {
      console.error('Erro ao processar pagamento recebido:', error);
    }
  },

  async processOpportunityClosed(opportunityId: string, tenantId: string): Promise<void> {
    try {
      // Buscar informações da oportunidade
      const { data: opportunity } = await supabase
        .from('opportunities')
        .select('name, amount, contact_info')
        .eq('id', opportunityId)
        .eq('tenant_id', tenantId)
        .single();

      if (!opportunity) return;

      // Buscar regras ativas para este trigger
      const rules = await this.getRules(tenantId);
      const opportunityRules = rules.filter(rule => rule.trigger_type === 'opportunity_closed');

      for (const rule of opportunityRules) {
        await this.executeRule(rule, {
          opportunity: {
            id: opportunityId,
            ...opportunity
          },
          tenantId
        });
      }
    } catch (error) {
      console.error('Erro ao processar oportunidade fechada:', error);
    }
  },

  async executeRule(rule: PostSaleRule, context: any): Promise<void> {
    const { action_type, action_config, delay_days } = rule;
    
    // Calcular data de execução
    const executeAt = new Date();
    executeAt.setDate(executeAt.getDate() + delay_days);

    switch (action_type) {
      case 'create_opportunity':
        await this.createUpsellOpportunityFromRule(rule, context, executeAt);
        break;
      
      case 'create_followup':
        await this.createFollowUpFromRule(rule, context, executeAt);
        break;
      
      case 'send_message':
        await this.scheduleMessageFromRule(rule, context, executeAt);
        break;
    }
  },

  async createUpsellOpportunityFromRule(rule: PostSaleRule, context: any, executeAt: Date): Promise<void> {
    const { action_config } = rule;
    const { tenantId } = context;

    let customerName = '';
    let customerPhone = '';
    let currentProduct = '';
    let currentValue = 0;
    let originalId = '';

    if (context.charge) {
      customerName = context.charge.customer_name;
      customerPhone = context.charge.customer_phone;
      currentProduct = context.charge.description || 'Serviço';
      currentValue = context.charge.value;
      originalId = context.charge.id;
    } else if (context.opportunity) {
      customerName = context.opportunity.contact_info;
      currentProduct = context.opportunity.name;
      currentValue = context.opportunity.amount;
      originalId = context.opportunity.id;
    }

    // Calcular valor sugerido (ex: 20-30% a mais)
    const suggestedValue = currentValue * (1 + (action_config.upsell_percentage || 0.25));

    await this.createUpsellOpportunity({
      tenant_id: tenantId,
      original_charge_id: context.charge?.id,
      original_opportunity_id: context.opportunity?.id,
      customer_name: customerName,
      customer_phone: customerPhone,
      product_name: currentProduct,
      current_value: currentValue,
      suggested_products: action_config.suggested_products || [],
      suggested_value: suggestedValue,
      probability: action_config.probability || 50,
      status: 'pending',
      follow_up_date: executeAt.toISOString(),
    });
  },

  async createFollowUpFromRule(rule: PostSaleRule, context: any, executeAt: Date): Promise<void> {
    const { action_config } = rule;
    const { tenantId } = context;

    let customerName = '';
    let relatedId = '';

    if (context.charge) {
      customerName = context.charge.customer_name;
      relatedId = context.charge.id;
    } else if (context.opportunity) {
      customerName = context.opportunity.name;
      relatedId = context.opportunity.id;
    }

    await supabase
      .from('follow_ups')
      .insert({
        tenant_id: tenantId,
        charge_id: context.charge?.id,
        opportunity_id: context.opportunity?.id,
        title: action_config.title || 'Follow-up pós-venda',
        description: action_config.description || `Follow-up para ${customerName}`,
        scheduled_at: executeAt.toISOString(),
        status: 'pending',
        context: 'post_sale',
        type: 'automated',
        created_at: new Date().toISOString(),
      });
  },

  async scheduleMessageFromRule(rule: PostSaleRule, context: any, executeAt: Date): Promise<void> {
    // Implementar agendamento de mensagem via WhatsApp
    // Isso pode ser integrado com o sistema de WhatsApp existente
    console.log('Mensagem agendada para:', executeAt, context);
  },

  // Métricas de pós-venda
  async getPostSaleMetrics(tenantId: string): Promise<{
    totalUpsellOpportunities: number;
    acceptedUpsells: number;
    pendingUpsells: number;
    totalUpsellValue: number;
    conversionRate: number;
  }> {
    const opportunities = await this.getUpsellOpportunities(tenantId);
    
    const totalUpsellOpportunities = opportunities.length;
    const acceptedUpsells = opportunities.filter(o => o.status === 'accepted').length;
    const pendingUpsells = opportunities.filter(o => o.status === 'pending').length;
    const totalUpsellValue = opportunities.reduce((sum, o) => sum + o.suggested_value, 0);
    const conversionRate = totalUpsellOpportunities > 0 ? (acceptedUpsells / totalUpsellOpportunities) * 100 : 0;

    return {
      totalUpsellOpportunities,
      acceptedUpsells,
      pendingUpsells,
      totalUpsellValue,
      conversionRate,
    };
  },
};
