-- =====================================================
-- PASSO 12: Oportunidades de Upsell (ÚLTIMA TABELA!)
-- Execute após o passo 11 ter funcionado
-- =====================================================

CREATE TABLE IF NOT EXISTS upsell_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    original_charge_id UUID REFERENCES charges(id) ON DELETE CASCADE,
    original_opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    product_name VARCHAR(255) NOT NULL,
    current_value DECIMAL(12,2) NOT NULL,
    suggested_products TEXT[],
    suggested_value DECIMAL(12,2) NOT NULL,
    probability INTEGER DEFAULT 50,
    status VARCHAR(20) DEFAULT 'pending',
    follow_up_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
