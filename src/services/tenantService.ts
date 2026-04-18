import { supabase } from '@/lib/supabaseClient';

export interface Tenant {
  id: string;
  name: string;
  owner_id: string;
  plan: string;
  status: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export class TenantService {
  /**
   * Obtém o tenant_id do usuário autenticado
   * Busca primeiro em metadata, depois na tabela tenants
   * Se não existir, cria automaticamente via Edge Function segura
   */
  static async getCurrentTenantId(): Promise<string> {
    try {
      // Obter sessão atual do usuário
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('[TenantService] Erro na sessão:', sessionError);
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const user = session.user;
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // 1. Buscar na tabela tenants (fonte da verdade - nunca trust no metadata)
      console.log('[TenantService] Buscando tenant na tabela pelo owner_id:', user.id);
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (error) {
        console.error('[TenantService] Erro ao buscar tenant:', error);
        
        // Se não encontrar tenant, criar automaticamente via Edge Function
        if (error.code === 'PGRST116') { // No rows returned
          console.log('[TenantService] Criando tenant via Edge Function para usuário:', user.id);
          const newTenant = await this.createTenantForUserSecure();
          return newTenant.id;
        }
        
        throw new Error('Tenant não encontrado para este usuário');
      }

      if (!tenant) {
        // Criar tenant automaticamente via Edge Function se não existir
        console.log('[TenantService] Criando tenant via Edge Function para usuário:', user.id);
        const newTenant = await this.createTenantForUserSecure();
        return newTenant.id;
      }

      return tenant.id;
      
    } catch (error) {
      console.error('[TenantService] Erro ao obter tenant_id:', error);
      throw error;
    }
  }

  /**
   * Cria tenant automaticamente via Edge Function segura
   */
  private static async createTenantForUserSecure(): Promise<Tenant> {
    try {
      // Obter sessão atual do usuário
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        console.error('[TenantService] ERRO: Sessão inválida:', sessionError)
        throw new Error('Sessão ausente. Faça login novamente.')
      }

      console.log('[TenantService] DEBUG - Sessão obtida:', {
        userId: session.user?.id,
        email: session.user?.email,
        tokenLength: session.access_token?.length,
        tokenStart: session.access_token?.substring(0, 20) + '...'
      })

      // MÉTODO 1: Tentar com Authorization header explícito
      console.log('[TenantService] TENTATIVA 1: Invoke com Authorization header...')
      const { data: data1, error: error1 } = await supabase.functions.invoke(
        'create-tenant-for-user',
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log('[TenantService] RESULTADO TENTATIVA 1:', { data: data1, error: error1 })

      if (!error1 && data1?.tenant) {
        console.log('[TenantService] SUCESSO com Authorization header! Tenant:', data1.tenant.id)
        return data1.tenant
      }

      // MÉTODO 2: Tentar invoke direto (deixa Supabase gerenciar)
      console.log('[TenantService] TENTATIVA 2: Invoke direto...')
      const { data: data2, error: error2 } = await supabase.functions.invoke('create-tenant-for-user')

      console.log('[TenantService] RESULTADO TENTATIVA 2:', { data: data2, error: error2 })

      if (!error2 && data2?.tenant) {
        console.log('[TenantService] SUCESSO com invoke direto! Tenant:', data2.tenant.id)
        return data2.tenant
      }

      // MÉTODO 3: Tentar com POST manual
      console.log('[TenantService] TENTATIVA 3: POST manual...')
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-tenant-for-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const data3 = await response.json()
      console.log('[TenantService] RESULTADO TENTATIVA 3:', { status: response.status, data: data3 })

      if (response.ok && data3?.tenant) {
        console.log('[TenantService] SUCESSO com POST manual! Tenant:', data3.tenant.id)
        return data3.tenant
      }

      // Todas as tentativas falharam
      const errorMsg = error1?.message || error2?.message || data3?.error || 'Erro desconhecido'
      console.error('[TenantService] TODAS AS TENTATIVAS FALHARAM:', errorMsg)
      throw new Error(`Erro ao criar tenant: ${errorMsg}`)
      
    } catch (error) {
      console.error('[TenantService] Erro fatal ao criar tenant:', error)
      throw error
    }
  }

  /**
   * Obtém dados completos do tenant atual
   */
  static async getCurrentTenant(): Promise<Tenant> {
    try {
      const tenantId = await this.getCurrentTenantId();
      
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) {
        throw new Error('Erro ao carregar dados do tenant');
      }

      if (!tenant) {
        throw new Error('Tenant não encontrado');
      }

      return tenant;
      
    } catch (error) {
      console.error('[TenantService] Erro ao obter tenant:', error);
      throw error;
    }
  }

  /**
   * Verifica se o usuário tem acesso ao tenant (validação de segurança)
   */
  static async validateTenantAccess(tenantId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return false;
      }

      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id')
        .eq('id', tenantId)
        .eq('owner_id', user.id)
        .single();

      if (error || !tenant) {
        return false;
      }

      return true;
      
    } catch (error) {
      console.error('[TenantService] Erro ao validar acesso:', error);
      return false;
    }
  }

  /**
   * Cria um novo tenant (para registro de novos usuários)
   */
  static async createTenant(tenantData: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>): Promise<Tenant> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: tenant, error } = await supabase
        .from('tenants')
        .insert({
          ...tenantData,
          owner_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error('Erro ao criar tenant');
      }

      // Atualizar user_metadata com o novo tenant_id (não suportado pelo Supabase)
      // await supabase.auth.updateUser({
      //   user_metadata: { tenant_id: tenant.id }
      // });

      return tenant;
      
    } catch (error) {
      console.error('[TenantService] Erro ao criar tenant:', error);
      throw error;
    }
  }

  /**
   * Hook React para obter tenant_id atual
   * Wrapper para uso em componentes React
   */
  static useCurrentTenant() {
    // Este será implementado como hook React separado
    throw new Error('Use useCurrentTenant hook instead');
  }

  /**
   * Obtém o plano atual do tenant
   * Retorna: 'free' ou 'premium'
   */
  static async getTenantPlan(tenantId?: string): Promise<'free' | 'premium'> {
    try {
      const targetTenantId = tenantId || await this.getCurrentTenantId();
      
      const { data, error } = await supabase
        .from('tenants')
        .select('plan')
        .eq('id', targetTenantId)
        .single();

      if (error || !data) {
        console.error('[TenantService] Erro ao buscar plano:', error);
        return 'free'; // Default seguro: free
      }

      // Normalizar: qualquer valor diferente de 'premium' é considerado free
      return data.plan === 'premium' ? 'premium' : 'free';
    } catch (error) {
      console.error('[TenantService] Erro ao verificar plano:', error);
      return 'free'; // Default seguro em caso de erro
    }
  }

  /**
   * Verifica se o tenant tem plano premium
   * Retorna true se plano === 'premium'
   */
  static async isTenantPremium(tenantId?: string): Promise<boolean> {
    const plan = await this.getTenantPlan(tenantId);
    return plan === 'premium';
  }

  /**
   * Verifica se o tenant atual tem plano premium
   * Versão síncrona para uso em componentes React com useEffect
   */
  static async checkCurrentTenantPremium(): Promise<boolean> {
    return this.isTenantPremium();
  }
}

// Exportação padrão
export default TenantService;
