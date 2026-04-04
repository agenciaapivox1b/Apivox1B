import { supabase } from '@/lib/supabaseClient';

export interface TenantPaymentSettings {
  id: string;
  tenant_id: string;
  charge_mode: 'gateway';
  gateway_name: string | null;
  encrypted_api_key: string | null;
  manual_payment_link_default: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavePaymentSettingsInput {
  tenantId: string;
  chargeMode: 'gateway';
  gatewayName?: 'asaas' | 'mercadopago' | 'stripe';
  apiKey?: string;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

class TenantPaymentSettingsService {
  async getByTenantId(tenantId: string): Promise<TenantPaymentSettings | null> {
    try {
      if (!tenantId) return null;
      if (!isUuid(tenantId)) return null;

      const { data, error } = await supabase
        .from('tenant_charge_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') return null;

        console.error('[TenantPaymentSettingsService] Erro ao buscar:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return null;
      }

      return data || null;
    } catch (error: any) {
      console.error('[TenantPaymentSettingsService] Erro geral ao buscar:', error?.message);
      return null;
    }
  }

  async save(input: SavePaymentSettingsInput): Promise<{ success: boolean; error?: string }> {
    try {
      if (!input.tenantId) {
        return { success: false, error: 'tenantId não informado' };
      }

      if (!isUuid(input.tenantId)) {
        return { success: false, error: 'tenantId inválido. É necessário um UUID real do tenant.' };
      }

      if (input.chargeMode !== 'gateway') {
        return { success: false, error: 'Modo inválido. Esta tela aceita apenas gateway.' };
      }

      if (!input.gatewayName) {
        return { success: false, error: 'Selecione um gateway' };
      }

      const existing = await this.getByTenantId(input.tenantId);
      let encryptedApiKey: string | null = existing?.encrypted_api_key || null;

      if (input.apiKey && input.apiKey.trim()) {
        try {
          encryptedApiKey = await this.encryptApiKey(input.apiKey.trim());
        } catch (err: any) {
          console.error('[TenantPaymentSettingsService] Erro ao criptografar API Key:', err?.message);
          return {
            success: false,
            error: err?.message || 'Erro ao criptografar API Key',
          };
        }
      }

      const payload = {
        tenant_id: input.tenantId,
        charge_mode: 'gateway' as const,
        gateway_name: input.gatewayName,
        encrypted_api_key: encryptedApiKey,
        manual_payment_link_default: null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('tenant_charge_settings')
        .upsert(payload, { onConflict: 'tenant_id' });

      if (error) {
        console.error('[TenantPaymentSettingsService] Erro ao salvar no Supabase:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });

        return {
          success: false,
          error: error.message || 'Erro ao salvar no banco',
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error('[TenantPaymentSettingsService] Erro geral ao salvar:', error?.message);
      return {
        success: false,
        error: error?.message || 'Erro desconhecido',
      };
    }
  }

  private async encryptApiKey(apiKey: string): Promise<string> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const legacyAnonJwt = import.meta.env.VITE_SUPABASE_LEGACY_ANON_JWT;

    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL não encontrada');
    }

    if (!publishableKey) {
      throw new Error('VITE_SUPABASE_ANON_KEY não encontrada');
    }

    if (!legacyAnonJwt) {
      throw new Error('VITE_SUPABASE_LEGACY_ANON_JWT não encontrada');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/encrypt-api-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${legacyAnonJwt}`,
      },
      body: JSON.stringify({ apiKey }),
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error('[encryptApiKey] HTTP inválido:', {
        status: response.status,
        statusText: response.statusText,
        data,
      });

      throw new Error(
        data?.error || data?.message || `Edge Function retornou status ${response.status}`
      );
    }

    if (!data?.success || !data?.encryptedApiKey) {
      console.error('[encryptApiKey] Resposta inválida:', data);
      throw new Error(data?.error || 'Resposta inválida da Edge Function encrypt-api-key');
    }

    return data.encryptedApiKey;
  }
}

export const tenantPaymentSettingsService = new TenantPaymentSettingsService();