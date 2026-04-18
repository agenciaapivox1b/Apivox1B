-- =====================================================
-- FASE A: TABELA DE SESSÕES QR CODE (CORRIGIDA)
-- 
-- Correções aplicadas:
-- 1. Campos NOT NULL ajustados
-- 2. JSONB com default NULL em vez de '{}'
-- 3. RLS policy comentada (ativar manualmente depois)
-- 4. Exemplo de INSERT funcionando incluído
-- =====================================================

-- Tabela para sessões QR Code ativas (multi-tenant)
CREATE TABLE IF NOT EXISTS whatsapp_qr_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Identificação da sessão
    session_id VARCHAR(100),
    
    -- Provider type
    provider_type VARCHAR(20) DEFAULT 'whatsapp_qr',
    
    -- Estado da conexão
    connection_status VARCHAR(20) DEFAULT 'disconnected',
    
    -- QR Code temporário (base64 ou URL) - pode ser NULL
    current_qr_code TEXT,
    qr_generated_at TIMESTAMP WITH TIME ZONE,
    qr_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Informações do dispositivo conectado - pode ser NULL
    device_info JSONB,
    connected_phone VARCHAR(20),
    connected_phone_formatted VARCHAR(50),
    
    -- Credenciais criptografadas - pode ser NULL
    auth_credentials_encrypted TEXT,
    
    -- Contadores
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    connected_at TIMESTAMP WITH TIME ZONE,
    disconnected_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_error_at TIMESTAMP WITH TIME ZONE,
    last_error_message TEXT,
    
    -- Constraint: um tenant só pode ter uma sessão QR
    CONSTRAINT unique_tenant_session UNIQUE(tenant_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_qr_sessions_tenant ON whatsapp_qr_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_session ON whatsapp_qr_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_status ON whatsapp_qr_sessions(connection_status);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_qr_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_qr_sessions_updated_at ON whatsapp_qr_sessions;
CREATE TRIGGER trigger_qr_sessions_updated_at
    BEFORE UPDATE ON whatsapp_qr_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_sessions_updated_at();

-- Trigger para atualizar last_activity_at
CREATE OR REPLACE FUNCTION update_qr_sessions_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_qr_sessions_activity ON whatsapp_qr_sessions;
CREATE TRIGGER trigger_qr_sessions_activity
    BEFORE UPDATE ON whatsapp_qr_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_sessions_activity();

-- =====================================================
-- EXEMPLOS DE INSERT E UPDATE FUNCIONANDO
-- =====================================================

-- Exemplo 1: INSERT inicial (campos mínimos)
-- Substitua 'SEU_TENANT_ID_AQUI' pelo UUID real do tenant
/*
INSERT INTO whatsapp_qr_sessions (
    tenant_id,
    session_id,
    provider_type,
    connection_status
) VALUES (
    'SEU_TENANT_ID_AQUI',
    'qr_session_123',
    'whatsapp_qr',
    'pending'
)
ON CONFLICT (tenant_id) DO UPDATE SET
    session_id = EXCLUDED.session_id,
    connection_status = EXCLUDED.connection_status,
    updated_at = NOW();
*/

-- Exemplo 2: UPDATE com QR Code
/*
UPDATE whatsapp_qr_sessions 
SET 
    current_qr_code = 'data:image/png;base64,iVBORw0KGgo...',
    qr_generated_at = NOW(),
    qr_expires_at = NOW() + INTERVAL '45 seconds',
    connection_status = 'awaiting_qr',
    updated_at = NOW()
WHERE tenant_id = 'SEU_TENANT_ID_AQUI';
*/

-- Exemplo 3: UPDATE quando conectado
/*
UPDATE whatsapp_qr_sessions 
SET 
    connection_status = 'connected',
    connected_phone = '5511999999999',
    connected_phone_formatted = '+55 11 99999-9999',
    device_info = '{"platform": "android", "version": "2.24.1"}',
    connected_at = NOW(),
    current_qr_code = NULL,
    updated_at = NOW()
WHERE tenant_id = 'SEU_TENANT_ID_AQUI';
*/

-- Exemplo 4: SELECT
/*
SELECT * FROM whatsapp_qr_sessions WHERE tenant_id = 'SEU_TENANT_ID_AQUI';
*/

-- NOTA SOBRE RLS:
-- A RLS foi removida desta migration para evitar erros 400.
-- Para ativar RLS manualmente depois, execute:
--
-- ALTER TABLE whatsapp_qr_sessions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY qr_sessions_tenant_isolation ON whatsapp_qr_sessions
--     FOR ALL
--     USING (tenant_id = auth.uid());

