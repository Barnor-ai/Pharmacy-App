-- ==============================================================================
-- PHASE 7.3: SUBSCRIPTION LIMIT GOVERNANCE & TRIAL LIFECYCLE MANAGEMENT
-- Authoritative database-level quota enforcement, trial lifecycle, grace periods,
-- and real-time subscription synchronization.
-- ==============================================================================

-- 1. UPDATE STATUS CONSTRAINT ON SUBSCRIPTIONS TO SUPPORT GRACE_PERIOD
DO $$
BEGIN
  ALTER TABLE public.subscriptions 
    DROP CONSTRAINT IF EXISTS subscriptions_status_check;
  
  ALTER TABLE public.subscriptions 
    ADD CONSTRAINT subscriptions_status_check 
    CHECK (status IN ('trialing', 'active', 'past_due', 'grace_period', 'cancelled', 'expired', 'incomplete'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint update notice: %', SQLERRM;
END $$;

-- 2. AUTHORITATIVE SUBSCRIPTION STATUS & LIFECYCLE EVALUATION FUNCTION
CREATE OR REPLACE FUNCTION public.evaluate_subscription_status(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
  v_plan RECORD;
  v_default_plan RECORD;
  v_new_status TEXT;
  v_is_expired BOOLEAN := FALSE;
  v_is_in_grace_period BOOLEAN := FALSE;
  v_days_remaining INTEGER := 0;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Fetch default Starter plan for fallback/trial provisioning
  SELECT * INTO v_default_plan 
  FROM public.subscription_plans 
  WHERE slug = 'starter' OR is_active = TRUE 
  ORDER BY price ASC 
  LIMIT 1;

  -- 2. Fetch organization subscription
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE organization_id = p_org_id;

  -- 3. If no subscription exists, auto-provision 14-day trial
  IF v_sub.id IS NULL THEN
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
      p_org_id,
      v_default_plan.id,
      'trialing',
      v_now,
      v_now + INTERVAL '14 days',
      v_now,
      v_now + INTERVAL '14 days',
      'manual'
    )
    RETURNING * INTO v_sub;
  END IF;

  -- 4. Process pending downgrade if scheduled effective date has arrived
  IF v_sub.pending_downgrade_plan_id IS NOT NULL AND v_sub.pending_downgrade_at <= v_now THEN
    UPDATE public.subscriptions
    SET plan_id = v_sub.pending_downgrade_plan_id,
        pending_downgrade_plan_id = NULL,
        pending_downgrade_at = NULL,
        updated_at = v_now
    WHERE id = v_sub.id
    RETURNING * INTO v_sub;
  END IF;

  -- 5. Fetch associated subscription plan
  SELECT * INTO v_plan
  FROM public.subscription_plans
  WHERE id = v_sub.plan_id;

  IF v_plan.id IS NULL THEN
    v_plan := v_default_plan;
  END IF;

  -- 6. Authoritative status calculation
  v_new_status := v_sub.status;

  IF v_sub.status = 'trialing' THEN
    IF v_sub.trial_end IS NOT NULL AND v_sub.trial_end > v_now THEN
      v_new_status := 'trialing';
      v_is_expired := FALSE;
      v_days_remaining := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_sub.trial_end - v_now)) / 86400)::INTEGER);
    ELSE
      v_new_status := 'expired';
      v_is_expired := TRUE;
      v_days_remaining := 0;
    END IF;

  ELSIF v_sub.status = 'active' THEN
    IF v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end > v_now THEN
      v_new_status := 'active';
      v_is_expired := FALSE;
      v_days_remaining := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_sub.current_period_end - v_now)) / 86400)::INTEGER);
    ELSIF v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end + INTERVAL '3 days' > v_now THEN
      -- 3-Day Grace Period
      v_new_status := 'past_due';
      v_is_in_grace_period := TRUE;
      v_is_expired := FALSE;
      v_days_remaining := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_sub.current_period_end + INTERVAL '3 days' - v_now)) / 86400)::INTEGER);
    ELSE
      v_new_status := 'expired';
      v_is_expired := TRUE;
      v_days_remaining := 0;
    END IF;

  ELSIF v_sub.status = 'past_due' OR v_sub.status = 'grace_period' THEN
    IF v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end + INTERVAL '3 days' > v_now THEN
      v_new_status := 'past_due';
      v_is_in_grace_period := TRUE;
      v_is_expired := FALSE;
      v_days_remaining := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_sub.current_period_end + INTERVAL '3 days' - v_now)) / 86400)::INTEGER);
    ELSE
      v_new_status := 'expired';
      v_is_expired := TRUE;
      v_days_remaining := 0;
    END IF;

  ELSIF v_sub.status = 'cancelled' THEN
    IF v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end > v_now THEN
      v_new_status := 'cancelled';
      v_is_expired := FALSE;
      v_days_remaining := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_sub.current_period_end - v_now)) / 86400)::INTEGER);
    ELSE
      v_new_status := 'expired';
      v_is_expired := TRUE;
      v_days_remaining := 0;
    END IF;

  ELSIF v_sub.status = 'expired' THEN
    v_new_status := 'expired';
    v_is_expired := TRUE;
    v_days_remaining := 0;
  END IF;

  -- 7. Sync evaluated status back to subscriptions table if transitioned
  IF v_new_status <> v_sub.status THEN
    UPDATE public.subscriptions
    SET status = v_new_status,
        updated_at = v_now
    WHERE id = v_sub.id;
  END IF;

  RETURN jsonb_build_object(
    'organization_id', p_org_id,
    'subscription_id', v_sub.id,
    'status', v_new_status,
    'plan_id', v_plan.id,
    'plan_name', v_plan.name,
    'plan_slug', v_plan.slug,
    'max_users', COALESCE(v_plan.max_users, 3),
    'max_medicines', COALESCE(v_plan.max_medicines, 1000),
    'is_active', (v_new_status IN ('active', 'trialing', 'past_due', 'grace_period', 'cancelled') AND NOT v_is_expired),
    'is_expired', v_is_expired,
    'is_in_grace_period', v_is_in_grace_period,
    'days_remaining', v_days_remaining,
    'cancel_at_period_end', v_sub.cancel_at_period_end
  );
END;
$$;

-- 3. HARDENED MEDICINE QUOTA FUNCTION
CREATE OR REPLACE FUNCTION public.check_organization_can_add_medicine(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eval JSONB;
  v_max_medicines INTEGER;
  v_current_medicines INTEGER;
  v_is_expired BOOLEAN;
BEGIN
  -- Tenant isolation: If authenticated user is present, verify membership or ownership
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organizations o WHERE o.id = p_org_id AND o.owner_id = auth.uid()
    ) AND NOT EXISTS (
      SELECT 1 FROM public.organization_members om WHERE om.organization_id = p_org_id AND om.user_id = auth.uid() AND om.is_active = TRUE
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Authoritatively evaluate subscription status and capacity
  v_eval := public.evaluate_subscription_status(p_org_id);
  v_is_expired := (v_eval->>'is_expired')::BOOLEAN;
  v_max_medicines := (v_eval->>'max_medicines')::INTEGER;

  IF v_is_expired THEN
    RETURN FALSE;
  END IF;

  -- Count existing tenant medicines
  SELECT COUNT(*) INTO v_current_medicines
  FROM public.medicines
  WHERE organization_id = p_org_id;

  RETURN (v_current_medicines < v_max_medicines);
END;
$$;

-- 4. HARDENED STAFF SEAT QUOTA FUNCTION
CREATE OR REPLACE FUNCTION public.check_organization_can_add_user(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eval JSONB;
  v_max_users INTEGER;
  v_current_users INTEGER;
  v_is_expired BOOLEAN;
BEGIN
  -- Tenant isolation: If authenticated user is present, verify membership or ownership
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organizations o WHERE o.id = p_org_id AND o.owner_id = auth.uid()
    ) AND NOT EXISTS (
      SELECT 1 FROM public.organization_members om WHERE om.organization_id = p_org_id AND om.user_id = auth.uid() AND om.is_active = TRUE
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Authoritatively evaluate subscription status and capacity
  v_eval := public.evaluate_subscription_status(p_org_id);
  v_is_expired := (v_eval->>'is_expired')::BOOLEAN;
  v_max_users := (v_eval->>'max_users')::INTEGER;

  IF v_is_expired THEN
    RETURN FALSE;
  END IF;

  -- Count existing active staff members
  SELECT COUNT(*) INTO v_current_users
  FROM public.organization_members
  WHERE organization_id = p_org_id 
    AND is_active = TRUE;

  RETURN (v_current_users < v_max_users);
END;
$$;

-- 5. DATABASE TRIGGER: ENFORCE MEDICINE INSERTION QUOTA & SUBSCRIPTION VALIDITY
CREATE OR REPLACE FUNCTION public.enforce_medicine_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_add BOOLEAN;
  v_eval JSONB;
  v_count INTEGER;
  v_max INTEGER;
BEGIN
  v_eval := public.evaluate_subscription_status(NEW.organization_id);
  
  IF (v_eval->>'is_expired')::BOOLEAN THEN
    RAISE EXCEPTION 'Subscription or trial has expired for organization %. Please renew or upgrade your plan to add medicines.', NEW.organization_id
      USING ERRCODE = 'P0001';
  END IF;

  v_max := (v_eval->>'max_medicines')::INTEGER;
  
  SELECT COUNT(*) INTO v_count
  FROM public.medicines
  WHERE organization_id = NEW.organization_id;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Medicine catalog limit reached (%/% max items). Upgrade subscription plan to add more medicine SKUs.', v_count, v_max
      USING ERRCODE = 'P0002';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_medicine_quota ON public.medicines;
CREATE TRIGGER trg_enforce_medicine_quota
  BEFORE INSERT ON public.medicines
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_medicine_quota();

-- 6. DATABASE TRIGGER: ENFORCE STAFF SEAT INSERTION/ACTIVATION QUOTA & SUBSCRIPTION VALIDITY
CREATE OR REPLACE FUNCTION public.enforce_staff_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eval JSONB;
  v_count INTEGER;
  v_max INTEGER;
BEGIN
  -- Only enforce when activating or adding an active member
  IF NEW.is_active = TRUE THEN
    v_eval := public.evaluate_subscription_status(NEW.organization_id);
    
    IF (v_eval->>'is_expired')::BOOLEAN THEN
      RAISE EXCEPTION 'Subscription or trial has expired for organization %. Please renew or upgrade your plan to invite or activate staff members.', NEW.organization_id
        USING ERRCODE = 'P0003';
    END IF;

    v_max := (v_eval->>'max_users')::INTEGER;
    
    -- Count other active members excluding the current record on update
    SELECT COUNT(*) INTO v_count
    FROM public.organization_members
    WHERE organization_id = NEW.organization_id 
      AND is_active = TRUE
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

    IF (v_count + 1) > v_max THEN
      RAISE EXCEPTION 'Staff seat limit reached (%/% max users). Upgrade subscription plan to invite additional team members.', v_count, v_max
        USING ERRCODE = 'P0004';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_staff_quota ON public.organization_members;
CREATE TRIGGER trg_enforce_staff_quota
  BEFORE INSERT OR UPDATE OF is_active, organization_id ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_staff_quota();

-- 7. AUDIT LOG TRIGGER FOR SUBSCRIPTION LIFECYCLE EVENTS
CREATE OR REPLACE FUNCTION public.log_subscription_lifecycle_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_desc TEXT;
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.plan_id <> NEW.plan_id THEN
      v_action_desc := 'Subscription plan changed';
    ELSIF OLD.status <> NEW.status THEN
      v_action_desc := 'Subscription status changed to ' || NEW.status;
    ELSIF OLD.cancel_at_period_end <> NEW.cancel_at_period_end THEN
      v_action_desc := CASE WHEN NEW.cancel_at_period_end THEN 'Subscription renewal cancelled at period end' ELSE 'Subscription auto-renewal resumed' END;
    ELSIF OLD.pending_downgrade_plan_id IS DISTINCT FROM NEW.pending_downgrade_plan_id THEN
      v_action_desc := 'Subscription downgrade scheduled';
    ELSE
      RETURN NEW;
    END IF;

    INSERT INTO public.audit_logs (
      organization_id,
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      new_data
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      'UPDATE',
      'subscriptions',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_lifecycle_audit ON public.subscriptions;
CREATE TRIGGER trg_subscription_lifecycle_audit
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_subscription_lifecycle_audit();

-- 8. REALTIME REPLICA IDENTITY & PUBLICATION CONFIGURATION
ALTER TABLE IF EXISTS public.subscriptions REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.subscription_payments REPLICA IDENTITY FULL;

DO $$
DECLARE
  v_table TEXT;
  v_sub_tables TEXT[] := ARRAY['subscriptions', 'subscription_payments'];
BEGIN
  FOREACH v_table IN ARRAY v_sub_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime'
        AND n.nspname = 'public'
        AND c.relname = v_table
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', v_table);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Notice: could not add table % to publication: %', v_table, SQLERRM;
      END IF;
    END IF;
  END LOOP;
END $$;
