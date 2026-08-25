import { supabase } from './supabase';
import { Subscription, SubscriptionPlan, PlanLimits } from '../types';

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Starter',
    slug: 'starter',
    description: 'Essential pharmacy management tools for single-counter dispensaries.',
    price: 29.0,
    currency: 'USD',
    billingInterval: 'month',
    maxUsers: 3,
    maxMedicines: 1000,
    features: [
      'core_inventory',
      'pos',
      'customers',
      'suppliers',
      'prescriptions',
      'basic_reports'
    ],
    isActive: true
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Professional',
    slug: 'professional',
    description: 'Full management suite for growing clinical and retail pharmacies with advanced staff controls.',
    price: 79.0,
    currency: 'USD',
    billingInterval: 'month',
    maxUsers: 10,
    maxMedicines: 10000,
    features: [
      'core_inventory',
      'pos',
      'customers',
      'suppliers',
      'prescriptions',
      'basic_reports',
      'advanced_reports',
      'audit_logs',
      'barcode_scanner',
      'pdf_invoices',
      'automated_alerts',
      'advanced_staff_permissions'
    ],
    isActive: true
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Business / Enterprise',
    slug: 'business',
    description: 'Uncapped scale, high-throughput inventory, advanced analytics and priority support.',
    price: 199.0,
    currency: 'USD',
    billingInterval: 'month',
    maxUsers: 9999,
    maxMedicines: 100000,
    features: [
      'core_inventory',
      'pos',
      'customers',
      'suppliers',
      'prescriptions',
      'basic_reports',
      'advanced_reports',
      'audit_logs',
      'barcode_scanner',
      'pdf_invoices',
      'automated_alerts',
      'advanced_staff_permissions',
      'advanced_analytics',
      'priority_support',
      'multi_branch'
    ],
    isActive: true
  }
];

export function mapPlanFromDb(row: any): SubscriptionPlan {
  let features: string[] = [];
  if (Array.isArray(row.features)) {
    features = row.features;
  } else if (typeof row.features === 'string') {
    try {
      features = JSON.parse(row.features);
    } catch {
      features = [];
    }
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    price: Number(row.price) || 0,
    currency: row.currency || 'USD',
    billingInterval: row.billing_interval || 'month',
    maxUsers: Number(row.max_users) || 3,
    maxMedicines: Number(row.max_medicines) || 1000,
    features,
    isActive: row.is_active ?? true
  };
}

export function mapSubscriptionFromDb(row: any): Subscription {
  return {
    id: row.id,
    organizationId: row.organization_id,
    planId: row.plan_id,
    status: row.status || 'trialing',
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    trialStart: row.trial_start,
    trialEnd: row.trial_end,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    provider: row.provider || 'paystack',
    providerCustomerId: row.provider_customer_id,
    providerSubscriptionId: row.provider_subscription_id,
    providerTransactionId: row.provider_transaction_id,
    lastPaymentAt: row.last_payment_at,
    pendingDowngradePlanId: row.pending_downgrade_plan_id,
    pendingDowngradeAt: row.pending_downgrade_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Fetch all active subscription plans from PostgreSQL
 */
export async function fetchAllPlansFromSupabase(): Promise<SubscriptionPlan[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_PLANS;
    }

    return data.map(mapPlanFromDb);
  } catch (err) {
    console.warn('Fallback to default plans:', err);
    return DEFAULT_PLANS;
  }
}

/**
 * Fetch current subscription for an organization
 */
export async function fetchOrganizationSubscriptionFromSupabase(
  orgId: string
): Promise<{ subscription: Subscription | null; plan: SubscriptionPlan | null }> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error || !data) {
      // If none found in DB, return 14-day trial on Starter plan as fallback
      const defaultStarter = DEFAULT_PLANS[0];
      const now = new Date();
      const trialEndDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      
      const syntheticSub: Subscription = {
        id: 'synthetic-sub-' + orgId.substring(0, 8),
        organizationId: orgId,
        planId: defaultStarter.id,
        status: 'trialing',
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: trialEndDate.toISOString(),
        trialStart: now.toISOString(),
        trialEnd: trialEndDate.toISOString(),
        cancelAtPeriodEnd: false,
        provider: 'manual',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      return { subscription: syntheticSub, plan: defaultStarter };
    }

    const sub = mapSubscriptionFromDb(data);
    const plan = data.plan ? mapPlanFromDb(data.plan) : DEFAULT_PLANS.find(p => p.id === sub.planId) || DEFAULT_PLANS[0];

    return { subscription: sub, plan };
  } catch (err) {
    console.warn('Error fetching organization subscription:', err);
    const defaultStarter = DEFAULT_PLANS[0];
    return { subscription: null, plan: defaultStarter };
  }
}

/**
 * Check if trial is active
 */
export function isTrialActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'trialing') return false;
  if (!subscription.trialEnd) return false;
  const trialEnd = new Date(subscription.trialEnd);
  return trialEnd.getTime() > Date.now();
}

/**
 * Check if subscription is generally active (active or valid trialing)
 */
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status === 'active') return true;
  if (subscription.status === 'trialing') {
    return isTrialActive(subscription);
  }
  return false;
}

/**
 * Calculate trial days remaining
 */
export function getTrialDaysRemaining(subscription: Subscription | null): number {
  if (!subscription || !subscription.trialEnd) return 0;
  const trialEnd = new Date(subscription.trialEnd).getTime();
  const now = Date.now();
  const diffMs = trialEnd - now;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Compute plan limits and usage
 */
export function getPlanLimits(
  plan: SubscriptionPlan | null,
  currentUsers: number,
  currentMedicines: number
): PlanLimits {
  return {
    maxUsers: plan?.maxUsers || 3,
    maxMedicines: plan?.maxMedicines || 1000,
    currentUsers,
    currentMedicines
  };
}

/**
 * Check if user count is within plan limit
 */
export function canAddMoreUsers(limits: PlanLimits): boolean {
  return limits.currentUsers < limits.maxUsers;
}

/**
 * Check if medicine count is within plan limit
 */
export function canAddMoreMedicines(limits: PlanLimits): boolean {
  return limits.currentMedicines < limits.maxMedicines;
}

/**
 * Check if a plan has a specific feature key
 */
export function hasFeature(plan: SubscriptionPlan | null, featureKey: string): boolean {
  if (!plan || !plan.features) return false;
  return plan.features.includes(featureKey);
}

/**
 * Change or upgrade an organization's subscription plan
 */
export async function changeSubscriptionPlanInSupabase(
  orgId: string,
  planSlug: string
): Promise<{ success: boolean; message: string; plan?: string }> {
  try {
    const { data, error } = await supabase.rpc('change_subscription_plan', {
      p_org_id: orgId,
      p_plan_slug: planSlug
    });

    if (error) {
      console.warn('RPC change_subscription_plan error, falling back to direct update:', error);
      
      // Fallback: Direct table update if RPC failed
      const plan = DEFAULT_PLANS.find(p => p.slug === planSlug);
      if (!plan) return { success: false, message: 'Plan not found.' };

      const { error: upsertError } = await supabase
        .from('subscriptions')
        .upsert({
          organization_id: orgId,
          plan_id: plan.id,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
          provider: 'manual'
        }, { onConflict: 'organization_id' });

      if (upsertError) {
        return { success: false, message: upsertError.message };
      }

      return {
        success: true,
        message: `Upgraded to ${plan.name} plan successfully!`,
        plan: plan.name
      };
    }

    const res = data as any;
    return {
      success: res?.success ?? true,
      message: res?.message ?? 'Plan updated successfully.',
      plan: res?.plan
    };
  } catch (err: any) {
    console.error('Exception changing subscription plan:', err);
    return { success: false, message: err?.message || 'Failed to update plan.' };
  }
}

/**
 * Fetch subscription billing and payment history for an organization
 */
export async function fetchBillingHistoryFromSupabase(
  orgId: string
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_payments')
      .select(`
        id,
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
        metadata,
        created_at,
        plan:subscription_plans(name, slug)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      organizationId: item.organization_id,
      subscriptionId: item.subscription_id,
      planId: item.plan_id,
      amount: Number(item.amount),
      currency: item.currency || 'USD',
      status: item.status,
      provider: item.provider || 'paystack',
      providerTransactionId: item.provider_transaction_id,
      paymentReference: item.payment_reference,
      paidAt: item.paid_at || item.created_at,
      metadata: item.metadata || {},
      createdAt: item.created_at,
      planName: item.plan?.name || (item.metadata?.plan_slug ? item.metadata.plan_slug.toUpperCase() : 'Subscription')
    }));
  } catch (err) {
    console.warn('Error fetching billing history:', err);
    return [];
  }
}

/**
 * Record and verify a successful payment via backend RPC
 */
export async function recordVerifiedPaymentInSupabase(payload: {
  orgId: string;
  planSlug: string;
  paymentReference: string;
  amount: number;
  currency: string;
  provider: string;
  providerTxId?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; message: string; plan?: string; currentPeriodEnd?: string }> {
  try {
    const { data, error } = await supabase.rpc('record_verified_payment', {
      p_org_id: payload.orgId,
      p_plan_slug: payload.planSlug,
      p_payment_reference: payload.paymentReference,
      p_amount: payload.amount,
      p_currency: payload.currency,
      p_provider: payload.provider,
      p_provider_tx_id: payload.providerTxId || null,
      p_metadata: payload.metadata || {}
    });

    if (error) {
      console.warn('RPC record_verified_payment failed:', error);
      return { success: false, message: error.message };
    }

    const res = data as any;
    return {
      success: res?.success ?? true,
      message: res?.message ?? 'Payment processed successfully.',
      plan: res?.plan,
      currentPeriodEnd: res?.current_period_end
    };
  } catch (err: any) {
    console.error('Exception recording verified payment:', err);
    return { success: false, message: err?.message || 'Failed to record verified payment.' };
  }
}

/**
 * Schedule cancellation of subscription at the end of the current billing cycle
 */
export async function scheduleSubscriptionCancellationInSupabase(
  orgId: string
): Promise<{ success: boolean; message: string; currentPeriodEnd?: string }> {
  try {
    const { data, error } = await supabase.rpc('cancel_subscription_at_period_end', {
      p_org_id: orgId
    });

    if (error) {
      // Fallback direct update
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
        .eq('organization_id', orgId);

      if (updateError) return { success: false, message: updateError.message };
      return { success: true, message: 'Subscription will cancel at the end of the current period.' };
    }

    const res = data as any;
    return {
      success: res?.success ?? true,
      message: res?.message ?? 'Cancellation scheduled for period end.',
      currentPeriodEnd: res?.current_period_end
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Error cancelling subscription.' };
  }
}

/**
 * Resume auto-renewal on a subscription scheduled for cancellation
 */
export async function resumeSubscriptionInSupabase(
  orgId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.rpc('resume_subscription', {
      p_org_id: orgId
    });

    if (error) {
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
        .eq('organization_id', orgId);

      if (updateError) return { success: false, message: updateError.message };
      return { success: true, message: 'Auto-renew resumed successfully.' };
    }

    const res = data as any;
    return {
      success: res?.success ?? true,
      message: res?.message ?? 'Auto-renew resumed successfully.'
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Error resuming subscription.' };
  }
}

/**
 * Schedule a plan downgrade for the end of the current billing cycle
 */
export async function schedulePlanDowngradeInSupabase(
  orgId: string,
  targetPlanSlug: string
): Promise<{ success: boolean; message: string; targetPlan?: string; effectiveDate?: string }> {
  try {
    const { data, error } = await supabase.rpc('schedule_plan_downgrade', {
      p_org_id: orgId,
      p_target_slug: targetPlanSlug
    });

    if (error) {
      return { success: false, message: error.message };
    }

    const res = data as any;
    return {
      success: res?.success ?? true,
      message: res?.message ?? 'Downgrade scheduled for end of billing cycle.',
      targetPlan: res?.target_plan,
      effectiveDate: res?.effective_date
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Error scheduling downgrade.' };
  }
}

