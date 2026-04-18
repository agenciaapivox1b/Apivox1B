-- =====================================================
-- PASSO 11: Regras de Pós-venda
-- Execute após o passo 10 ter funcionado
-- =====================================================

CREATE TABLE IF NOT EXISTS post_sale_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL,
    delay_days INTEGER DEFAULT 0,
    action_type VARCHAR(50) NOT NULL,
    action_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
