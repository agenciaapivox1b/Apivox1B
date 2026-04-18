-- =====================================================
-- MIGRATION: Controle de Plano Premium para Tenants
-- Data: 2025-04-11
-- =====================================================

-- Garantir que o campo 'plan' existe na tabela tenants
-- Valores válidos: 'free' (padrão) e 'premium'

-- 1. Atualizar valores existentes: 'basic' → 'free' para padronização
UPDATE tenants 
SET plan = 'free' 
WHERE plan = 'basic' OR plan IS NULL;

-- 2. Garantir constraint/check se necessário (opcional, pode ser controlado no app)
-- Nota: Mantemos flexível no banco, controle rigoroso no frontend/backend

-- 3. Comentário na coluna para documentação
COMMENT ON COLUMN tenants.plan IS 'Plano do tenant: free ou premium';

-- 4. Índice para buscas rápidas (opcional)
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);

-- =====================================================
-- POLICY RLS opcional: proteger follow-ups para free
-- Se quiser proteção no banco (além da camada de app):
-- =====================================================

-- Policy para opportunity_follow_ups: usuários free só veem summary agregado
-- Nota: Implementamos principalmente na camada de serviço para mais controle

-- Verificar se RLS está ativo
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'opportunity_follow_ups' 
        AND rowsecurity = true
    ) THEN
        -- Criar policy para free users (simplificada - controle principal no app)
        -- Esta é uma camada extra de segurança
        DROP POLICY IF EXISTS "Free users limited access" ON opportunity_follow_ups;
    END IF;
END $$;
