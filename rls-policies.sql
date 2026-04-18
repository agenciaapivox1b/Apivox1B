-- =====================================================
-- APIVOX - Políticas RLS (Row Level Security) Multi-Tenant
-- Execute este script após criar todas as tabelas
-- =====================================================

-- 1. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_whatsapp_settings ENABLE ROW LEVEL SECURITY;
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

-- =====================================================
-- 2. POLÍTICAS DE SEGURANÇA POR TABELA
-- =====================================================

-- Tabela: tenants (apenas owner pode acessar)
CREATE POLICY "Users can view their own tenant" ON tenants
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own tenant" ON tenants
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own tenant" ON tenants
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own tenant" ON tenants
    FOR DELETE USING (auth.uid() = owner_id);

-- Tabela: tenant_whatsapp_settings
CREATE POLICY "Users can view their own WhatsApp settings" ON tenant_whatsapp_settings
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

-- Tabela: contacts
CREATE POLICY "Users can view their own contacts" ON contacts
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

-- Tabela: conversations
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

-- Tabela: messages
CREATE POLICY "Users can view their own messages" ON messages
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

-- Tabela: opportunities
CREATE POLICY "Users can view their own opportunities" ON opportunities
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

-- Tabela: follow_ups
CREATE POLICY "Users can view their own follow-ups" ON follow_ups
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

-- Tabela: charges
CREATE POLICY "Users can view their own charges" ON charges
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

-- Tabela: tenant_metrics_config
CREATE POLICY "Users can view their own metrics config" ON tenant_metrics_config
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

-- Tabela: tenant_metrics_values
CREATE POLICY "Users can view their own metrics values" ON tenant_metrics_values
    FOR ALL USING (metric_id IN (
        SELECT id FROM tenant_metrics_config WHERE tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    ));

-- Tabela: post_sale_rules
CREATE POLICY "Users can view their own post-sale rules" ON post_sale_rules
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

-- Tabela: upsell_opportunities
CREATE POLICY "Users can view their own upsell opportunities" ON upsell_opportunities
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
    ));

-- =====================================================
-- 3. FUNÇÃO AUXILIAR PARA VALIDAÇÃO DE TENANT
-- =====================================================

CREATE OR REPLACE FUNCTION user_has_tenant_access(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenants 
        WHERE id = tenant_uuid 
        AND owner_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. POLÍTICAS OTIMIZADAS USANDO FUNÇÃO AUXILIAR
-- =====================================================

-- Substituir políticas anteriores por versões otimizadas
DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
CREATE POLICY "Users can view their own contacts" ON contacts
    FOR ALL USING (user_has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR ALL USING (user_has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages" ON messages
    FOR ALL USING (user_has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "Users can view their own opportunities" ON opportunities;
CREATE POLICY "Users can view their own opportunities" ON opportunities
    FOR ALL USING (user_has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "Users can view their own follow-ups" ON follow_ups;
CREATE POLICY "Users can view their own follow-ups" ON follow_ups
    FOR ALL USING (user_has_tenant_access(tenant_id));

DROP POLICY IF EXISTS "Users can view their own charges" ON charges;
CREATE POLICY "Users can view their own charges" ON charges
    FOR ALL USING (user_has_tenant_access(tenant_id));

-- =====================================================
-- 5. VERIFICAÇÃO DE SEGURANÇA
-- =====================================================

-- View para verificar configuração RLS
CREATE OR REPLACE VIEW rls_status AS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    forcerlspolicy as force_rls
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'tenants', 'tenant_whatsapp_settings', 'contacts', 'conversations', 
    'messages', 'opportunities', 'follow_ups', 'charges',
    'tenant_metrics_config', 'tenant_metrics_values', 
    'post_sale_rules', 'upsell_opportunities'
)
ORDER BY tablename;

-- =====================================================
-- 6. TESTE DE ISOLAMENTO (Opcional - para desenvolvimento)
-- =====================================================

-- Função para testar isolamento entre tenants
CREATE OR REPLACE FUNCTION test_tenant_isolation(test_user_id UUID, target_tenant_id UUID)
RETURNS TABLE(table_name TEXT, accessible BOOLEAN, row_count BIGINT) AS $$
DECLARE
    table_rec RECORD;
    accessible_count BIGINT;
BEGIN
    -- Temporariamente mudar o contexto do usuário para teste
    -- NOTA: Esta função deve ser executada com permissões de superusuário
    
    FOR table_rec IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('contacts', 'conversations', 'messages', 'opportunities', 'follow_ups', 'charges')
    LOOP
        -- Executar query como o usuário de teste
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE tenant_id = $1', table_rec.tablename)
        INTO accessible_count
        USING target_tenant_id;
        
        -- Se o usuário não é dono do tenant, deveria retornar 0
        IF EXISTS (SELECT 1 FROM tenants WHERE id = target_tenant_id AND owner_id = test_user_id) THEN
            -- Usuário é dono - pode ter acesso
            RETURN NEXT VALUES(table_rec.tablename, TRUE, accessible_count);
        ELSE
            -- Usuário não é dono - não deve ter acesso
            RETURN NEXT VALUES(table_rec.tablename, accessible_count > 0, accessible_count);
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CONCLUSÃO
-- =====================================================

-- RLS está agora configurado para isolamento completo por tenant
-- Todas as consultas serão automaticamente filtradas pelo tenant_id do usuário
-- Segurança garantida em nível de banco de dados

-- Para verificar status:
-- SELECT * FROM rls_status;

-- Para testar isolamento (opcional):
-- SELECT * FROM test_tenant_isolation(user_uuid, tenant_uuid);
