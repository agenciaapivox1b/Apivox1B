-- =====================================================
-- FASE A: TABELA DE SESSÕES QR CODE
-- 
-- Objetivo: Armazenar estado das sessões QR por tenant
-- Sem quebrar a Meta API existente
-- =====================================================

-- Tabela para sessões QR Code ativas (multi-tenant)
CREATE TABLE IF NOT EXISTS whatsapp_qr_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Identificação da sessão (único por tenant)
    session_id VARCHAR(100) UNIQUE NOT NULL,
    
    -- Provider type (sempre 'whatsapp_qr' para esta tabela)
    provider_type VARCHAR(20) NOT NULL DEFAULT 'whatsapp_qr'
        CHECK (provider_type = 'whatsapp_qr'),
    
    -- Estado da conexão
    connection_status VARCHAR(20) DEFAULT 'disconnected'
        CHECK (connection_status IN ('pending', 'awaiting_qr', 'connecting', 'connected', 'disconnected', 'error')),
    
    -- QR Code temporário (base64 ou URL)
    current_qr_code TEXT,
    qr_generated_at TIMESTAMP WITH TIME ZONE,
    qr_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Informações do dispositivo conectado
    device_info JSONB DEFAULT '{}',
    connected_phone VARCHAR(20),
    connected_phone_formatted VARCHAR(50),
    
    -- Credenciais criptografadas para reconexão (auth state do Baileys)
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
    UNIQUE(tenant_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_qr_sessions_tenant ON whatsapp_qr_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_session ON whatsapp_qr_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_status ON whatsapp_qr_sessions(connection_status);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_phone ON whatsapp_qr_sessions(connected_phone);

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

-- Trigger para atualizar last_activity_at em operações
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

-- RLS (Row Level Security) - isolamento por tenant
ALTER TABLE whatsapp_qr_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: usuários só veem sessões do próprio tenant
DROP POLICY IF EXISTS qr_sessions_tenant_isolation ON whatsapp_qr_sessions;
CREATE POLICY qr_sessions_tenant_isolation ON whatsapp_qr_sessions
    FOR ALL
    USING (tenant_id = auth.uid());

-- Comentários explicativos
COMMENT ON TABLE whatsapp_qr_sessions IS 
'Sessões QR Code do WhatsApp por tenant. Armazena estado da conexão, QR codes temporários e credenciais criptografadas para reconexão.';

COMMENT ON COLUMN whatsapp_qr_sessions.auth_credentials_encrypted IS 
'Estado de autenticação do Baileys criptografado. Necessário para reconectar sem escanear QR novamente.';

COMMENT ON COLUMN whatsapp_qr_sessions.current_qr_code IS 
'QR Code em base64 ou URL temporária. Expira em 45-60 segundos.';

