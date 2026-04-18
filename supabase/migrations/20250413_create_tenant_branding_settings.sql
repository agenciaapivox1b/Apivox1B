-- Migration: Criar tabela de configurações de branding por tenant
-- Data: 2025-04-13

-- Criar tabela tenant_branding_settings
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

-- Habilitar RLS
ALTER TABLE tenant_branding_settings ENABLE ROW LEVEL SECURITY;

-- Criar função para atualizar o updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar política de isolamento de tenant
CREATE POLICY "Tenant isolation" ON tenant_branding_settings
    FOR ALL USING (tenant_id::text IN (
        SELECT id::text FROM tenants WHERE owner_id = auth.uid()
    ));

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_tenant_branding_settings_updated_at 
    BEFORE UPDATE ON tenant_branding_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentário explicativo
COMMENT ON TABLE tenant_branding_settings IS 'Configurações de branding e personalização por tenant';
