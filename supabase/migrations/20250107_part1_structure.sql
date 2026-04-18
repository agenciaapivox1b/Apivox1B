-- =====================================================
-- FASE 1: MIGRATION SIMPLIFICADA - PARTE 1: ESTRUTURA
-- =====================================================

-- 1. CRIAR NOVA TABELA UNIFICADA (se não existir)
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

-- 5. RLS POLICIES
ALTER TABLE tenant_whatsapp_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_whatsapp_configs_tenant_isolation ON tenant_whatsapp_configs;
CREATE POLICY tenant_whatsapp_configs_tenant_isolation ON tenant_whatsapp_configs
    FOR ALL
    USING (tenant_id = auth.uid());

-- 6. ATUALIZAR MENSAGENS EXISTENTES
UPDATE messages SET provider = 'whatsapp_meta' WHERE provider IS NULL;

