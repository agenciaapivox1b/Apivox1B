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

-- 2. Verificar políticas existentes (apenas se existirem)
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

-- 3. Verificar função auxiliar
SELECT 
    proname as function_name,
    prosrc as source_code,
    prosecdef as security_definer
FROM pg_proc 
WHERE proname = 'user_has_tenant_access';

-- 4. Teste de isolamento (apenas se existirem as tabelas)
DO $$
BEGIN
    -- Verificar se existe tabela tenants para fazer teste
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants' AND table_schema = 'public') THEN
        RAISE NOTICE '=== TESTE DE ISOLAMENTO MULTI-TENANT ===';
        
        -- Mostrar tenants existentes
        RAISE NOTICE 'Tenants existentes:';
        FOR tenant_record IN 
            SELECT id, owner_id, name FROM tenants ORDER BY created_at
        LOOP
            RAISE NOTICE 'Tenant: % | Owner: % | Name: %', 
                tenant_record.id, tenant_record.owner_id, tenant_record.name;
        END LOOP;
        
        -- Verificar se existem outras tabelas para testar
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'opportunities' AND table_schema = 'public') THEN
            RAISE NOTICE 'Oportunidades por tenant:';
            FOR opp_record IN 
                SELECT tenant_id, COUNT(*) as count FROM opportunities GROUP BY tenant_id
            LOOP
                RAISE NOTICE 'Tenant % tem % oportunidades', opp_record.tenant_id, opp_record.count;
            END LOOP;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follow_ups' AND table_schema = 'public') THEN
            RAISE NOTICE 'Follow-ups por tenant:';
            FOR fu_record IN 
                SELECT tenant_id, COUNT(*) as count FROM follow_ups GROUP BY tenant_id
            LOOP
                RAISE NOTICE 'Tenant % tem % follow-ups', fu_record.tenant_id, fu_record.count;
            END LOOP;
        END IF;
        
        RAISE NOTICE '=== FIM DO TESTE ===';
    ELSE
        RAISE NOTICE 'Tabela tenants não encontrada. Execute os scripts de criação de tabelas primeiro.';
    END IF;
END $$;

-- 5. Resumo do status atual
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
