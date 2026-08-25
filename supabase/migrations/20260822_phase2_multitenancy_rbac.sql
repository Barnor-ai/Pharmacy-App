-- ==============================================================================
-- PHARMACY MANAGEMENT SAAS — PHASE 2 MULTI-TENANT MIGRATION
-- Tech Stack: Supabase PostgreSQL, Supabase Auth
-- Architecture: Supabase Auth -> Profiles -> Organizations -> (Members + Roles) -> Permissions -> RLS
-- ==============================================================================

-- 0. EXTENSIONS & PREREQUISITES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. CORE AUTHENTICATION & MULTI-TENANCY RBAC TABLES
-- ==============================================================================

-- 1.1 PROFILES (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 ORGANIZATIONS (Tenants)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.3 ROLES (Tenant-Scoped & Predefined Roles)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_roles_org_name UNIQUE (organization_id, name)
);

-- 1.4 PERMISSIONS (Global System Catalog)
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.5 ROLE_PERMISSIONS (Mapping Table)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- 1.6 ORGANIZATION_MEMBERS (Tenant Users / Membership)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_member_org_user UNIQUE (organization_id, user_id)
);

-- ==============================================================================
-- 2. BUSINESS DOMAIN TABLES (Tenant-Scoped via organization_id)
-- ==============================================================================

-- 2.1 SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 MEDICINES (Inventory)
CREATE TABLE IF NOT EXISTS public.medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  generic_name TEXT,
  barcode TEXT,
  batch_number TEXT,
  category TEXT,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 CUSTOMERS (Patients / Clients)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 SALES (POS Orders / Invoices)
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  sold_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 SALE_ITEMS (Line Items)
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  doctor_name TEXT,
  file_url TEXT,
  notes TEXT,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.7 EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. AUDIT LOGS (Compliance & Change Tracking)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance & Multitenancy Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_org ON public.roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_org ON public.suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_medicines_org ON public.medicines(organization_id);
CREATE INDEX IF NOT EXISTS idx_medicines_barcode ON public.medicines(organization_id, barcode);
CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_org ON public.sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_org ON public.prescriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org ON public.expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON public.audit_logs(organization_id, created_at DESC);

-- ==============================================================================
-- 4. HELPER FUNCTIONS FOR ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- 4.1 Get current user's active tenant organization ID
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = auth.uid()
    AND om.is_active = TRUE
  ORDER BY om.joined_at ASC
  LIMIT 1;
$$;

-- 4.2 Check if user has permission in active organization
CREATE OR REPLACE FUNCTION public.has_permission(permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_perm BOOLEAN;
BEGIN
  -- Organization owner holds all permissions implicitly
  IF EXISTS (
    SELECT 1 
    FROM public.organizations o
    WHERE o.id = public.get_my_organization_id()
      AND o.owner_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Verify role permission assignment
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    JOIN public.role_permissions rp ON rp.role_id = om.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE om.user_id = auth.uid()
      AND om.organization_id = public.get_my_organization_id()
      AND om.is_active = TRUE
      AND p.name = permission_name
  ) INTO v_has_perm;

  RETURN COALESCE(v_has_perm, FALSE);
END;
$$;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5.1 Profiles
CREATE POLICY "Profiles viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 5.2 Organizations
CREATE POLICY "Users can view their organizations" ON public.organizations FOR SELECT TO authenticated
  USING (id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = TRUE) OR owner_id = auth.uid());
CREATE POLICY "Authenticated users can create organizations" ON public.organizations FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner can update organization" ON public.organizations FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner can delete organization" ON public.organizations FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- 5.3 Roles & Permissions
CREATE POLICY "View tenant roles" ON public.roles FOR SELECT TO authenticated USING (organization_id = public.get_my_organization_id() OR is_system_role = TRUE);
CREATE POLICY "Manage tenant roles" ON public.roles FOR ALL TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('roles.manage')) WITH CHECK (organization_id = public.get_my_organization_id() AND public.has_permission('roles.manage'));
CREATE POLICY "View permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "View role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (role_id IN (SELECT id FROM public.roles WHERE organization_id = public.get_my_organization_id() OR is_system_role = TRUE));
CREATE POLICY "Manage role_permissions" ON public.role_permissions FOR ALL TO authenticated USING (public.has_permission('roles.manage')) WITH CHECK (public.has_permission('roles.manage'));

-- 5.4 Organization Members
CREATE POLICY "View organization members" ON public.organization_members FOR SELECT TO authenticated USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Manage organization members" ON public.organization_members FOR ALL TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('members.manage')) WITH CHECK (organization_id = public.get_my_organization_id() AND public.has_permission('members.manage'));

-- 5.5 Business Domain Policies (Generic Helper Pattern)
CREATE POLICY "Tenant select suppliers" ON public.suppliers FOR SELECT TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('suppliers.read'));
CREATE POLICY "Tenant insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_my_organization_id() AND public.has_permission('suppliers.create'));
CREATE POLICY "Tenant update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('suppliers.update')) WITH CHECK (organization_id = public.get_my_organization_id() AND public.has_permission('suppliers.update'));
CREATE POLICY "Tenant delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('suppliers.delete'));

CREATE POLICY "Tenant select medicines" ON public.medicines FOR SELECT TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('medicines.read'));
CREATE POLICY "Tenant insert medicines" ON public.medicines FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_my_organization_id() AND public.has_permission('medicines.create'));
CREATE POLICY "Tenant update medicines" ON public.medicines FOR UPDATE TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('medicines.update')) WITH CHECK (organization_id = public.get_my_organization_id() AND public.has_permission('medicines.update'));
CREATE POLICY "Tenant delete medicines" ON public.medicines FOR DELETE TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('medicines.delete'));

CREATE POLICY "Tenant select customers" ON public.customers FOR SELECT TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('customers.read'));
CREATE POLICY "Tenant insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_my_organization_id() AND public.has_permission('customers.create'));
CREATE POLICY "Tenant update customers" ON public.customers FOR UPDATE TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('customers.update')) WITH CHECK (organization_id = public.get_my_organization_id() AND public.has_permission('customers.update'));
CREATE POLICY "Tenant delete customers" ON public.customers FOR DELETE TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('customers.delete'));

CREATE POLICY "Tenant select sales" ON public.sales FOR SELECT TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('sales.read'));
CREATE POLICY "Tenant insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_my_organization_id() AND public.has_permission('sales.create'));

CREATE POLICY "Tenant select sale_items" ON public.sale_items FOR SELECT TO authenticated USING (sale_id IN (SELECT id FROM public.sales WHERE organization_id = public.get_my_organization_id()));
CREATE POLICY "Tenant insert sale_items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (sale_id IN (SELECT id FROM public.sales WHERE organization_id = public.get_my_organization_id() AND public.has_permission('sales.create')));

CREATE POLICY "Tenant select prescriptions" ON public.prescriptions FOR SELECT TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('prescriptions.read'));
CREATE POLICY "Tenant insert prescriptions" ON public.prescriptions FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_my_organization_id() AND public.has_permission('prescriptions.create'));
CREATE POLICY "Tenant update prescriptions" ON public.prescriptions FOR UPDATE TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('prescriptions.update')) WITH CHECK (organization_id = public.get_my_organization_id() AND public.has_permission('prescriptions.update'));

CREATE POLICY "Tenant select expenses" ON public.expenses FOR SELECT TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('expenses.read'));
CREATE POLICY "Tenant insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_my_organization_id() AND public.has_permission('expenses.create'));
CREATE POLICY "Tenant update expenses" ON public.expenses FOR UPDATE TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('expenses.update')) WITH CHECK (organization_id = public.get_my_organization_id() AND public.has_permission('expenses.update'));
CREATE POLICY "Tenant delete expenses" ON public.expenses FOR DELETE TO authenticated USING (organization_id = public.get_my_organization_id() AND public.has_permission('expenses.delete'));

-- 5.6 Audit Logs Policies (Trigger-only inserts, Select for Admin/Owner)
CREATE POLICY "Admins and Owners can view audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_organization_id()
    AND (
      EXISTS (SELECT 1 FROM public.organizations WHERE id = public.get_my_organization_id() AND owner_id = auth.uid())
      OR public.has_permission('audit.read')
    )
  );

-- ==============================================================================
-- 6. AUTOMATION: TRIGGERS & SEED FUNCTIONS
-- ==============================================================================

-- 6.1 Trigger: Auto-create Profile on auth.users Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6.2 Trigger: Audit Logger for Business Tables
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_record_id UUID;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_org_id := OLD.organization_id;
    v_record_id := OLD.id;
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (v_org_id, auth.uid(), 'DELETE', TG_TABLE_NAME, v_record_id, to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_org_id := NEW.organization_id;
    v_record_id := NEW.id;
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (v_org_id, auth.uid(), 'UPDATE', TG_TABLE_NAME, v_record_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    v_org_id := NEW.organization_id;
    v_record_id := NEW.id;
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (v_org_id, auth.uid(), 'INSERT', TG_TABLE_NAME, v_record_id, NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_medicines ON public.medicines;
CREATE TRIGGER audit_medicines AFTER INSERT OR UPDATE OR DELETE ON public.medicines FOR EACH ROW EXECUTE FUNCTION public.log_audit();

DROP TRIGGER IF EXISTS audit_sales ON public.sales;
CREATE TRIGGER audit_sales AFTER INSERT OR UPDATE OR DELETE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.log_audit();

DROP TRIGGER IF EXISTS audit_expenses ON public.expenses;
CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- 6.3 Automation: Seed Global Permissions & Provision Default Tenant Roles
CREATE OR REPLACE FUNCTION public.seed_default_organization_roles(p_org_id UUID, p_owner_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_owner UUID;
  v_role_admin UUID;
  v_role_pharmacist UUID;
  v_role_cashier UUID;
BEGIN
  -- Ensure global permissions catalog is populated
  INSERT INTO public.permissions (name, description) VALUES
    ('medicines.create', 'Create medicines and catalog items'),
    ('medicines.read', 'View medicines and inventory levels'),
    ('medicines.update', 'Modify medicine details, batches, and prices'),
    ('medicines.delete', 'Remove medicines from inventory'),
    ('sales.create', 'Process checkout sales and generate invoices'),
    ('sales.read', 'View sales records and invoices'),
    ('customers.create', 'Register new patients and customers'),
    ('customers.read', 'View customer details and history'),
    ('customers.update', 'Update customer contact info and allergies'),
    ('customers.delete', 'Remove customer records'),
    ('suppliers.create', 'Add new pharmaceutical suppliers'),
    ('suppliers.read', 'View suppliers and wholesaler balances'),
    ('suppliers.update', 'Update supplier information'),
    ('suppliers.delete', 'Remove suppliers'),
    ('prescriptions.create', 'Upload and record new prescriptions'),
    ('prescriptions.read', 'View patient prescriptions'),
    ('prescriptions.update', 'Update prescription dispensing status'),
    ('expenses.create', 'Record operating expenses'),
    ('expenses.read', 'View expense ledgers'),
    ('expenses.update', 'Edit recorded expenses'),
    ('expenses.delete', 'Delete expense entries'),
    ('roles.manage', 'Create and modify custom roles and permissions'),
    ('members.manage', 'Invite, update, and remove staff members'),
    ('audit.read', 'View security audit logs and compliance history')
  ON CONFLICT (name) DO NOTHING;

  -- Create Default Tenant Roles
  INSERT INTO public.roles (organization_id, name, description, is_system_role)
  VALUES (p_org_id, 'Owner', 'Complete administrative authority over the pharmacy tenant', TRUE)
  RETURNING id INTO v_role_owner;

  INSERT INTO public.roles (organization_id, name, description, is_system_role)
  VALUES (p_org_id, 'Admin', 'Pharmacy manager with permissions to manage inventory, staff, and reports', TRUE)
  RETURNING id INTO v_role_admin;

  INSERT INTO public.roles (organization_id, name, description, is_system_role)
  VALUES (p_org_id, 'Pharmacist', 'Clinical staff authorized for inventory dispensing, prescriptions, and POS', TRUE)
  RETURNING id INTO v_role_pharmacist;

  INSERT INTO public.roles (organization_id, name, description, is_system_role)
  VALUES (p_org_id, 'Cashier', 'POS operator authorized for point-of-sale checkout and customer creation', TRUE)
  RETURNING id INTO v_role_cashier;

  -- Assign All Permissions to Owner & Admin
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_owner, id FROM public.permissions;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_admin, id FROM public.permissions;

  -- Assign Pharmacist Permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_pharmacist, id FROM public.permissions
  WHERE name IN (
    'medicines.create', 'medicines.read', 'medicines.update',
    'sales.create', 'sales.read',
    'customers.create', 'customers.read', 'customers.update',
    'prescriptions.create', 'prescriptions.read', 'prescriptions.update',
    'suppliers.read'
  );

  -- Assign Cashier Permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_cashier, id FROM public.permissions
  WHERE name IN (
    'medicines.read',
    'sales.create', 'sales.read',
    'customers.create', 'customers.read',
    'prescriptions.read'
  );

  -- Register Owner as primary Organization Member
  INSERT INTO public.organization_members (organization_id, user_id, role_id, is_active)
  VALUES (p_org_id, p_owner_id, v_role_owner, TRUE)
  ON CONFLICT (organization_id, user_id) DO NOTHING;
END;
$$;

-- Trigger: Automatically bootstrap default roles on organization creation
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_organization_roles(NEW.id, NEW.owner_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization();
