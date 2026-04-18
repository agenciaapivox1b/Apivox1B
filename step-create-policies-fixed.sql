-- =====================================================
-- APIVOX - Políticas RLS (Execute após habilitar RLS e criar tabelas)
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
-- POLÍTICAS DE SEGURANÇA POR TABELA (apenas se tabelas existirem)
-- =====================================================

-- Tabela: tenants (apenas owner pode acessar)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
        DROP POLICY IF EXISTS "Users can insert their own tenant" ON tenants;
        DROP POLICY IF EXISTS "Users can update their own tenant" ON tenants;
        DROP POLICY IF EXISTS "Users can delete their own tenant" ON tenants;
        
        CREATE POLICY "Users can view their own tenant" ON tenants
            FOR SELECT USING (auth.uid() = owner_id);
        CREATE POLICY "Users can insert their own tenant" ON tenants
            FOR INSERT WITH CHECK (auth.uid() = owner_id);
        CREATE POLICY "Users can update their own tenant" ON tenants
            FOR UPDATE USING (auth.uid() = owner_id);
        CREATE POLICY "Users can delete their own tenant" ON tenants
            FOR DELETE USING (auth.uid() = owner_id);
    END IF;
END $$;

-- Tabelas multi-tenant (usando função auxiliar) - apenas se existirem
DO $$
BEGIN
    -- tenant_whatsapp_settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_whatsapp_settings' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view their own WhatsApp settings" ON tenant_whatsapp_settings;
        CREATE POLICY "Users can view their own WhatsApp settings" ON tenant_whatsapp_settings
            FOR ALL USING (user_has_tenant_access(tenant_id));
    END IF;
    
    -- contacts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
        CREATE POLICY "Users can view their own contacts" ON contacts
            FOR ALL USING (user_has_tenant_access(tenant_id));
    END IF;
    
    -- conversations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
        CREATE POLICY "Users can view their own conversations" ON conversations
            FOR ALL USING (user_has_tenant_access(tenant_id));
    END IF;
    
    -- messages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
        CREATE POLICY "Users can view their own messages" ON messages
            FOR ALL USING (user_has_tenant_access(tenant_id));
    END IF;
    
    -- opportunities
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'opportunities' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view their own opportunities" ON opportunities;
        CREATE POLICY "Users can view their own opportunities" ON opportunities
            FOR ALL USING (user_has_tenant_access(tenant_id));
    END IF;
    
    -- follow_ups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follow_ups' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view their own follow-ups" ON follow_ups;
        CREATE POLICY "Users can view their own follow-ups" ON follow_ups
            FOR ALL USING (user_has_tenant_access(tenant_id));
    END IF;
    
    -- charges
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'charges' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view their own charges" ON charges;
        CREATE POLICY "Users can view their own charges" ON charges
            FOR ALL USING (user_has_tenant_access(tenant_id));
    END IF;
    
    -- tenant_metrics_config
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_metrics_config' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view their own metrics config" ON tenant_metrics_config;
        CREATE POLICY "Users can view their own metrics config" ON tenant_metrics_config
            FOR ALL USING (user_has_tenant_access(tenant_id));
    END IF;
    
    -- tenant_metrics_values
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_metrics_values' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view their own metrics values" ON tenant_metrics_values;
        CREATE POLICY "Users can view their own metrics values" ON tenant_metrics_values
            FOR ALL USING (metric_id IN (
                SELECT id FROM tenant_metrics_config WHERE user_has_tenant_access(tenant_id)
            ));
    END IF;
    
    -- post_sale_rules
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_sale_rules' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view their own post-sale rules" ON post_sale_rules;
        CREATE POLICY "Users can view their own post-sale rules" ON post_sale_rules
            FOR ALL USING (user_has_tenant_access(tenant_id));
    END IF;
    
    -- upsell_opportunities
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'upsell_opportunities' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view their own upsell opportunities" ON upsell_opportunities;
        CREATE POLICY "Users can view their own upsell opportunities" ON upsell_opportunities
            FOR ALL USING (user_has_tenant_access(tenant_id));
    END IF;
END $$;

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
