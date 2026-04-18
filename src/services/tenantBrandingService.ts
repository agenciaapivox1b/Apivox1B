import { supabase } from '@/lib/supabaseClient';

export interface TenantBrandingSettings {
  id?: string;
  tenant_id: string;
  company_name: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  theme_mode: 'default' | 'custom';
}

class TenantBrandingService {
  async get(tenantId: string): Promise<TenantBrandingSettings | null> {
    console.log('[TenantBrandingService] Buscando branding para tenant:', tenantId);
    
    const { data, error } = await supabase
      .from('tenant_branding_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      console.error('[TenantBrandingService] Erro ao buscar branding:', error.message, error.code);
      return null;
    }

    console.log('[TenantBrandingService] Branding encontrado:', data);
    return data;
  }

  async save(data: TenantBrandingSettings): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[TenantBrandingService] Salvando branding:', data);
      
      const payload = {
        tenant_id: data.tenant_id,
        company_name: data.company_name,
        logo_url: data.logo_url,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        theme_mode: data.theme_mode,
        updated_at: new Date().toISOString(),
      };

      console.log('[TenantBrandingService] Payload para upsert:', payload);

      const { error } = await supabase
        .from('tenant_branding_settings')
        .upsert(payload, {
          onConflict: 'tenant_id',
        });

      if (error) {
        console.error('[TenantBrandingService] Erro no upsert:', error.message, error.code, error.details);
        throw error;
      }

      console.log('[TenantBrandingService] Salvamento bem-sucedido');
      return { success: true };
    } catch (error: any) {
      console.error('[TenantBrandingService] Erro ao salvar branding:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export const tenantBrandingService = new TenantBrandingService();