-- =====================================================
-- PASSO 2: Configurações do WhatsApp
-- Execute após o passo 1 ter funcionado
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    phone_number_id VARCHAR(100) NOT NULL,
    business_account_id VARCHAR(100),
    encrypted_access_token TEXT NOT NULL,
    verify_token VARCHAR(255) NOT NULL,
    webhook_status VARCHAR(20) DEFAULT 'inactive',
    webhook_url TEXT,
    last_test_status VARCHAR(20),
    last_test_message TEXT,
    last_test_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
