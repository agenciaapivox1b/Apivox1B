-- =====================================================
-- FASE 1: MIGRATION SIMPLIFICADA - PARTE 3: VIEW
-- =====================================================

-- Criar view de compatibilidade com a tabela antiga
CREATE OR REPLACE VIEW tenant_whatsapp_settings_compat AS
SELECT 
    id,
    tenant_id,
    (config->>'phone_number_id')::VARCHAR(100) as phone_number_id,
    (config->>'business_account_id')::VARCHAR(100) as business_account_id,
    (config->>'encrypted_access_token')::TEXT as encrypted_access_token,
    (config->>'verify_token')::VARCHAR(255) as verify_token,
    webhook_status,
    (config->>'webhook_url')::TEXT as webhook_url,
    last_test_status,
    last_test_message,
    last_test_at,
    last_connected_at,
    created_at,
    updated_at
FROM tenant_whatsapp_configs
WHERE provider_type = 'whatsapp_meta';

-- Comentário sobre a view
COMMENT ON VIEW tenant_whatsapp_settings_compat IS 
'View de compatibilidade que mapeia a nova estrutura tenant_whatsapp_configs 
para o formato antigo tenant_whatsapp_settings. 
Usar para manter compatibilidade com código antigo durante a transição.';

