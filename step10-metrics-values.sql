-- =====================================================
-- PASSO 10: Valores das Métricas
-- Execute após o passo 9 ter funcionado
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_metrics_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id UUID REFERENCES tenant_metrics_config(id) ON DELETE CASCADE,
    value DECIMAL(15,2) NOT NULL,
    period VARCHAR(20) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
