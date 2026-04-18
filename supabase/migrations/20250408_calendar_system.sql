-- =====================================================
-- MIGRATION: Sistema de Calendário e Lembretes
-- Data: 2025-04-08
-- Cria tabela de eventos do calendário integrada com follow-ups e cobranças
-- =====================================================

-- =====================================================
-- 1. TABELA DE EVENTOS DO CALENDÁRIO
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Tipo e referência ao evento original
    type VARCHAR(20) NOT NULL CHECK (type IN ('followup', 'charge', 'manual')),
    reference_id UUID, -- ID do follow-up, cobrança ou null para manual
    
    -- Dados do evento (derivados ou customizados)
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Data/hora do evento
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    event_end_date TIMESTAMP WITH TIME ZONE, -- opcional para eventos com duração
    
    -- Status do evento
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'overdue', 'canceled')),
    
    -- Metadados adicionais
    metadata JSONB DEFAULT '{}', -- para dados extras como: cliente, valor, oportunidade, etc.
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Soft delete (não remove o evento, apenas marca)
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_id ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(tenant_id, event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date_status ON calendar_events(tenant_id, event_date, status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_reference ON calendar_events(tenant_id, type, reference_id);

-- Comentários
COMMENT ON TABLE calendar_events IS 'Eventos do calendário integrados com follow-ups, cobranças e tarefas manuais';
COMMENT ON COLUMN calendar_events.type IS 'followup | charge | manual';
COMMENT ON COLUMN calendar_events.status IS 'pending | done | overdue | canceled';
COMMENT ON COLUMN calendar_events.reference_id IS 'ID do evento original (follow-up ou cobrança)';

-- =====================================================
-- 2. FUNÇÃO PARA EXTRAIR TENANT_ID DO JWT (se não existir)
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
-- 3. TRIGGER PARA ATUALIZAR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_calendar_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER trigger_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_event_updated_at();

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY calendar_events_select_policy ON calendar_events
    FOR SELECT USING (tenant_id = get_current_tenant_id() AND deleted_at IS NULL);

CREATE POLICY calendar_events_insert_policy ON calendar_events
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY calendar_events_update_policy ON calendar_events
    FOR UPDATE USING (tenant_id = get_current_tenant_id())
    WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY calendar_events_delete_policy ON calendar_events
    FOR DELETE USING (tenant_id = get_current_tenant_id());

-- =====================================================
-- 5. VIEW PARA EVENTOS CONSOLIDADOS (opcional)
-- =====================================================
CREATE OR REPLACE VIEW calendar_events_today AS
SELECT 
    ce.*,
    CASE 
        WHEN ce.event_date::DATE < CURRENT_DATE THEN 'overdue'
        WHEN ce.event_date::DATE = CURRENT_DATE THEN 'today'
        ELSE 'future'
    END as time_category
FROM calendar_events ce
WHERE ce.deleted_at IS NULL
    AND ce.status IN ('pending', 'overdue')
    AND ce.event_date::DATE <= CURRENT_DATE + INTERVAL '7 days';

COMMENT ON VIEW calendar_events_today IS 'View de eventos próximos e atrasados para dashboard';
