-- =====================================================
-- FASE 1: MIGRATION PARA ARQUITETURA UNIFICADA WHATSAPP
-- 
-- Objetivo: Preparar banco para suportar múltiplos providers
-- sem quebrar compatibilidade com Meta API existente
-- =====================================================

-- =====================================================
-- 1. CRIAR NOVA TABELA UNIFICADA DE CONFIGURAÇÕES
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_whatsapp_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Provider type (enum para garantir consistência)
    provider_type VARCHAR(20) NOT NULL DEFAULT 'whatsapp_meta' 
        CHECK (provider_type IN ('whatsapp_meta', 'whatsapp_qr')),
    
    -- Status da conexão (unificado para ambos os providers)
    connection_status VARCHAR(20) DEFAULT 'disconnected' 
        CHECK (connection_status IN ('connected', 'disconnected', 'connecting', 'error')),
    
    -- Configuração específica por provider (JSONB flexível)
    -- Para Meta API: { phone_number_id, encrypted_access_token, verify_token, business_account_id }
    -- Para QR Code: { session_id, device_info, last_qr_timestamp }
    config JSONB NOT NULL DEFAULT '{}',
    
    -- Campos comuns de status (mantidos para compatibilidade)
    webhook_status VARCHAR(20) DEFAULT 'inactive',
    last_test_status VARCHAR(20),
    last_test_message TEXT,
    last_test_at TIMESTAMP WITH TIME ZONE,
    last_connected_at TIMESTAMP WITH TIME ZONE,
    last_error_message TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,
    
    -- Controle de versão
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, provider_type)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_tenant 
    ON tenant_whatsapp_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_provider 
    ON tenant_whatsapp_configs(provider_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_status 
    ON tenant_whatsapp_configs(connection_status);

-- =====================================================
-- 2. ADICIONAR CAMPO "provider" À TABELA MESSAGES
-- =====================================================

-- Verificar se a coluna já existe antes de adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'provider'
    ) THEN
        ALTER TABLE messages 
        ADD COLUMN provider VARCHAR(20) DEFAULT 'whatsapp_meta'
        CHECK (provider IN ('whatsapp_meta', 'whatsapp_qr'));
    END IF;
END $$;

-- =====================================================
-- 3. MIGRAR DADOS EXISTENTES (se tabela antiga existir)
-- =====================================================

-- Apenas migrar se a tabela antiga existir e tiver dados
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'tenant_whatsapp_settings') THEN
        
        INSERT INTO tenant_whatsapp_configs (
            tenant_id,
            provider_type,
            connection_status,
            config,
            webhook_status,
            last_test_status,
            last_test_message,
            last_test_at,
            created_at,
            updated_at
        )
        SELECT 
            tenant_id,
            'whatsapp_meta' as provider_type,
            CASE 
                WHEN webhook_status = 'active' THEN 'connected'
                ELSE 'disconnected'
            END as connection_status,
            jsonb_build_object(
                'phone_number_id', COALESCE(phone_number_id, ''),
                'business_account_id', COALESCE(business_account_id, ''),
                'encrypted_access_token', COALESCE(encrypted_access_token, ''),
                'verify_token', COALESCE(verify_token, ''),
                'webhook_url', COALESCE(webhook_url, '')
            ) as config,
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

-- =====================================================
-- 4. CRIAR VIEW DE COMPATIBILIDADE (opcional, para queries antigas)
-- =====================================================

-- View que mapeia nova estrutura de volta para formato antigo
-- Mantém compatibilidade com queries existentes
CREATE OR REPLACE VIEW tenant_whatsapp_settings_compat AS
SELECT 
    id,
    tenant_id,
    (config->>'phone_number_id')::VARCHAR(100) as phone_number_id,
    (config->>'business_account_id')::VARCHAR(100) as business_account_id,
    (config->>'encrypted_access_token')::TEXT as encrypted_access_token,
    (config->>'verify_token')::VARCHAR(255) as verify_token,
    webhook_status,
    (config->>'webhook_url')::TEXT as webhook_url,
    last_test_status,
    last_test_message,
    last_test_at,
    created_at,
    updated_at
FROM tenant_whatsapp_configs
WHERE provider_type = 'whatsapp_meta';

-- =====================================================
-- 5. CRIAR FUNÇÃO DE TRIGGER PARA ATUALIZAR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_whatsapp_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS trigger_whatsapp_configs_updated_at ON tenant_whatsapp_configs;
CREATE TRIGGER trigger_whatsapp_configs_updated_at
    BEFORE UPDATE ON tenant_whatsapp_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_configs_updated_at();

-- =====================================================
-- 6. RLS POLICIES PARA NOVA TABELA
-- =====================================================

-- Habilitar RLS
ALTER TABLE tenant_whatsapp_configs ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só veem configs do seu tenant
DROP POLICY IF EXISTS tenant_whatsapp_configs_tenant_isolation ON tenant_whatsapp_configs;
CREATE POLICY tenant_whatsapp_configs_tenant_isolation ON tenant_whatsapp_configs
    FOR ALL
    USING (tenant_id = auth.uid());

-- Política: Admins podem ver todos
DROP POLICY IF EXISTS tenant_whatsapp_configs_admin ON tenant_whatsapp_configs;
CREATE POLICY tenant_whatsapp_configs_admin ON tenant_whatsapp_configs
    FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- =====================================================
-- 7. MIGRAR MENSAGENS EXISTENTES (marcar como whatsapp_meta)
-- =====================================================

UPDATE messages 
SET provider = 'whatsapp_meta' 
WHERE provider IS NULL;

-- =====================================================
-- RESUMO DA MIGRATION
-- =====================================================

-- O que foi criado:
-- 1. tenant_whatsapp_configs (nova tabela unificada)
-- 2. Campo 'provider' na tabela messages
-- 3. View tenant_whatsapp_settings_compat (compatibilidade)
-- 4. Trigger para updated_at automático
-- 5. RLS policies para segurança multi-tenant

-- O que foi preservado:
-- 1. tenant_whatsapp_settings (tabela antiga - NÃO DELETADA ainda)
-- 2. Todos os dados existentes migrados
-- 3. Compatibilidade 100% com Meta API atual

-- Próximos passos (FUTURO):
-- - Implementar provider whatsapp_qr
-- - Criar Edge Functions para Baileys
-- - Depois de validar, remover tenant_whatsapp_settings antiga

