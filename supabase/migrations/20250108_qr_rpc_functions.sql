-- =====================================================
-- RPC FUNCTIONS PARA CONTADORES QR
-- 
-- Funções para incrementar mensagens enviadas/recebidas
-- de forma segura (race condition safe)
-- =====================================================

-- Função para incrementar mensagens enviadas
CREATE OR REPLACE FUNCTION increment_qr_messages_sent(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE whatsapp_qr_sessions
  SET 
    messages_sent = messages_sent + 1,
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Função para incrementar mensagens recebidas
CREATE OR REPLACE FUNCTION increment_qr_messages_received(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE whatsapp_qr_sessions
  SET 
    messages_received = messages_received + 1,
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON FUNCTION increment_qr_messages_sent IS 'Incrementa contador de mensagens enviadas via QR Code';
COMMENT ON FUNCTION increment_qr_messages_received IS 'Incrementa contador de mensagens recebidas via QR Code';

