-- =====================================================
-- CRM OPPORTUNITIES - ESTRUTURA COMPLETA
-- 
-- Conecta: Conversas → Oportunidades → Funil → Follow-up
-- =====================================================

-- =====================================================
-- 1. ATUALIZAR TABELA OPPORTUNITIES (Migração)
-- =====================================================

-- Adicionar campos de vínculo e CRM avançado
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS expected_close_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS source VARCHAR(100) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS lost_reason TEXT,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- Garantir que tenant_id seja NOT NULL para novos registros
-- (mas permitir NULL temporariamente para migração de dados existentes)

-- Atualizar status para incluir 'perdido' separado
-- Nota: manter compatibilidade com dados existentes
ALTER TABLE opportunities 
DROP CONSTRAINT IF EXISTS opportunities_status_check;

-- =====================================================
-- 2. TABELA DE ATIVIDADES DA OPORTUNIDADE (Follow-up)
-- =====================================================

CREATE TABLE IF NOT EXISTS opportunity_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    
    -- Tipo de atividade
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'call',           -- Ligação
        'meeting',        -- Reunião
        'email',          -- Email
        'whatsapp',       -- Mensagem WhatsApp
        'note',           -- Nota/ Observação
        'task',           -- Tarefa
        'proposal_sent',  -- Proposta enviada
        'proposal_viewed', -- Proposta visualizada
        'stage_change',   -- Mudança de estágio
        'status_change'   -- Mudança de status
    )),
    
    -- Conteúdo
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Agendamento (para tarefas futuras)
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    
    -- Metadados específicos por tipo
    metadata JSONB DEFAULT '{}',
    
    -- Auditoria
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABELA DE HISTÓRICO DO FUNIL (Stage History)
-- =====================================================

CREATE TABLE IF NOT EXISTS opportunity_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    
    -- Estágios (de -> para)
    from_stage VARCHAR(50) NOT NULL,
    to_stage VARCHAR(50) NOT NULL,
    
    -- Dados do movimento
    moved_by UUID REFERENCES auth.users(id),
    moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Tempo no estágio anterior (calculado)
    time_in_previous_stage INTERVAL,
    
    -- Notas sobre a mudança
    notes TEXT
);

-- =====================================================
-- 4. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Oportunidades
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_contact 
    ON opportunities(tenant_id, contact_id);
    
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_conversation 
    ON opportunities(tenant_id, conversation_id);
    
CREATE INDEX IF NOT EXISTS idx_opportunities_status 
    ON opportunities(tenant_id, status, updated_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned 
    ON opportunities(tenant_id, assigned_to, status);
    
CREATE INDEX IF NOT EXISTS idx_opportunities_expected_close 
    ON opportunities(tenant_id, expected_close_date) 
    WHERE expected_close_date IS NOT NULL;

-- Atividades
CREATE INDEX IF NOT EXISTS idx_activities_opportunity 
    ON opportunity_activities(opportunity_id, created_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_activities_scheduled 
    ON opportunity_activities(tenant_id, scheduled_at) 
    WHERE status = 'pending' AND scheduled_at IS NOT NULL;
    
CREATE INDEX IF NOT EXISTS idx_activities_tenant_type 
    ON opportunity_activities(tenant_id, activity_type, created_at DESC);

-- Histórico
CREATE INDEX IF NOT EXISTS idx_stage_history_opportunity 
    ON opportunity_stage_history(opportunity_id, moved_at DESC);

-- =====================================================
-- 5. FUNÇÃO AUXILIAR PARA RLS (JWT-based)
-- =====================================================

-- Função para extrair tenant_id do JWT do usuário atual
-- Usada por todas as RLS policies para garantir isolamento multi-tenant
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Tentar obter do JWT (user_metadata ou app_metadata)
    v_tenant_id := (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'tenant_id')::UUID;
    
    IF v_tenant_id IS NULL THEN
        v_tenant_id := (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')::UUID;
    END IF;
    
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Oportunidades
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for opportunities" ON opportunities;
CREATE POLICY "Tenant isolation for opportunities"
    ON opportunities
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id()
    );

-- Permissão para usuários autenticados criarem oportunidades (com seu próprio tenant_id)
DROP POLICY IF EXISTS "Allow insert opportunities" ON opportunities;
CREATE POLICY "Allow insert opportunities"
    ON opportunities
    FOR INSERT
    WITH CHECK (
        tenant_id = get_current_tenant_id()
    );

-- Atividades
ALTER TABLE opportunity_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for activities" ON opportunity_activities;
CREATE POLICY "Tenant isolation for activities"
    ON opportunity_activities
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id()
    );

-- Histórico
ALTER TABLE opportunity_stage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for stage history" ON opportunity_stage_history;
CREATE POLICY "Tenant isolation for stage history"
    ON opportunity_stage_history
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id()
    );

-- =====================================================
-- 6. TRIGGERS PARA AUDITORIA
-- =====================================================

-- Trigger para updated_at em opportunities
CREATE OR REPLACE FUNCTION update_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_opportunities_updated_at ON opportunities;
CREATE TRIGGER trigger_opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_opportunities_updated_at();

-- Trigger para registrar mudança de estágio automaticamente
CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Só registra se o status realmente mudou
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO opportunity_stage_history (
            tenant_id,
            opportunity_id,
            from_stage,
            to_stage,
            moved_at
        ) VALUES (
            NEW.tenant_id,
            NEW.id,
            COALESCE(OLD.status, 'novo'),
            NEW.status,
            NOW()
        );
        
        -- Se fechou (ganho ou perdido), registrar closed_at
        IF NEW.status IN ('fechado', 'perdido') AND OLD.status NOT IN ('fechado', 'perdido') THEN
            NEW.closed_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_stage_change ON opportunities;
CREATE TRIGGER trigger_log_stage_change
    BEFORE UPDATE ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION log_stage_change();

-- Trigger para atividades
CREATE OR REPLACE FUNCTION update_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_activities_updated_at ON opportunity_activities;
CREATE TRIGGER trigger_activities_updated_at
    BEFORE UPDATE ON opportunity_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_activities_updated_at();

-- =====================================================
-- 7. VIEWS PARA RELATÓRIOS
-- =====================================================

-- View de oportunidades com dados enriquecidos
CREATE OR REPLACE VIEW opportunities_enriched AS
SELECT 
    o.*,
    c.name as contact_name,
    c.phone as contact_phone,
    c.email as contact_email,
    conv.last_message_at as conversation_last_message,
    u.email as assigned_to_email,
    -- Calcula dias no estágio atual
    EXTRACT(DAY FROM (NOW() - o.updated_at)) as days_in_stage,
    -- Calcula dias desde criação
    EXTRACT(DAY FROM (NOW() - o.created_at)) as days_since_created
FROM opportunities o
LEFT JOIN contacts c ON o.contact_id = c.id
LEFT JOIN conversations conv ON o.conversation_id = conv.id
LEFT JOIN auth.users u ON o.assigned_to = u.id;

-- View de funil (por estágio)
CREATE OR REPLACE VIEW pipeline_summary AS
SELECT 
    tenant_id,
    status as stage,
    COUNT(*) as total_opportunities,
    SUM(amount) as total_value,
    AVG(amount) as avg_value,
    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_count,
    COUNT(CASE WHEN expected_close_date <= NOW() + INTERVAL '7 days' THEN 1 END) as closing_soon_count
FROM opportunities
WHERE status NOT IN ('perdido', 'arquivado')
GROUP BY tenant_id, status;

-- =====================================================
-- 8. FUNÇÕES AUXILIARES (RPC)
-- =====================================================

-- Função para criar oportunidade a partir de conversa
CREATE OR REPLACE FUNCTION create_opportunity_from_conversation(
    p_tenant_id UUID,
    p_conversation_id UUID,
    p_name VARCHAR,
    p_amount DECIMAL DEFAULT 0,
    p_description TEXT DEFAULT NULL,
    p_assigned_to UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_contact_id UUID;
    v_opportunity_id UUID;
BEGIN
    -- Buscar contact_id da conversa
    SELECT contact_id INTO v_contact_id
    FROM conversations
    WHERE id = p_conversation_id AND tenant_id = p_tenant_id;
    
    IF v_contact_id IS NULL THEN
        RAISE EXCEPTION 'Conversa não encontrada ou sem contato vinculado';
    END IF;
    
    -- Criar oportunidade
    INSERT INTO opportunities (
        tenant_id,
        name,
        contact_id,
        conversation_id,
        amount,
        description,
        assigned_to,
        status,
        source,
        created_at,
        updated_at
    ) VALUES (
        p_tenant_id,
        p_name,
        v_contact_id,
        p_conversation_id,
        p_amount,
        p_description,
        p_assigned_to,
        'descoberta',
        'whatsapp_conversation',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_opportunity_id;
    
    -- Registrar atividade de criação
    INSERT INTO opportunity_activities (
        tenant_id,
        opportunity_id,
        contact_id,
        activity_type,
        title,
        description,
        status,
        created_at
    ) VALUES (
        p_tenant_id,
        v_opportunity_id,
        v_contact_id,
        'note',
        'Oportunidade criada',
        COALESCE(p_description, 'Oportunidade criada a partir da conversa'),
        'completed',
        NOW()
    );
    
    RETURN v_opportunity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para mover oportunidade entre estágios
CREATE OR REPLACE FUNCTION move_opportunity_stage(
    p_opportunity_id UUID,
    p_new_stage VARCHAR,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_tenant_id UUID;
    v_old_stage VARCHAR;
BEGIN
    -- Buscar dados atuais
    SELECT tenant_id, status 
    INTO v_tenant_id, v_old_stage
    FROM opportunities 
    WHERE id = p_opportunity_id;
    
    IF v_tenant_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Atualizar estágio
    UPDATE opportunities 
    SET status = p_new_stage,
        updated_at = NOW()
    WHERE id = p_opportunity_id;
    
    -- Registrar atividade
    INSERT INTO opportunity_activities (
        tenant_id,
        opportunity_id,
        activity_type,
        title,
        description,
        status,
        created_at
    ) VALUES (
        v_tenant_id,
        p_opportunity_id,
        'stage_change',
        'Mudança de estágio: ' || v_old_stage || ' → ' || p_new_stage,
        COALESCE(p_notes, 'Oportunidade movida para ' || p_new_stage),
        'completed',
        NOW()
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar atividades com paginação
CREATE OR REPLACE FUNCTION get_opportunity_activities(
    p_opportunity_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    activity_type VARCHAR,
    title VARCHAR,
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR,
    created_by_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.activity_type,
        a.title,
        a.description,
        a.scheduled_at,
        a.completed_at,
        a.status,
        u.email as created_by_email,
        a.created_at
    FROM opportunity_activities a
    LEFT JOIN auth.users u ON a.created_by = u.id
    WHERE a.opportunity_id = p_opportunity_id
    ORDER BY a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. DADOS DE EXEMPLO (Opcional - para testes)
-- =====================================================

-- Comentado para não criar dados em produção
/*
-- Inserir atividades de exemplo para uma oportunidade existente
INSERT INTO opportunity_activities (tenant_id, opportunity_id, activity_type, title, description, status, created_at)
SELECT 
    o.tenant_id,
    o.id,
    'note',
    'Atividade de exemplo',
    'Esta é uma atividade de exemplo criada automaticamente',
    'completed',
    NOW()
FROM opportunities o
LIMIT 1;
*/

-- =====================================================
-- =====================================================
-- 10. TABELA DE FOLLOW-UP (Sistema de Ações/Tarefas)
-- =====================================================

-- Tabela de follow-ups vinculados às oportunidades
CREATE TABLE IF NOT EXISTS opportunity_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL, -- Ação curta: "Enviar proposta", "Ligar cliente"
    description TEXT, -- Descrição opcional detalhada
    due_date TIMESTAMP WITH TIME ZONE NOT NULL, -- Data/hora do próximo contato
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'overdue', 'canceled')),
    created_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_follow_ups_opportunity ON opportunity_follow_ups(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_tenant ON opportunity_follow_ups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON opportunity_follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON opportunity_follow_ups(due_date);

-- RLS para follow-ups
ALTER TABLE opportunity_follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for follow-ups" ON opportunity_follow_ups;
CREATE POLICY "Tenant isolation for follow-ups"
    ON opportunity_follow_ups
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id()
    );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_follow_up_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_follow_up_updated_at ON opportunity_follow_ups;
CREATE TRIGGER update_follow_up_updated_at
    BEFORE UPDATE ON opportunity_follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION update_follow_up_timestamp();

-- Trigger para marcar overdue automaticamente
CREATE OR REPLACE FUNCTION check_follow_up_overdue()
RETURNS TRIGGER AS $$
BEGIN
    -- Se due_date passou e status ainda é pending, marca como overdue
    IF NEW.due_date < NOW() AND NEW.status = 'pending' THEN
        NEW.status = 'overdue';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_follow_up_overdue_trigger ON opportunity_follow_ups;
CREATE TRIGGER check_follow_up_overdue_trigger
    BEFORE INSERT OR UPDATE ON opportunity_follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION check_follow_up_overdue();

-- FIM DA MIGRAÇÃO
-- =====================================================
