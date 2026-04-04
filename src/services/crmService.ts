import { supabase } from '@/lib/supabaseClient';

export interface Opportunity {
  id: string;
  tenant_id: string;
  name: string;
  contact_info?: string;
  description?: string;
  amount: number;
  status: 'descoberta' | 'proposta' | 'negocicao' | 'fechado' | 'perdido';
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
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data as Opportunity[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Opportunity;
  },

  async updateStatus(id: string, status: Opportunity['status']) {
    const { error } = await supabase
      .from('opportunities')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    
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
  status: 'pending' | 'completed' | 'cancelled';
  context: 'commercial' | 'billing' | 'post_sale';
  type: 'manual' | 'automated';
  created_at: string;
  opportunities?: { name: string };
  charges?: { customer_name: string };
}

export const followUpService = {
  async listPending() {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('*, opportunities(name), charges(customer_name)')
      .eq('status', 'pending')
      .order('scheduled_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async complete(id: string) {
    const { error } = await supabase
      .from('follow_ups')
      .update({ status: 'completed' })
      .eq('id', id);
    
    if (error) throw error;
  }
};
