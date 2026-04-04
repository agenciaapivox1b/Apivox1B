-- Migration: Add RLS (Row Level Security) to tenant_payment_settings
-- Date: 2026-03-27
-- Purpose: Secure multi-tenant access - users can only access their own tenant's payment settings

-- STEP 1: Enable RLS on the table
ALTER TABLE IF EXISTS tenant_payment_settings ENABLE ROW LEVEL SECURITY;

-- STEP 2: Create policy for SELECT (read)
-- Users can read their tenant's payment settings
CREATE POLICY IF NOT EXISTS "Users can read own tenant payment settings"
ON tenant_payment_settings
FOR SELECT
USING (
  -- Check if the tenant_id matches current user's tenant
  tenant_id = (
    SELECT tenant_id FROM auth.users 
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- STEP 3: Create policy for INSERT (create)
-- Users can insert payment settings for their own tenant
CREATE POLICY IF NOT EXISTS "Users can insert own tenant payment settings"
ON tenant_payment_settings
FOR INSERT
WITH CHECK (
  tenant_id = (
    SELECT tenant_id FROM auth.users 
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- STEP 4: Create policy for UPDATE (modify)
-- Users can update their own tenant's payment settings
CREATE POLICY IF NOT EXISTS "Users can update own tenant payment settings"
ON tenant_payment_settings
FOR UPDATE
USING (
  tenant_id = (
    SELECT tenant_id FROM auth.users 
    WHERE id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  tenant_id = (
    SELECT tenant_id FROM auth.users 
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- STEP 5: Create policy for DELETE (optional)
-- Users can delete their own tenant's payment settings
CREATE POLICY IF NOT EXISTS "Users can delete own tenant payment settings"
ON tenant_payment_settings
FOR DELETE
USING (
  tenant_id = (
    SELECT tenant_id FROM auth.users 
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- COMMENT: Explain the policies
COMMENT ON TABLE tenant_payment_settings IS 'Configurações de pagamento por tenant - protegidas por RLS (cada usuário vê apenas seu próprio tenant)';
