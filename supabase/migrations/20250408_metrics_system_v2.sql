-- =====================================================
-- MIGRATION: Sistema de Métricas e Analytics (SIMPLIFICADA)
-- Data: 2025-04-08
-- Versão sem recriação da tabela tenants
-- =====================================================

-- =====================================================
-- 1. TABELA DE CONFIGURAÇÃO DE MÉTRICAS PERSONALIZADAS
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_metrics_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    metric_type VARCHAR(20) NOT NULL CHECK (metric_type IN ('count', 'sum', 'average', 'percentage')),
    data_source VARCHAR(50) NOT NULL CHECK (data_source IN ('opportunities', 'charges', 'follow_ups', 'contacts', 'custom')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_config_tenant_id ON tenant_metrics_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_config_active ON tenant_metrics_config(tenant_id, is_active);

-- =====================================================
-- 2. TABELA DE VALORES HISTÓRICOS DE MÉTRICAS
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_metrics_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    value DECIMAL(15, 2) NOT NULL,
    period VARCHAR(20) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_values_metric_id ON tenant_metrics_values(metric_id);
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_values_tenant_id ON tenant_metrics_values(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_values_period ON tenant_metrics_values(tenant_id, period);

-- =====================================================
-- 3. FUNÇÃO PARA EXTRAIR TENANT_ID DO JWT
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := current_setting('request.jwt.claims', true)::jsonb->>'tenant_id';
    IF v_tenant_id IS NULL THEN
        v_tenant_id := current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'tenant_id';
    END IF;
    IF v_tenant_id IS NULL THEN
        v_tenant_id := current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'tenant_id';
    END IF;
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================
ALTER TABLE tenant_metrics_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_metrics_values ENABLE ROW LEVEL SECURITY;

-- Políticas para tenant_metrics_config
CREATE POLICY tenant_metrics_config_select_policy ON tenant_metrics_config
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_metrics_config_insert_policy ON tenant_metrics_config
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_metrics_config_update_policy ON tenant_metrics_config
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_metrics_config_delete_policy ON tenant_metrics_config
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- Políticas para tenant_metrics_values
CREATE POLICY tenant_metrics_values_select_policy ON tenant_metrics_values
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_metrics_values_insert_policy ON tenant_metrics_values
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_metrics_values_delete_policy ON tenant_metrics_values
    FOR DELETE USING (tenant_id = get_current_tenant_id());
