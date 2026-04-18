-- =====================================================
-- APIVOX - Política RLS Corrigida para Tabela Tenants
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can insert their own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can update their own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can delete their own tenant" ON tenants;

-- Política correta: apenas SELECT e UPDATE pelo owner
CREATE POLICY "Users can view their own tenant" ON tenants
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own tenant" ON tenants
    FOR UPDATE USING (auth.uid() = owner_id);

-- NÃO permitir INSERT direto pelo frontend
-- INSERT será feito apenas via Edge Function com SERVICE_ROLE

-- DELETE permitido apenas pelo owner
CREATE POLICY "Users can delete their own tenant" ON tenants
    FOR DELETE USING (auth.uid() = owner_id);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar políticas da tabela tenants
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'tenants';
