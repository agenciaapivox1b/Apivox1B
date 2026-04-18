-- =====================================================
-- APIVOX - Verificação de Segurança RLS Multi-Tenant
-- Execute este script para validar o isolamento por tenant
-- =====================================================

-- 1. Verificar se RLS está habilitado em todas as tabelas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'tenants', 'tenant_whatsapp_settings', 'contacts', 'conversations', 
    'messages', 'opportunities', 'follow_ups', 'charges',
    'tenant_metrics_config', 'tenant_metrics_values', 
    'post_sale_rules', 'upsell_opportunities'
)
ORDER BY tablename;

-- 2. Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- 3. Verificar função auxiliar de tenant access
SELECT 
    proname,
    prosrc,
    prolang,
    prosecdef
FROM pg_proc 
WHERE proname = 'user_has_tenant_access';

-- 4. Teste de isolamento (opcional)
-- Criar função para testar se um usuário pode acessar dados de outro tenant
CREATE OR REPLACE FUNCTION test_tenant_isolation()
RETURNS TABLE(test_name TEXT, result TEXT) AS $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_tenant_id UUID := gen_random_uuid();
    test_tenant_id_2 UUID := gen_random_uuid();
    test_result TEXT;
BEGIN
    -- Teste 1: Criar tenant para usuário
    INSERT INTO tenants (id, owner_id, name, plan, status, created_at, updated_at)
    VALUES (test_tenant_id, test_user_id, 'Test Tenant', 'basic', 'active', NOW(), NOW());
    
    GET DIAGNOSTICS test_result = ROW_COUNT;
    RETURN NEXT VALUES('Criar tenant para usuário', test_result);
    
    -- Teste 2: Tentar acessar dados de outro tenant (não deve encontrar)
    PERFORM 1 FROM tenants WHERE id = test_tenant_id_2 AND owner_id = test_user_id;
    
    IF FOUND THEN
        RETURN NEXT VALUES('Acesso cross-tenant', 'FALHOU - Encontrou dados de outro tenant');
    ELSE
        RETURN NEXT VALUES('Acesso cross-tenant', 'OK - Não encontrou dados de outro tenant');
    END IF;
    
    -- Limpeza
    DELETE FROM tenants WHERE id IN (test_tenant_id, test_tenant_id_2);
    
    RETURN NEXT VALUES('Limpeza', 'OK');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Executar teste de isolamento
SELECT * FROM test_tenant_isolation();
