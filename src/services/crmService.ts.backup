import { supabase } from '@/lib/supabaseClient';
import { TenantService } from '@/services/tenantService';

export interface Opportunity {
  id: string;
  tenant_id: string;
  name: string;
  contact_info?: string;
  description?: string;
  amount: number;
  status: 'descoberta' | 'proposta' | 'negociacao' | 'fechado' | 'perdido';
  probability: number;
  origin: string;
  type: string;
  linked_charge_id?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export const opportunityService = {
  async list() {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data as Opportunity[];
  },

  async getById(id: string) {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error) throw error;
    return data as Opportunity;
  },

  async updateStatus(id: string, status: Opportunity['status']) {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { error } = await supabase
      .from('opportunities')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    
    if (error) throw error;
  }
};

export interface FollowUpRecord {
  id: string;
  tenant_id: string;
  opportunity_id?: string;
  charge_id?: string;
  title: string;
  description?: string;
  scheduled_at: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  context: 'commercial' | 'billing' | 'post_sale';
  type: 'manual' | 'automated';
  created_at: string;
  updated_at: string;
  opportunities?: { name: string };
  charges?: { customer_name: string };
}

export const followUpService = {
  async list() {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data, error } = await supabase
      .from('follow_ups')
      .select('*, opportunities(name), charges(customer_name)')
      .eq('tenant_id', tenantId)
      .order('scheduled_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async create(followUpData: Omit<FollowUpRecord, 'id' | 'created_at' | 'updated_at'>) {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { data, error } = await supabase
      .from('follow_ups')
      .insert({
        ...followUpData,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as FollowUpRecord;
  },

  async complete(id: string) {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { error } = await supabase
      .from('follow_ups')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    
    if (error) throw error;
  },

  async updateSchedule(id: string, scheduledAt: string) {
    const tenantId = await TenantService.getCurrentTenantId();
    
    const { error } = await supabase
      .from('follow_ups')
      .update({ 
        scheduled_at: scheduledAt,
        status: 'scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    
    if (error) throw error;
  }
};
