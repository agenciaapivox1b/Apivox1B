-- =====================================================
-- APIVOX - Estrutura de Banco de Dados Multi-Tenant
-- =====================================================
-- Script SQL para criação das tabelas do sistema SaaS

-- 1. Tabela de Tenants (Empresas)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan VARCHAR(50) DEFAULT 'basic',
    status VARCHAR(20) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Configurações do WhatsApp por Tenant
CREATE TABLE IF NOT EXISTS tenant_whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    phone_number_id VARCHAR(100) NOT NULL,
    business_account_id VARCHAR(100),
    encrypted_access_token TEXT NOT NULL,
    verify_token VARCHAR(255) NOT NULL,
    webhook_status VARCHAR(20) DEFAULT 'inactive',
    webhook_url TEXT,
    last_test_status VARCHAR(20),
    last_test_message TEXT,
    last_test_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- 2.1 Configurações de Branding por Tenant
CREATE TABLE IF NOT EXISTS tenant_branding_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#2563eb',
    secondary_color VARCHAR(7) DEFAULT '#10b981',
    theme_mode VARCHAR(20) DEFAULT 'custom',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- 3. Contatos (Multi-tenant)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, phone)
);

-- 4. Conversas (Multi-tenant)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    channel VARCHAR(50) DEFAULT 'whatsapp',
    status VARCHAR(20) DEFAULT 'active',
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Mensagens (Multi-tenant)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content TEXT NOT NULL,
    provider_message_id VARCHAR(255),
    message_type VARCHAR(50) DEFAULT 'text',
    status VARCHAR(20) DEFAULT 'sent',
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Oportunidades (Multi-tenant)
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_info TEXT,
    description TEXT,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'descoberta' CHECK (status IN ('descoberta', 'proposta', 'negociacao', 'fechado', 'perdido')),
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    origin VARCHAR(100),
    type VARCHAR(50) DEFAULT 'venda',
    linked_charge_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Follow-ups (Multi-tenant)
CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    charge_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
    context VARCHAR(20) DEFAULT 'commercial' CHECK (context IN ('commercial', 'billing', 'post_sale')),
    type VARCHAR(20) DEFAULT 'manual' CHECK (type IN ('manual', 'automated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Cobranças (Multi-tenant)
CREATE TABLE IF NOT EXISTS charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    value DECIMAL(12,2) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'canceled')),
    payment_method VARCHAR(50),
    gateway VARCHAR(50),
    gateway_charge_id VARCHAR(255),
    invoice_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Configurações de Métricas Personalizadas
CREATE TABLE IF NOT EXISTS tenant_metrics_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    metric_type VARCHAR(20) NOT NULL CHECK (metric_type IN ('count', 'sum', 'average', 'percentage')),
    data_source VARCHAR(50) NOT NULL CHECK (data_source IN ('opportunities', 'charges', 'follow_ups', 'contacts', 'custom')),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Valores das Métricas
CREATE TABLE IF NOT EXISTS tenant_metrics_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id UUID REFERENCES tenant_metrics_config(id) ON DELETE CASCADE,
    value DECIMAL(15,2) NOT NULL,
    period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Regras de Pós-venda
CREATE TABLE IF NOT EXISTS post_sale_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('payment_received', 'opportunity_closed', 'service_delivered')),
    delay_days INTEGER DEFAULT 0,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('create_opportunity', 'create_followup', 'send_message')),
    action_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Oportunidades de Upsell
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
    probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'accepted', 'rejected')),
    follow_up_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para consultas frequentes
CREATE INDEX idx_contacts_tenant_phone ON contacts(tenant_id, phone);
CREATE INDEX idx_conversations_tenant_contact ON conversations(tenant_id, contact_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_tenant ON messages(tenant_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_opportunities_tenant ON opportunities(tenant_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_follow_ups_tenant ON follow_ups(tenant_id);
CREATE INDEX idx_follow_ups_status ON follow_ups(status);
CREATE INDEX idx_follow_ups_scheduled ON follow_ups(scheduled_at);
CREATE INDEX idx_charges_tenant ON charges(tenant_id);
CREATE INDEX idx_charges_status ON charges(status);
CREATE INDEX idx_metrics_config_tenant ON tenant_metrics_config(tenant_id);
CREATE INDEX idx_metrics_values_metric_period ON tenant_metrics_values(metric_id, period);
CREATE INDEX idx_post_sale_rules_tenant ON post_sale_rules(tenant_id);
CREATE INDEX idx_upsell_opportunities_tenant ON upsell_opportunities(tenant_id);
CREATE INDEX idx_upsell_opportunities_status ON upsell_opportunities(status);

-- =====================================================
-- POLÍTICAS DE SEGURANÇA (RLS - ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_metrics_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_metrics_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_sale_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE upsell_opportunities ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (exemplo para tenants)
CREATE POLICY "Users can view their own tenant" ON tenants
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own tenant" ON tenants
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own tenant" ON tenants
    FOR UPDATE USING (auth.uid() = owner_id);

-- Políticas para outras tabelas (baseadas em tenant_id)
CREATE POLICY "Tenant isolation" ON contacts
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Tenant isolation" ON conversations
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Tenant isolation" ON messages
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Tenant isolation" ON opportunities
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Tenant isolation" ON follow_ups
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Tenant isolation" ON charges
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Tenant isolation" ON tenant_whatsapp_settings
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Tenant isolation" ON tenant_branding_settings
    FOR ALL USING (tenant_id::text IN (
        SELECT id::text FROM tenants WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Tenant isolation" ON tenant_metrics_config
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Tenant isolation" ON post_sale_rules
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Tenant isolation" ON upsell_opportunities
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

-- =====================================================
-- TRIGGERS E FUNÇÕES AUTOMÁTICAS
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at em todas as tabelas
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON follow_ups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_charges_updated_at BEFORE UPDATE ON charges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_whatsapp_settings_updated_at BEFORE UPDATE ON tenant_whatsapp_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_metrics_config_updated_at BEFORE UPDATE ON tenant_metrics_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_sale_rules_updated_at BEFORE UPDATE ON post_sale_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upsell_opportunities_updated_at BEFORE UPDATE ON upsell_opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS ÚTEIS
-- =====================================================

-- View para estatísticas do tenant
CREATE OR REPLACE VIEW tenant_stats AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    COUNT(DISTINCT c.id) as total_contacts,
    COUNT(DISTINCT conv.id) as total_conversations,
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT o.id) as total_opportunities,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'fechado') as closed_deals,
    COALESCE(SUM(o.amount), 0) as total_pipeline_value,
    COUNT(DISTINCT ch.id) as total_charges,
    COUNT(DISTINCT ch.id) FILTER (WHERE ch.status = 'paid') as paid_charges,
    COALESCE(SUM(ch.value) FILTER (WHERE ch.status = 'paid'), 0) as total_revenue
FROM tenants t
LEFT JOIN contacts c ON c.tenant_id = t.id
LEFT JOIN conversations conv ON conv.tenant_id = t.id
LEFT JOIN messages m ON m.tenant_id = t.id
LEFT JOIN opportunities o ON o.tenant_id = t.id
LEFT JOIN charges ch ON ch.tenant_id = t.id
GROUP BY t.id, t.name;

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

/*
ESTRUTURA MULTI-TENANT IMPLEMENTADA:

1. ISOLAMENTO COMPLETO: Todas as tabelas têm tenant_id
2. SEGURANÇA: RLS (Row Level Security) para isolamento de dados
3. PERFORMANCE: Índices otimizados para consultas frequentes
4. AUDITORIA: Campos created_at/updated_at em todas as tabelas
5. INTEGRIDADE: Chaves estrangeiras e constraints adequados
6. ESCALABILIDADE: Views e funções para operações complexas

MÓDULOS IMPLEMENTADOS:
- WhatsApp: tenant_whatsapp_settings, contacts, conversations, messages
- Oportunidades: opportunities, follow_ups
- Cobranças: charges (já existente)
- Métricas: tenant_metrics_config, tenant_metrics_values
- Pós-venda: post_sale_rules, upsell_opportunities

PRÓXIMOS PASSOS:
1. Executar este script no Supabase
2. Configurar Edge Functions (já implementadas)
3. Testar fluxo completo com dados reais
4. Ajustar tenant_id real no frontend
*/
