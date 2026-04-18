-- =====================================================
-- SOLUCAO SIMPLIFICADA - ADICIONAR COLUNAS E MIGRAR
-- Execute no SQL Editor do Supabase
-- =====================================================

-- PASSO 1: Adicionar colunas que faltam na nova tabela
ALTER TABLE tenant_whatsapp_configs 
ADD COLUMN IF NOT EXISTS last_test_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS last_test_message TEXT,
ADD COLUMN IF NOT EXISTS last_test_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_error_message TEXT,
ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMP WITH TIME ZONE;

-- PASSO 2: Verificar estrutura da tabela antiga
-- (Execute esta query separadamente para ver as colunas)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'tenant_whatsapp_settings';

-- PASSO 3: Se a tabela antiga so tiver: phone_number_id, encrypted_access_token, verify_token
-- Execute esta migracao simplificada:
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
    'disconnected',
    jsonb_build_object(
        'phone_number_id', phone_number_id,
        'encrypted_access_token', encrypted_access_token,
        'verify_token', verify_token
    ),
    'inactive',
    created_at,
    updated_at
FROM tenant_whatsapp_settings
WHERE tenant_id IS NOT NULL
ON CONFLICT (tenant_id, provider_type) DO UPDATE SET
    config = EXCLUDED.config,
    updated_at = NOW();

