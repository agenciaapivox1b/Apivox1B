-- =====================================================
-- APIVOX - Políticas RLS (Execute após habilitar RLS)
-- =====================================================

-- FUNÇÃO AUXILIAR PARA VALIDAÇÃO DE TENANT
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
-- POLÍTICAS DE SEGURANÇA POR TABELA
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

-- Tabelas multi-tenant (usando função auxiliar)
CREATE POLICY "Users can view their own WhatsApp settings" ON tenant_whatsapp_settings
    FOR ALL USING (user_has_tenant_access(tenant_id));

CREATE POLICY "Users can view their own contacts" ON contacts
    FOR ALL USING (user_has_tenant_access(tenant_id));

CREATE POLICY "Users can view their own conversations" ON conversations
    FOR ALL USING (user_has_tenant_access(tenant_id));

CREATE POLICY "Users can view their own messages" ON messages
    FOR ALL USING (user_has_tenant_access(tenant_id));

CREATE POLICY "Users can view their own opportunities" ON opportunities
    FOR ALL USING (user_has_tenant_access(tenant_id));

CREATE POLICY "Users can view their own follow-ups" ON follow_ups
    FOR ALL USING (user_has_tenant_access(tenant_id));

CREATE POLICY "Users can view their own charges" ON charges
    FOR ALL USING (user_has_tenant_access(tenant_id));

CREATE POLICY "Users can view their own metrics config" ON tenant_metrics_config
    FOR ALL USING (user_has_tenant_access(tenant_id));

CREATE POLICY "Users can view their own metrics values" ON tenant_metrics_values
    FOR ALL USING (metric_id IN (
        SELECT id FROM tenant_metrics_config WHERE user_has_tenant_access(tenant_id)
    ));

CREATE POLICY "Users can view their own post-sale rules" ON post_sale_rules
    FOR ALL USING (user_has_tenant_access(tenant_id));

CREATE POLICY "Users can view their own upsell opportunities" ON upsell_opportunities
    FOR ALL USING (user_has_tenant_access(tenant_id));

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
