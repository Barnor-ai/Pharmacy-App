-- ==============================================================================
-- PHASE 6C: COMMERCIAL SAAS ONBOARDING, SUBSCRIPTION PLANS & BILLING
-- Multi-Tenant Subscriptions, Tiered Limits, 14-Day Free Trial & Audit Logging
-- ==============================================================================

-- 1. SUBSCRIPTION PLANS TABLE
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_interval TEXT NOT NULL DEFAULT 'month',
  max_users INTEGER NOT NULL DEFAULT 3,
  max_medicines INTEGER NOT NULL DEFAULT 1000,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'expired', 'incomplete')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  trial_start TIMESTAMPTZ DEFAULT NOW(),
  trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  provider TEXT DEFAULT 'manual',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for speedy lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- 3. SEED DEFAULT COMMERCIAL PLANS
INSERT INTO public.subscription_plans (id, name, slug, description, price, currency, billing_interval, max_users, max_medicines, features, is_active)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Starter',
    'starter',
    'Essential pharmacy management tools for single-counter dispensaries.',
    29.00,
    'USD',
    'month',
    3,
    1000,
    '[
      "core_inventory",
      "pos",
      "customers",
      "suppliers",
      "prescriptions",
      "basic_reports"
    ]'::jsonb,
    TRUE
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Professional',
    'professional',
    'Full management suite for growing clinical and retail pharmacies with advanced staff controls.',
    79.00,
    'USD',
    'month',
    10,
    10000,
    '[
      "core_inventory",
      "pos",
      "customers",
      "suppliers",
      "prescriptions",
      "basic_reports",
      "advanced_reports",
      "audit_logs",
      "barcode_scanner",
      "pdf_invoices",
      "automated_alerts",
      "advanced_staff_permissions"
    ]'::jsonb,
    TRUE
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Business / Enterprise',
    'business',
    'Uncapped scale, high-throughput inventory, advanced analytics and priority support.',
    199.00,
    'USD',
    'month',
    9999,
    100000,
    '[
      "core_inventory",
      "pos",
      "customers",
      "suppliers",
      "prescriptions",
      "basic_reports",
      "advanced_reports",
      "audit_logs",
      "barcode_scanner",
      "pdf_invoices",
      "automated_alerts",
      "advanced_staff_permissions",
      "advanced_analytics",
      "priority_support",
      "multi_branch"
    ]'::jsonb,
    TRUE
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  max_users = EXCLUDED.max_users,
  max_medicines = EXCLUDED.max_medicines,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;

-- 4. ROW-LEVEL SECURITY (RLS) POLICIES

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 4.1 subscription_plans Policies
DROP POLICY IF EXISTS "Public can view active subscription plans" ON public.subscription_plans;
CREATE POLICY "Public can view active subscription plans" ON public.subscription_plans
  FOR SELECT TO authenticated, anon
  USING (is_active = TRUE);

-- 4.2 subscriptions Policies
DROP POLICY IF EXISTS "Members can view their organization subscription" ON public.subscriptions;
CREATE POLICY "Members can view their organization subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "Owner can manage their organization subscription" ON public.subscriptions;
CREATE POLICY "Owner can manage their organization subscription" ON public.subscriptions
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

-- 5. FUNCTION & TRIGGER: AUTOMATIC 14-DAY TRIAL PROVISIONING
CREATE OR REPLACE FUNCTION public.provision_trial_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_plan_id UUID;
BEGIN
  -- Get Starter plan ID
  SELECT id INTO v_default_plan_id
  FROM public.subscription_plans
  WHERE slug = 'starter'
  LIMIT 1;

  IF v_default_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      organization_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      trial_start,
      trial_end,
      provider
    ) VALUES (
      NEW.id,
      v_default_plan_id,
      'trialing',
      NOW(),
      NOW() + INTERVAL '14 days',
      NOW(),
      NOW() + INTERVAL '14 days',
      'manual'
    )
    ON CONFLICT (organization_id) DO NOTHING;

    -- Audit Log entry for trial setup
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
      NEW.owner_id,
      'System',
      'System',
      'Trial Started',
      'Billing',
      CONCAT('14-day free trial initialized on Starter plan for organization: ', NEW.name)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provision_trial_subscription ON public.organizations;
CREATE TRIGGER trg_provision_trial_subscription
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.provision_trial_subscription();

-- Backfill trial subscription for any existing organizations that lack one
INSERT INTO public.subscriptions (
  organization_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  trial_start,
  trial_end,
  provider
)
SELECT 
  o.id,
  (SELECT id FROM public.subscription_plans WHERE slug = 'starter' LIMIT 1),
  'trialing',
  NOW(),
  NOW() + INTERVAL '14 days',
  NOW(),
  NOW() + INTERVAL '14 days',
  'manual'
FROM public.organizations o
LEFT JOIN public.subscriptions s ON o.id = s.organization_id
WHERE s.id IS NULL AND (SELECT id FROM public.subscription_plans WHERE slug = 'starter' LIMIT 1) IS NOT NULL
ON CONFLICT (organization_id) DO NOTHING;

-- 6. RPC: SECURE PLAN CHANGE / UPGRADE (OWNER ONLY)
CREATE OR REPLACE FUNCTION public.change_subscription_plan(
  p_org_id UUID,
  p_plan_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_plan_name TEXT;
  v_old_plan_name TEXT;
  v_is_owner BOOLEAN;
  v_sub_id UUID;
BEGIN
  -- Verify caller is organization owner or has roles.manage
  SELECT (owner_id = auth.uid()) INTO v_is_owner
  FROM public.organizations
  WHERE id = p_org_id;

  IF NOT COALESCE(v_is_owner, FALSE) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only the organization owner can change subscription plans.');
  END IF;

  -- Resolve target plan
  SELECT id, name INTO v_plan_id, v_plan_name
  FROM public.subscription_plans
  WHERE slug = p_plan_slug AND is_active = TRUE;

  IF v_plan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid subscription plan specified.');
  END IF;

  -- Fetch current plan name for audit
  SELECT sp.name, s.id INTO v_old_plan_name, v_sub_id
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.organization_id = p_org_id;

  -- Upsert subscription
  IF v_sub_id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET 
      plan_id = v_plan_id,
      status = 'active',
      current_period_start = NOW(),
      current_period_end = NOW() + INTERVAL '1 month',
      updated_at = NOW()
    WHERE id = v_sub_id;
  ELSE
    INSERT INTO public.subscriptions (
      organization_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      provider
    ) VALUES (
      p_org_id,
      v_plan_id,
      'active',
      NOW(),
      NOW() + INTERVAL '1 month',
      'manual'
    );
  END IF;

  -- Record Audit Log
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    user_name,
    user_role,
    action,
    module,
    details
  ) VALUES (
    p_org_id,
    auth.uid(),
    COALESCE((SELECT full_name FROM public.profiles WHERE id = auth.uid()), 'Owner'),
    'Owner',
    'Plan Changed',
    'Billing',
    CONCAT('Upgraded subscription plan from ', COALESCE(v_old_plan_name, 'None'), ' to ', v_plan_name)
  );

  RETURN jsonb_build_object(
    'success', true, 
    'message', CONCAT('Successfully upgraded to ', v_plan_name, ' plan.'),
    'plan', v_plan_name
  );
END;
$$;

-- 7. ENFORCEMENT FUNCTIONS FOR MEDICINES & USER LIMITS
CREATE OR REPLACE FUNCTION public.check_organization_can_add_user(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_users INTEGER;
  v_current_users INTEGER;
BEGIN
  SELECT sp.max_users INTO v_max_users
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.organization_id = p_org_id;

  IF v_max_users IS NULL THEN
    v_max_users := 3; -- Default fallback
  END IF;

  SELECT COUNT(*) INTO v_current_users
  FROM public.organization_members
  WHERE organization_id = p_org_id AND is_active = TRUE;

  RETURN (v_current_users < v_max_users);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_organization_can_add_medicine(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_medicines INTEGER;
  v_current_medicines INTEGER;
BEGIN
  SELECT sp.max_medicines INTO v_max_medicines
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.organization_id = p_org_id;

  IF v_max_medicines IS NULL THEN
    v_max_medicines := 1000; -- Default fallback
  END IF;

  SELECT COUNT(*) INTO v_current_medicines
  FROM public.medicines
  WHERE organization_id = p_org_id;

  RETURN (v_current_medicines < v_max_medicines);
END;
$$;
