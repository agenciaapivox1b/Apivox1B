-- =====================================================
-- APIVOX - Verificação de Segurança RLS Simplificado
-- =====================================================

-- 1. Verificar se RLS está habilitado nas tabelas principais
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
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- 3. Verificar função auxiliar
SELECT 
    proname as function_name,
    prosecdef as security_definer
FROM pg_proc 
WHERE proname = 'user_has_tenant_access';

-- 4. Resumo do status
SELECT 
    'RLS Status' as info_type,
    COUNT(CASE WHEN rowsecurity THEN 1 END) as rls_enabled_count,
    COUNT(*) as total_tables,
    COUNT(CASE WHEN NOT rowsecurity THEN 1 END) as rls_disabled_count
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'tenants', 'tenant_whatsapp_settings', 'contacts', 'conversations', 
    'messages', 'opportunities', 'follow_ups', 'charges',
    'tenant_metrics_config', 'tenant_metrics_values', 
    'post_sale_rules', 'upsell_opportunities'
)

UNION ALL

SELECT 
    'Policies Status' as info_type,
    COUNT(*) as policy_count,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
        'tenants', 'tenant_whatsapp_settings', 'contacts', 'conversations', 
        'messages', 'opportunities', 'follow_ups', 'charges',
        'tenant_metrics_config', 'tenant_metrics_values', 
        'post_sale_rules', 'upsell_opportunities'
    )) as total_tables,
    0 as rls_disabled_count
FROM pg_policies 
WHERE schemaname = 'public';
