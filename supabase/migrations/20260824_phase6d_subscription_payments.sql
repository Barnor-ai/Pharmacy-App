-- ==============================================================================
-- PHASE 6D: REAL SUBSCRIPTION PAYMENTS & BILLING (PAYSTACK & MODULAR GATEWAYS)
-- Multi-Tenant Payment History, Server Verification, Idempotency & Lifecycle
-- ==============================================================================

-- 1. EXTEND SUBSCRIPTIONS TABLE
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_downgrade_plan_id UUID REFERENCES public.subscription_plans(id),
  ADD COLUMN IF NOT EXISTS pending_downgrade_at TIMESTAMPTZ;

-- 2. CREATE SUBSCRIPTION PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.subscription_plans(id),
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'refunded')),
  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_transaction_id TEXT,
  payment_reference TEXT NOT NULL UNIQUE,
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for speedy history lookup & idempotency checks
CREATE INDEX IF NOT EXISTS idx_subscription_payments_org ON public.subscription_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_ref ON public.subscription_payments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_sub ON public.subscription_payments(subscription_id);

-- 3. ROW-LEVEL SECURITY (RLS) POLICIES FOR SUBSCRIPTION PAYMENTS
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- 3.1 Members can view their organization billing history
DROP POLICY IF EXISTS "Members can view organization payment history" ON public.subscription_payments;
CREATE POLICY "Members can view organization payment history" ON public.subscription_payments
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- 3.2 Owners can insert/manage payments for their organization
DROP POLICY IF EXISTS "Owners can manage organization payments" ON public.subscription_payments;
CREATE POLICY "Owners can manage organization payments" ON public.subscription_payments
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

-- 4. AUTHORITATIVE SERVER-SIDE PAYMENT VERIFICATION & ACTIVATION RPC
CREATE OR REPLACE FUNCTION public.record_verified_payment(
  p_org_id UUID,
  p_plan_slug TEXT,
  p_payment_reference TEXT,
  p_amount NUMERIC(10, 2),
  p_currency TEXT,
  p_provider TEXT,
  p_provider_tx_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_plan_name TEXT;
  v_plan_price NUMERIC(10, 2);
  v_plan_interval TEXT;
  v_sub_id UUID;
  v_existing_payment UUID;
  v_is_owner BOOLEAN;
  v_interval_duration INTERVAL;
  v_new_period_end TIMESTAMPTZ;
  v_payment_id UUID;
BEGIN
  -- 1. Authorize: Check if caller is organization owner or executing as service_role
  IF auth.uid() IS NOT NULL THEN
    SELECT (owner_id = auth.uid()) INTO v_is_owner
    FROM public.organizations
    WHERE id = p_org_id;

    IF NOT COALESCE(v_is_owner, FALSE) THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Unauthorized: Only the Organization Owner can process subscription billing.'
      );
    END IF;
  END IF;

  -- 2. Idempotency Check: Verify if payment reference was already recorded as success
  SELECT id INTO v_existing_payment
  FROM public.subscription_payments
  WHERE payment_reference = p_payment_reference AND status = 'success'
  LIMIT 1;

  IF v_existing_payment IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Payment already processed and verified.',
      'payment_id', v_existing_payment,
      'is_duplicate', true
    );
  END IF;

  -- 3. Resolve Authoritative Plan Information from Database
  SELECT id, name, price, billing_interval
  INTO v_plan_id, v_plan_name, v_plan_price, v_plan_interval
  FROM public.subscription_plans
  WHERE slug = p_plan_slug AND is_active = TRUE;

  IF v_plan_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid or inactive subscription plan specified.'
    );
  END IF;

  -- 4. Calculate Billing Interval Period End
  IF v_plan_interval = 'year' THEN
    v_interval_duration := INTERVAL '1 year';
  ELSE
    v_interval_duration := INTERVAL '1 month';
  END IF;
  v_new_period_end := NOW() + v_interval_duration;

  -- 5. Fetch or Upsert Subscription Record
  SELECT id INTO v_sub_id
  FROM public.subscriptions
  WHERE organization_id = p_org_id;

  IF v_sub_id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET
      plan_id = v_plan_id,
      status = 'active',
      current_period_start = NOW(),
      current_period_end = v_new_period_end,
      cancel_at_period_end = FALSE,
      pending_downgrade_plan_id = NULL,
      pending_downgrade_at = NULL,
      provider = COALESCE(p_provider, 'paystack'),
      provider_transaction_id = p_provider_tx_id,
      last_payment_at = NOW(),
      updated_at = NOW()
    WHERE id = v_sub_id;
  ELSE
    INSERT INTO public.subscriptions (
      organization_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      provider,
      provider_transaction_id,
      last_payment_at
    ) VALUES (
      p_org_id,
      v_plan_id,
      'active',
      NOW(),
      v_new_period_end,
      FALSE,
      COALESCE(p_provider, 'paystack'),
      p_provider_tx_id,
      NOW()
    )
    RETURNING id INTO v_sub_id;
  END IF;

  -- 6. Insert Authoritative Payment Record
  INSERT INTO public.subscription_payments (
    organization_id,
    subscription_id,
    plan_id,
    amount,
    currency,
    status,
    provider,
    provider_transaction_id,
    payment_reference,
    paid_at,
    metadata
  ) VALUES (
    p_org_id,
    v_sub_id,
    v_plan_id,
    p_amount,
    UPPER(p_currency),
    'success',
    COALESCE(p_provider, 'paystack'),
    p_provider_tx_id,
    p_payment_reference,
    NOW(),
    p_metadata
  )
  RETURNING id INTO v_payment_id;

  -- 7. Record Audit Log Event
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
    'Subscription Activated via Payment',
    'Billing',
    CONCAT(
      'Verified payment of ', UPPER(p_currency), ' ', p_amount::text,
      ' (Ref: ', p_payment_reference, '). Upgraded to ', v_plan_name, ' plan until ',
      v_new_period_end::date::text
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', CONCAT('Subscription successfully activated on the ', v_plan_name, ' plan.'),
    'plan', v_plan_name,
    'payment_id', v_payment_id,
    'current_period_end', v_new_period_end
  );
END;
$$;

-- 5. CANCEL SUBSCRIPTION AT PERIOD END RPC
CREATE OR REPLACE FUNCTION public.cancel_subscription_at_period_end(
  p_org_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_period_end TIMESTAMPTZ;
  v_plan_name TEXT;
BEGIN
  -- Verify caller is organization owner
  SELECT (owner_id = auth.uid()) INTO v_is_owner
  FROM public.organizations
  WHERE id = p_org_id;

  IF NOT COALESCE(v_is_owner, FALSE) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Unauthorized: Only the Organization Owner can cancel subscriptions.'
    );
  END IF;

  SELECT s.current_period_end, sp.name
  INTO v_period_end, v_plan_name
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.organization_id = p_org_id;

  UPDATE public.subscriptions
  SET
    cancel_at_period_end = TRUE,
    updated_at = NOW()
  WHERE organization_id = p_org_id;

  -- Audit log
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
    'Subscription Cancelled at Period End',
    'Billing',
    CONCAT('Scheduled cancellation for ', COALESCE(v_plan_name, 'current'), ' plan. Access remains active until ', v_period_end::date::text)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', CONCAT('Subscription cancellation scheduled. Your access remains active until ', v_period_end::date::text, '.'),
    'current_period_end', v_period_end
  );
END;
$$;

-- 6. RESUME CANCELLED SUBSCRIPTION RPC
CREATE OR REPLACE FUNCTION public.resume_subscription(
  p_org_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_plan_name TEXT;
BEGIN
  SELECT (owner_id = auth.uid()) INTO v_is_owner
  FROM public.organizations
  WHERE id = p_org_id;

  IF NOT COALESCE(v_is_owner, FALSE) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Unauthorized: Only the Organization Owner can manage subscriptions.'
    );
  END IF;

  SELECT sp.name INTO v_plan_name
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.organization_id = p_org_id;

  UPDATE public.subscriptions
  SET
    cancel_at_period_end = FALSE,
    updated_at = NOW()
  WHERE organization_id = p_org_id;

  -- Audit log
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
    'Subscription Auto-Renew Resumed',
    'Billing',
    CONCAT('Auto-renew re-enabled for ', COALESCE(v_plan_name, 'current'), ' plan.')
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Auto-renew has been resumed successfully.'
  );
END;
$$;

-- 7. SCHEDULE PLAN DOWNGRADE RPC (GRACEFUL PERIOD END APPLICATION)
CREATE OR REPLACE FUNCTION public.schedule_plan_downgrade(
  p_org_id UUID,
  p_target_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_target_plan_id UUID;
  v_target_plan_name TEXT;
  v_current_plan_name TEXT;
  v_period_end TIMESTAMPTZ;
BEGIN
  SELECT (owner_id = auth.uid()) INTO v_is_owner
  FROM public.organizations
  WHERE id = p_org_id;

  IF NOT COALESCE(v_is_owner, FALSE) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Unauthorized: Only the Organization Owner can schedule plan changes.'
    );
  END IF;

  SELECT id, name INTO v_target_plan_id, v_target_plan_name
  FROM public.subscription_plans
  WHERE slug = p_target_slug AND is_active = TRUE;

  IF v_target_plan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Target subscription plan not found.');
  END IF;

  SELECT s.current_period_end, sp.name
  INTO v_period_end, v_current_plan_name
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.organization_id = p_org_id;

  UPDATE public.subscriptions
  SET
    pending_downgrade_plan_id = v_target_plan_id,
    pending_downgrade_at = v_period_end,
    updated_at = NOW()
  WHERE organization_id = p_org_id;

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
    'Plan Downgrade Scheduled',
    'Billing',
    CONCAT('Downgrade from ', v_current_plan_name, ' to ', v_target_plan_name, ' scheduled for ', v_period_end::date::text, '. No user or medicine records deleted.')
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', CONCAT('Downgrade to ', v_target_plan_name, ' scheduled for next billing cycle (', v_period_end::date::text, '). Existing data remains safe.'),
    'target_plan', v_target_plan_name,
    'effective_date', v_period_end
  );
END;
$$;
