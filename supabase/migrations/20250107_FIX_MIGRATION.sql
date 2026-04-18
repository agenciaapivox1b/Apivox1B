-- =====================================================
-- MIGRATION CORRIGIDA - VERIFICA COLUNAS ANTES DE MIGRAR
-- =====================================================

-- 1. VERIFICAR E ADICIONAR COLUNAS QUE FALTAM NA NOVA TABELA
ALTER TABLE tenant_whatsapp_configs 
ADD COLUMN IF NOT EXISTS last_test_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS last_test_message TEXT,
ADD COLUMN IF NOT EXISTS last_test_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_error_message TEXT,
ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMP WITH TIME ZONE;

-- 2. MIGRAR DADOS - VERSAO QUE VERIFICA COLUNAS NA TABELA ANTIGA
DO $$
DECLARE
    has_phone_number_id BOOLEAN := false;
    has_business_account_id BOOLEAN := false;
    has_encrypted_access_token BOOLEAN := false;
    has_verify_token BOOLEAN := false;
    has_webhook_status BOOLEAN := false;
BEGIN
    -- Verificar se tabela antiga existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_whatsapp_settings') THEN
        RAISE NOTICE 'Tabela tenant_whatsapp_settings nao existe. Pulando migracao.';
        RETURN;
    END IF;
    
    -- Verificar quais colunas existem na tabela antiga
    SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'tenant_whatsapp_settings' AND column_name = 'phone_number_id')
    INTO has_phone_number_id;
    
    SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'tenant_whatsapp_settings' AND column_name = 'business_account_id')
    INTO has_business_account_id;
    
    SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'tenant_whatsapp_settings' AND column_name = 'encrypted_access_token')
    INTO has_encrypted_access_token;
    
    SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'tenant_whatsapp_settings' AND column_name = 'verify_token')
    INTO has_verify_token;
    
    SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'tenant_whatsapp_settings' AND column_name = 'webhook_status')
    INTO has_webhook_status;
    
    RAISE NOTICE 'Colunas encontradas: phone_number_id=%, business_account_id=%, encrypted_access_token=%, verify_token=%, webhook_status=%',
        has_phone_number_id, has_business_account_id, has_encrypted_access_token, has_verify_token, has_webhook_status;
    
    -- Executar INSERT dinamico baseado nas colunas existentes
    IF has_phone_number_id AND has_encrypted_access_token AND has_verify_token THEN
        INSERT INTO tenant_whatsapp_configs (
            tenant_id, 
            provider_type, 
            connection_status, 
            config,
            webhook_status, 
            created_at, 
            updated_at
        )
        SELECT 
            tenant_id, 
            'whatsapp_meta',
            CASE 
                WHEN has_webhook_status AND webhook_status = 'active' THEN 'connected' 
                ELSE 'disconnected' 
            END,
            jsonb_build_object(
                'phone_number_id', COALESCE(phone_number_id, ''),
                'business_account_id', CASE WHEN has_business_account_id THEN COALESCE(business_account_id, '') ELSE '' END,
                'encrypted_access_token', COALESCE(encrypted_access_token, ''),
                'verify_token', COALESCE(verify_token, '')
            ),
            CASE WHEN has_webhook_status THEN COALESCE(webhook_status, 'inactive') ELSE 'inactive' END,
            created_at,
            updated_at
        FROM tenant_whatsapp_settings
        WHERE tenant_id IS NOT NULL
        ON CONFLICT (tenant_id, provider_type) DO UPDATE SET
            config = EXCLUDED.config,
            connection_status = EXCLUDED.connection_status,
            webhook_status = EXCLUDED.webhook_status,
            updated_at = NOW();
        
        RAISE NOTICE 'Migracao concluida com sucesso!';
    ELSE
        RAISE NOTICE 'Colunas obrigatorias nao encontradas. Migracao ignorada.';
    END IF;
END $$;

