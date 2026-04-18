-- =====================================================
-- FASE 1: MIGRATION FINAL - SEM POLICIES PROBLEMATICAS
-- Execute linha por linha no SQL Editor do Supabase
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
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_status ON tenant_whatsapp_configs(connection_status);

-- 3. ADICIONAR COLUNA PROVIDER EM MESSAGES
ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'whatsapp_meta';

-- 4. TRIGGER PARA updated_at
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

-- 5. ATUALIZAR MENSAGENS EXISTENTES
UPDATE messages SET provider = 'whatsapp_meta' WHERE provider IS NULL;

-- 6. MIGRAR DADOS (se existirem) - SEM ERRO SE TABELA NAO EXISTIR
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
                'phone_number_id', COALESCE(phone_number_id, ''),
                'business_account_id', COALESCE(business_account_id, ''),
                'encrypted_access_token', COALESCE(encrypted_access_token, ''),
                'verify_token', COALESCE(verify_token, '')
            ),
            COALESCE(webhook_status, 'inactive'),
            last_test_status,
            last_test_message,
            last_test_at,
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
            updated_at = NOW();
    END IF;
END $$;

-- 7. VIEW DE COMPATIBILIDADE
CREATE OR REPLACE VIEW tenant_whatsapp_settings_compat AS
SELECT 
    id,
    tenant_id,
    (config->>'phone_number_id')::VARCHAR(100) as phone_number_id,
    (config->>'business_account_id')::VARCHAR(100) as business_account_id,
    (config->>'encrypted_access_token')::TEXT as encrypted_access_token,
    (config->>'verify_token')::VARCHAR(255) as verify_token,
    webhook_status,
    last_test_status,
    last_test_message,
    last_test_at,
    created_at,
    updated_at
FROM tenant_whatsapp_configs
WHERE provider_type = 'whatsapp_meta';

-- 8. COMENTARIO SOBRE RLS
-- NOTA: RLS policies nao adicionadas nesta migration para evitar erros
-- Adicionar manualmente depois se necessario, usando a tabela correta de relacionamento tenant-users

