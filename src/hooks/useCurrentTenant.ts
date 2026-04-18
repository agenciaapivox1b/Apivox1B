import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TenantService } from '@/services/tenantService';

export function useCurrentTenant() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTenantId = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const id = await TenantService.getCurrentTenantId();
      setTenantId(id);
      
    } catch (err: any) {
      console.error('[useCurrentTenant] Erro:', err);
      setError(err.message || 'Erro ao carregar tenant');
      setTenantId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenantId();
  }, [loadTenantId]);

  // Recarregar quando usuário mudar (login/logout)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadTenantId();
    });

    return () => subscription.unsubscribe();
  }, [loadTenantId]);

  return {
    tenantId,
    loading,
    error,
    reload: loadTenantId
  };
}
