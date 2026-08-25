-- ==============================================================================
-- PHASE 6B: PERSIST PHARMACY & ORGANIZATION SETTINGS
-- Adds organization configuration columns, logo URL, tax rates, and strict RLS
-- ==============================================================================

-- 1. ADD ORGANIZATION SETTINGS COLUMNS TO public.organizations
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS vat_number TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'INV',
  ADD COLUMN IF NOT EXISTS receipt_header_notice TEXT DEFAULT 'Thank you for choosing our pharmacy!',
  ADD COLUMN IF NOT EXISTS receipt_footer_notice TEXT DEFAULT 'Medicines sold are non-refundable after 48h. Valid prescription required for Rx items.',
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 5.00;

-- 2. ENSURE RLS POLICIES FOR ORGANIZATIONS (Strict Tenant Isolation)
-- View policy: Active members or owner can view their organization
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Insert policy: Authenticated users can create an organization where they are the owner
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Update policy: Owner or Authorized Admins/Managers can update organization settings
-- Prevents Organization A from updating Organization B and prevents Cashier/Pharmacist without admin permissions from updating
DROP POLICY IF EXISTS "Owner can update organization" ON public.organizations;
DROP POLICY IF EXISTS "Authorized members can update organization" ON public.organizations;

CREATE POLICY "Authorized members can update organization" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR (
      id = public.get_my_organization_id()
      AND (
        public.has_permission('roles.manage')
        OR public.has_permission('members.manage')
        OR EXISTS (
          SELECT 1 
          FROM public.organization_members om
          JOIN public.roles r ON om.role_id = r.id
          WHERE om.organization_id = public.organizations.id
            AND om.user_id = auth.uid()
            AND om.is_active = TRUE
            AND r.name IN ('Owner', 'Admin', 'Super Admin', 'Store Manager')
        )
      )
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR (
      id = public.get_my_organization_id()
      AND (
        public.has_permission('roles.manage')
        OR public.has_permission('members.manage')
        OR EXISTS (
          SELECT 1 
          FROM public.organization_members om
          JOIN public.roles r ON om.role_id = r.id
          WHERE om.organization_id = public.organizations.id
            AND om.user_id = auth.uid()
            AND om.is_active = TRUE
            AND r.name IN ('Owner', 'Admin', 'Super Admin', 'Store Manager')
        )
      )
    )
  );

-- Delete policy: Only Owner can delete organization
DROP POLICY IF EXISTS "Owner can delete organization" ON public.organizations;
CREATE POLICY "Owner can delete organization" ON public.organizations
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- 3. AUDIT TRIGGER FOR ORGANIZATION SETTINGS UPDATE (Optional security log)
CREATE OR REPLACE FUNCTION public.audit_organization_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    user_name,
    user_role,
    action,
    module,
    details
  ) VALUES (
    NEW.id,
    auth.uid(),
    COALESCE((SELECT full_name FROM public.profiles WHERE id = auth.uid()), 'System Admin'),
    'Admin',
    'Updated Organization Settings',
    'Settings',
    CONCAT('Updated pharmacy details for ', NEW.name, ' (Currency: ', COALESCE(NEW.currency, 'USD'), ', Tax: ', COALESCE(NEW.tax_rate, 5.00)::text, '%)')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_organization_update ON public.organizations;
CREATE TRIGGER trg_audit_organization_update
AFTER UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.audit_organization_update();
