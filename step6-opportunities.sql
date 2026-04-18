-- =====================================================
-- PASSO 6: Oportunidades
-- Execute após o passo 5 ter funcionado
-- =====================================================

CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_info TEXT,
    description TEXT,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'descoberta',
    probability INTEGER DEFAULT 0,
    origin VARCHAR(100),
    type VARCHAR(50) DEFAULT 'venda',
    linked_charge_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
