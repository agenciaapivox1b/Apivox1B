-- =====================================================
-- FASE 1: MIGRATION SIMPLIFICADA - PARTE 2: DADOS
-- (Execute só se já tiver dados na tabela antiga)
-- =====================================================

-- Verificar se tabela antiga existe antes de migrar
DO $$
DECLARE
    old_table_exists BOOLEAN;
    has_data BOOLEAN;
BEGIN
    -- Verificar se tabela antiga existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'tenant_whatsapp_settings'
    ) INTO old_table_exists;
    
    IF NOT old_table_exists THEN
        RAISE NOTICE 'Tabela tenant_whatsapp_settings não existe. Pulando migração.';
        RETURN;
    END IF;
    
    -- Verificar se tem dados
    SELECT EXISTS (
        SELECT 1 FROM tenant_whatsapp_settings LIMIT 1
    ) INTO has_data;
    
    IF NOT has_data THEN
        RAISE NOTICE 'Tabela antiga existe mas está vazia. Pulando migração.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Migrando dados da tabela antiga...';
    
    -- Inserir dados da tabela antiga para a nova
    INSERT INTO tenant_whatsapp_configs (
        tenant_id,
        provider_type,
        connection_status,
        config,
        webhook_status,
        last_test_status,
        last_test_message,
        last_test_at,
        last_connected_at,
        created_at,
        updated_at
    )
    SELECT 
        tenant_id,
        'whatsapp_meta',
        CASE WHEN webhook_status = 'active' THEN 'connected' ELSE 'disconnected' END,
        jsonb_build_object(
            'phone_number_id', phone_number_id,
            'business_account_id', business_account_id,
            'encrypted_access_token', encrypted_access_token,
            'verify_token', verify_token,
            'webhook_url', webhook_url
        ),
        COALESCE(webhook_status, 'inactive'),
        last_test_status,
        last_test_message,
        last_test_at,
        last_connected_at,
        created_at,
        updated_at
    FROM tenant_whatsapp_settings
    WHERE tenant_id IS NOT NULL
    ON CONFLICT (tenant_id, provider_type) DO UPDATE SET
        config = EXCLUDED.config,
        connection_status = EXCLUDED.connection_status,
        webhook_status = EXCLUDED.webhook_status,
        last_test_status = EXCLUDED.last_test_status,
        last_test_message = EXCLUDED.last_test_message,
        last_test_at = EXCLUDED.last_test_at,
        last_connected_at = EXCLUDED.last_connected_at,
        updated_at = NOW();
    
    RAISE NOTICE 'Migração concluída!';
    
END $$;

