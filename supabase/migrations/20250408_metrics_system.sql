-- =====================================================
-- MIGRATION: Sistema de Métricas e Analytics
-- Data: 2025-04-08
-- Cria tabelas para métricas personalizadas e valores históricos
-- =====================================================

-- =====================================================
-- 0. TABELA TENANTS (se não existir)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL,
    plan VARCHAR(50) DEFAULT 'basic',
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para tenants
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- =====================================================
-- 1. TABELA DE CONFIGURAÇÃO DE MÉTRICAS PERSONALIZADAS
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_metrics_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Identificação
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Tipo de métrica
    metric_type VARCHAR(20) NOT NULL CHECK (metric_type IN ('count', 'sum', 'average', 'percentage')),
    
    -- Fonte de dados
    data_source VARCHAR(50) NOT NULL CHECK (data_source IN ('opportunities', 'charges', 'follow_ups', 'contacts', 'custom')),
    
    -- Status e ordenação
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para tenant_metrics_config
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_config_tenant_id ON tenant_metrics_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_config_active ON tenant_metrics_config(tenant_id, is_active);

-- Comentários
COMMENT ON TABLE tenant_metrics_config IS 'Configurações de métricas personalizadas por tenant';
COMMENT ON COLUMN tenant_metrics_config.metric_type IS 'count|sum|average|percentage';
COMMENT ON COLUMN tenant_metrics_config.data_source IS 'opportunities|charges|follow_ups|contacts|custom';

-- =====================================================
-- 2. TABELA DE VALORES HISTÓRICOS DE MÉTRICAS
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_metrics_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamento
    metric_id UUID NOT NULL REFERENCES tenant_metrics_config(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Valor e período
    value DECIMAL(15, 2) NOT NULL,
    period VARCHAR(20) NOT NULL, -- ex: '2024-01', '2024-W01', '2024-01-15'
    
    -- Timestamp do registro
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para tenant_metrics_values
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_values_metric_id ON tenant_metrics_values(metric_id);
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_values_tenant_id ON tenant_metrics_values(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_values_recorded_at ON tenant_metrics_values(recorded_at);
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_values_period ON tenant_metrics_values(tenant_id, period);

-- Comentários
COMMENT ON TABLE tenant_metrics_values IS 'Valores históricos das métricas calculadas';

-- =====================================================
-- 3. FUNÇÃO PARA EXTRAIR TENANT_ID DO JWT
-- =====================================================
-- Função usada por todas as RLS policies para garantir isolamento multi-tenant
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Extrair tenant_id do claim personalizado no JWT
    v_tenant_id := current_setting('request.jwt.claims', true)::jsonb->>'tenant_id';
    
    -- Se não encontrar no claim direto, tentar em user_metadata
    IF v_tenant_id IS NULL THEN
        v_tenant_id := current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'tenant_id';
    END IF;
    
    -- Se não encontrar em user_metadata, tentar em app_metadata
    IF v_tenant_id IS NULL THEN
        v_tenant_id := current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'tenant_id';
    END IF;
    
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. TRIGGER PARA ATUALIZAR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tenant_metrics_config_updated_at ON tenant_metrics_config;
CREATE TRIGGER update_tenant_metrics_config_updated_at
    BEFORE UPDATE ON tenant_metrics_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE tenant_metrics_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_metrics_values ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS tenant_metrics_config_select_policy ON tenant_metrics_config;
DROP POLICY IF EXISTS tenant_metrics_config_insert_policy ON tenant_metrics_config;
DROP POLICY IF EXISTS tenant_metrics_config_update_policy ON tenant_metrics_config;
DROP POLICY IF EXISTS tenant_metrics_config_delete_policy ON tenant_metrics_config;

DROP POLICY IF EXISTS tenant_metrics_values_select_policy ON tenant_metrics_values;
DROP POLICY IF EXISTS tenant_metrics_values_insert_policy ON tenant_metrics_values;
DROP POLICY IF EXISTS tenant_metrics_values_delete_policy ON tenant_metrics_values;

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

-- =====================================================
-- 6. MÉTRICAS PADRÃO DO SISTEMA (SALVAS COMO CONFIG)
-- =====================================================
-- NOTA: Métricas padrão são calculadas dinamicamente pelo backend
-- Esta tabela é apenas para métricas PERSONALIZADAS criadas pelo usuário

-- =====================================================
-- 7. VIEW PARA MÉTRICAS CONSOLIDADAS (opcional)
-- =====================================================
-- View simplificada sem subquery complexa
CREATE OR REPLACE VIEW tenant_metrics_summary AS
SELECT 
    tmc.id,
    tmc.tenant_id,
    tmc.name,
    tmc.description,
    tmc.metric_type,
    tmc.data_source,
    tmc.is_active,
    tmc.display_order,
    tmc.created_at,
    tmc.updated_at
FROM tenant_metrics_config tmc
WHERE tmc.is_active = true;

COMMENT ON VIEW tenant_metrics_summary IS 'View simplificada das configurações de métricas ativas';
