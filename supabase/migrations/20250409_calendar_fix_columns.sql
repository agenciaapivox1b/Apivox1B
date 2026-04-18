-- =====================================================
-- MIGRATION: Correção de colunas na tabela calendar_events
-- Data: 2025-04-09
-- Adiciona colunas que podem estar faltando
-- =====================================================

DO $$
BEGIN
    -- Adicionar deleted_at se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_events' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE calendar_events ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Adicionar contact_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_events' AND column_name = 'contact_id'
    ) THEN
        ALTER TABLE calendar_events ADD COLUMN contact_id UUID;
    END IF;

    -- Adicionar start_time se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_events' AND column_name = 'start_time'
    ) THEN
        ALTER TABLE calendar_events ADD COLUMN start_time TIME;
    END IF;

    -- Adicionar end_time se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_events' AND column_name = 'end_time'
    ) THEN
        ALTER TABLE calendar_events ADD COLUMN end_time TIME;
    END IF;

    -- Adicionar reminder_minutes se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_events' AND column_name = 'reminder_minutes'
    ) THEN
        ALTER TABLE calendar_events ADD COLUMN reminder_minutes INTEGER;
    END IF;

    -- Verificar se event_date é do tipo DATE ou TIMESTAMP
    -- Se for TIMESTAMP, converter para DATE
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_events' 
        AND column_name = 'event_date' 
        AND data_type = 'timestamp with time zone'
    ) THEN
        -- Criar coluna temporária do tipo DATE
        ALTER TABLE calendar_events ADD COLUMN event_date_new DATE;
        
        -- Copiar dados convertendo
        UPDATE calendar_events SET event_date_new = event_date::DATE;
        
        -- Dropar coluna antiga
        ALTER TABLE calendar_events DROP COLUMN event_date;
        
        -- Renomear nova coluna
        ALTER TABLE calendar_events RENAME COLUMN event_date_new TO event_date;
        
        -- Tornar NOT NULL
        ALTER TABLE calendar_events ALTER COLUMN event_date SET NOT NULL;
    END IF;

    -- Atualizar constraint de type para incluir novos tipos
    ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;
    ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_type_check 
        CHECK (type IN ('followup', 'charge', 'manual', 'reuniao', 'ligacao', 'tarefa', 'retorno'));

END $$;

-- Criar índices úteis se não existirem
CREATE INDEX IF NOT EXISTS idx_calendar_events_deleted_at ON calendar_events(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_date ON calendar_events(tenant_id, event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_contact ON calendar_events(contact_id);

-- Recriar view se não existir
DROP VIEW IF EXISTS calendar_events_summary;
CREATE VIEW calendar_events_summary AS
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
