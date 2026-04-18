-- =====================================================
-- MIGRATION: Calendário Completo com Lembretes
-- Data: 2025-04-09
-- Atualização da tabela calendar_events com campos completos
-- =====================================================

-- =====================================================
-- 1. TABELA DE EVENTOS DO CALENDÁRIO (atualizada)
-- =====================================================
-- Se a tabela já existir, adicionar novas colunas
DO $$
BEGIN
    -- Verificar se tabela existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
        -- Adicionar colunas se não existirem
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'contact_id') THEN
            ALTER TABLE calendar_events ADD COLUMN contact_id UUID;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'start_time') THEN
            ALTER TABLE calendar_events ADD COLUMN start_time TIME;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'end_time') THEN
            ALTER TABLE calendar_events ADD COLUMN end_time TIME;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'reminder_minutes') THEN
            ALTER TABLE calendar_events ADD COLUMN reminder_minutes INTEGER;
        END IF;
        
        -- Atualizar a constraint de type se necessário
        ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;
        ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_type_check 
            CHECK (type IN ('followup', 'charge', 'manual', 'reuniao', 'ligacao', 'tarefa', 'retorno'));
    ELSE
        -- Criar tabela do zero
        CREATE TABLE calendar_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            
            -- Vínculos opcionais
            contact_id UUID,
            reference_id UUID, -- ID do follow-up, cobrança ou null
            
            -- Dados do evento
            type VARCHAR(20) NOT NULL DEFAULT 'manual' 
                CHECK (type IN ('followup', 'charge', 'manual', 'reuniao', 'ligacao', 'tarefa', 'retorno')),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            
            -- Data e horário
            event_date DATE NOT NULL,
            start_time TIME,
            end_time TIME,
            event_end_date TIMESTAMP WITH TIME ZONE, -- mantido para compatibilidade
            
            -- Status e lembrete
            status VARCHAR(20) NOT NULL DEFAULT 'pending' 
                CHECK (status IN ('pending', 'done', 'overdue', 'canceled')),
            reminder_minutes INTEGER, -- 10, 30, 60 minutos antes
            
            -- Metadados
            metadata JSONB DEFAULT '{}',
            
            -- Timestamps
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE
        );
    END IF;
END $$;

-- =====================================================
-- 2. ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_id ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_date ON calendar_events(tenant_id, event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_status ON calendar_events(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_contact ON calendar_events(tenant_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date_range ON calendar_events(tenant_id, event_date, status) 
    WHERE deleted_at IS NULL;

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
-- 4. TRIGGER PARA ATUALIZAR updated_at
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
-- 5. RLS POLICIES
-- =====================================================
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso multi-tenant
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
-- 6. VIEW PARA RESUMO RÁPIDO
-- =====================================================
CREATE OR REPLACE VIEW calendar_events_summary AS
SELECT 
    ce.*,
    CASE 
        WHEN ce.status = 'done' THEN 'concluido'
        WHEN ce.event_date < CURRENT_DATE AND ce.status NOT IN ('done', 'canceled') THEN 'atrasado'
        WHEN ce.event_date = CURRENT_DATE AND ce.status NOT IN ('done', 'canceled') THEN 'hoje'
        ELSE 'futuro'
    END as categoria_tempo
FROM calendar_events ce
WHERE ce.deleted_at IS NULL;

COMMENT ON VIEW calendar_events_summary IS 'View de eventos com categoria de tempo calculada';
