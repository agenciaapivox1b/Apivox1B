-- Migration: Create tenant_payment_settings table
-- Date: 2026-03-27
-- Description: Tabela para configurações de pagamento por tenant (multi-tenant)

CREATE TABLE IF NOT EXISTS tenant_payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    charge_mode VARCHAR(20) NOT NULL DEFAULT 'gateway' CHECK (charge_mode IN ('gateway', 'manual')),
    gateway_name VARCHAR(50) DEFAULT 'asaas',
    encrypted_api_key TEXT,
    manual_payment_link_default TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- Índice para buscas por tenant
CREATE INDEX IF NOT EXISTS idx_tenant_payment_settings_tenant_id ON tenant_payment_settings(tenant_id);

-- Comment
COMMENT ON TABLE tenant_payment_settings IS 'Configurações de pagamento por tenant - suporta múltiplos gateways';
