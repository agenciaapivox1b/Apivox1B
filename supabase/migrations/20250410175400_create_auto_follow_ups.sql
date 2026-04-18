-- Criar tabela para follow-ups automáticos
CREATE TABLE IF NOT EXISTS auto_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'no_response',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'canceled')),
  action TEXT NOT NULL DEFAULT 'Cobrar resposta',
  due_date TIMESTAMPTZ NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_auto_follow_ups_tenant_id ON auto_follow_ups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auto_follow_ups_contact_id ON auto_follow_ups(contact_id);
CREATE INDEX IF NOT EXISTS idx_auto_follow_ups_status ON auto_follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_auto_follow_ups_due_date ON auto_follow_ups(due_date);
CREATE INDEX IF NOT EXISTS idx_auto_follow_ups_tenant_status ON auto_follow_ups(tenant_id, status);

-- RLS Policies
ALTER TABLE auto_follow_ups ENABLE ROW LEVEL SECURITY;

-- Policy para select (usuário vê apenas do seu tenant)
CREATE POLICY "Users can view their tenant auto_follow_ups"
  ON auto_follow_ups FOR SELECT
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE owner_id = auth.uid()
  ));

-- Policy para insert (usuário pode criar apenas no seu tenant)
CREATE POLICY "Users can create auto_follow_ups in their tenant"
  ON auto_follow_ups FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT id FROM tenants WHERE owner_id = auth.uid()
  ));

-- Policy para update (usuário pode atualizar apenas do seu tenant)
CREATE POLICY "Users can update their tenant auto_follow_ups"
  ON auto_follow_ups FOR UPDATE
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE owner_id = auth.uid()
  ));

-- Policy para delete (usuário pode deletar apenas do seu tenant)
CREATE POLICY "Users can delete their tenant auto_follow_ups"
  ON auto_follow_ups FOR DELETE
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE owner_id = auth.uid()
  ));

-- Comentários
COMMENT ON TABLE auto_follow_ups IS 'Automated follow-ups for contacts without response';
COMMENT ON COLUMN auto_follow_ups.type IS 'Type of follow-up (no_response, manual)';
COMMENT ON COLUMN auto_follow_ups.status IS 'Status: pending, done, canceled';
