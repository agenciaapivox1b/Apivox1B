-- =====================================================
-- MIGRATION SIMPLIFICADA - SÓ O ESSENCIAL
-- Execute no SQL Editor do Supabase
-- =====================================================

-- 1. CRIAR NOVA TABELA
CREATE TABLE IF NOT EXISTS tenant_whatsapp_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider_type VARCHAR(20) NOT NULL DEFAULT 'whatsapp_meta',
    connection_status VARCHAR(20) DEFAULT 'disconnected',
    config JSONB NOT NULL DEFAULT '{}',
    webhook_status VARCHAR(20) DEFAULT 'inactive',
    last_test_status VARCHAR(20),
    last_test_message TEXT,
    last_test_at TIMESTAMP WITH TIME ZONE,
    last_connected_at TIMESTAMP WITH TIME ZONE,
    last_error_message TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, provider_type)
);

-- 2. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_tenant ON tenant_whatsapp_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_provider ON tenant_whatsapp_configs(provider_type);

-- 3. COLUNA PROVIDER EM MESSAGES
ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'whatsapp_meta';

-- 4. TRIGGER updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_whatsapp_configs_updated_at ON tenant_whatsapp_configs;
CREATE TRIGGER trigger_whatsapp_configs_updated_at
    BEFORE UPDATE ON tenant_whatsapp_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_configs_updated_at();

-- 5. ATUALIZAR MENSAGENS
UPDATE messages SET provider = 'whatsapp_meta' WHERE provider IS NULL;

-- 6. MIGRAR DADOS (se existirem)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_whatsapp_settings') THEN
        INSERT INTO tenant_whatsapp_configs (
            tenant_id, provider_type, connection_status, config,
            webhook_status, last_test_status, last_test_message, last_test_at,
            created_at, updated_at
        )
        SELECT 
            tenant_id, 'whatsapp_meta',
            CASE WHEN webhook_status = 'active' THEN 'connected' ELSE 'disconnected' END,
            jsonb_build_object(
                'phone_number_id', phone_number_id,
                'business_account_id', business_account_id,
                'encrypted_access_token', encrypted_access_token,
                'verify_token', verify_token
            ),
            webhook_status, last_test_status, last_test_message, last_test_at,
            created_at, updated_at
        FROM tenant_whatsapp_settings
        WHERE tenant_id IS NOT NULL
        ON CONFLICT (tenant_id, provider_type) DO UPDATE SET
            config = EXCLUDED.config,
            webhook_status = EXCLUDED.webhook_status,
            updated_at = NOW();
    END IF;
END $$;

-- 7. VIEW DE COMPATIBILIDADE
CREATE OR REPLACE VIEW tenant_whatsapp_settings_compat AS
SELECT 
    id, tenant_id,
    (config->>'phone_number_id')::VARCHAR(100) as phone_number_id,
    (config->>'business_account_id')::VARCHAR(100) as business_account_id,
    (config->>'encrypted_access_token')::TEXT as encrypted_access_token,
    (config->>'verify_token')::VARCHAR(255) as verify_token,
    webhook_status,
    last_test_status, last_test_message, last_test_at,
    created_at, updated_at
FROM tenant_whatsapp_configs
WHERE provider_type = 'whatsapp_meta';

