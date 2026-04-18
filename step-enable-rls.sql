-- =====================================================
-- APIVOX - Habilitar RLS (Execute este script primeiro)
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
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se RLS foi habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'tenants', 'tenant_whatsapp_settings', 'contacts', 'conversations', 
    'messages', 'opportunities', 'follow_ups', 'charges',
    'tenant_metrics_config', 'tenant_metrics_values', 
    'post_sale_rules', 'upsell_opportunities'
)
ORDER BY tablename;
