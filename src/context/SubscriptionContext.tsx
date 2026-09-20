import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Subscription, SubscriptionPlan, PlanLimits, SubscriptionPayment } from '../types';
import {
  DEFAULT_PLANS,
  fetchAllPlansFromSupabase,
  fetchOrganizationSubscriptionFromSupabase,
  fetchBillingHistoryFromSupabase,
  recordVerifiedPaymentInSupabase,
  scheduleSubscriptionCancellationInSupabase,
  resumeSubscriptionInSupabase,
  schedulePlanDowngradeInSupabase,
  isTrialActive,
  isSubscriptionActive,
  isSubscriptionInGracePeriod,
  getGraceDaysRemaining,
  getTrialDaysRemaining,
  getPlanLimits,
  canAddMoreUsers,
  canAddMoreMedicines,
  hasFeature as checkHasFeature,
  changeSubscriptionPlanInSupabase,
  subscribeToSubscriptionRealtime
} from '../lib/subscriptionService';
import { usePharmacy } from './PharmacyContext';

interface SubscriptionContextType {
  subscription: Subscription | null;
  plan: SubscriptionPlan | null;
  plans: SubscriptionPlan[];
  payments: SubscriptionPayment[];
  isTrial: boolean;
  trialDaysRemaining: number;
  isActive: boolean;
  isExpired: boolean;
  isGracePeriod: boolean;
  graceDaysRemaining: number;
  isCancelledAtPeriodEnd: boolean;
  pendingDowngradePlan: SubscriptionPlan | null;
  limits: PlanLimits;
  canAddUser: boolean;
  canAddMedicine: boolean;
  hasFeature: (featureKey: string) => boolean;
  refreshSubscription: () => Promise<void>;
  fetchPayments: () => Promise<void>;
  changePlan: (planSlug: string) => Promise<{ success: boolean; message: string; plan?: string }>;
  verifyAndRecordPayment: (payload: {
    reference: string;
    planSlug: string;
    amount: number;
    currency: string;
    provider?: string;
    providerTxId?: string;
    metadata?: Record<string, any>;
  }) => Promise<{ success: boolean; message: string; plan?: string; currentPeriodEnd?: string }>;
  cancelSubscription: () => Promise<{ success: boolean; message: string; currentPeriodEnd?: string }>;
  resumeSubscription: () => Promise<{ success: boolean; message: string }>;
  scheduleDowngrade: (targetSlug: string) => Promise<{ success: boolean; message: string; effectiveDate?: string }>;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { organizationId, users, medicines, addAuditLog, currentUser } = usePharmacy();

  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(DEFAULT_PLANS[0]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load billing history
  const fetchPayments = useCallback(async () => {
    if (!organizationId) {
      setPayments([]);
      return;
    }
    try {
      const history = await fetchBillingHistoryFromSupabase(organizationId);
      setPayments(history);
    } catch (err) {
      console.warn('Error loading billing payments:', err);
    }
  }, [organizationId]);

  // Load plans & subscription
  const refreshSubscription = useCallback(async () => {
    if (!organizationId) {
      setPlan(DEFAULT_PLANS[0]);
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [fetchedPlans, subData] = await Promise.all([
        fetchAllPlansFromSupabase(),
        fetchOrganizationSubscriptionFromSupabase(organizationId)
      ]);

      if (fetchedPlans && fetchedPlans.length > 0) {
        setPlans(fetchedPlans);
      }

      if (subData.plan) {
        setPlan(subData.plan);
      } else {
        setPlan(fetchedPlans[0] || DEFAULT_PLANS[0]);
      }

      setSubscription(subData.subscription);
      await fetchPayments();
    } catch (err) {
      console.warn('Failed to fetch subscription status:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, fetchPayments]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  // Realtime subscription event listener
  useEffect(() => {
    if (!organizationId) return;
    const unsubscribe = subscribeToSubscriptionRealtime(organizationId, () => {
      refreshSubscription();
    });
    return () => {
      unsubscribe();
    };
  }, [organizationId, refreshSubscription]);

  // Computed state
  const isTrial = isTrialActive(subscription);
  const trialDaysRemaining = getTrialDaysRemaining(subscription);
  const isGracePeriod = isSubscriptionInGracePeriod(subscription);
  const graceDaysRemaining = getGraceDaysRemaining(subscription);
  const isActive = isSubscriptionActive(subscription);
  const isExpired = subscription
    ? (!isActive && (subscription.status === 'expired' || (subscription.status === 'trialing' && trialDaysRemaining <= 0)))
    : false;
  const isCancelledAtPeriodEnd = Boolean(subscription?.cancelAtPeriodEnd);

  const pendingDowngradePlan = subscription?.pendingDowngradePlanId
    ? plans.find(p => p.id === subscription.pendingDowngradePlanId) || null
    : null;

  const currentUsersCount = users.filter(u => u.status === 'Active').length || 1;
  const currentMedicinesCount = medicines.length || 0;

  const limits = getPlanLimits(plan, currentUsersCount, currentMedicinesCount);
  const canAddUser = canAddMoreUsers(limits) && !isExpired;
  const canAddMedicine = canAddMoreMedicines(limits) && !isExpired;

  const hasFeature = useCallback(
    (featureKey: string): boolean => {
      return checkHasFeature(plan, featureKey);
    },
    [plan]
  );

  const changePlan = async (planSlug: string): Promise<{ success: boolean; message: string; plan?: string }> => {
    if (!organizationId) {
      return { success: false, message: 'No active organization found.' };
    }

    const isOwner = currentUser.role === 'Super Admin' || currentUser.role === 'Store Manager';
    if (!isOwner) {
      return { success: false, message: 'Only the Organization Owner can modify subscription plans.' };
    }

    const res = await changeSubscriptionPlanInSupabase(organizationId, planSlug);
    if (res.success) {
      addAuditLog(
        'Subscription Plan Changed',
        'Billing',
        `Changed plan to ${planSlug.toUpperCase()} for organization ID ${organizationId}`
      );
      await refreshSubscription();
    }
    return res;
  };

  const verifyAndRecordPayment = async (payload: {
    reference: string;
    planSlug: string;
    amount: number;
    currency: string;
    provider?: string;
    providerTxId?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; message: string; plan?: string; currentPeriodEnd?: string }> => {
    if (!organizationId) {
      return { success: false, message: 'No active organization found.' };
    }

    const isOwner = currentUser.role === 'Super Admin' || currentUser.role === 'Store Manager';
    if (!isOwner) {
      return { success: false, message: 'Only the Organization Owner can verify and process payments.' };
    }

    const res = await recordVerifiedPaymentInSupabase({
      orgId: organizationId,
      planSlug: payload.planSlug,
      paymentReference: payload.reference,
      amount: payload.amount,
      currency: payload.currency,
      provider: payload.provider || 'paystack',
      providerTxId: payload.providerTxId,
      metadata: payload.metadata
    });

    if (res.success) {
      await refreshSubscription();
      await fetchPayments();
    }

    return res;
  };

  const cancelSubscription = async (): Promise<{ success: boolean; message: string; currentPeriodEnd?: string }> => {
    if (!organizationId) {
      return { success: false, message: 'No active organization found.' };
    }

    const isOwner = currentUser.role === 'Super Admin' || currentUser.role === 'Store Manager';
    if (!isOwner) {
      return { success: false, message: 'Only the Organization Owner can cancel subscriptions.' };
    }

    const res = await scheduleSubscriptionCancellationInSupabase(organizationId);
    if (res.success) {
      await refreshSubscription();
    }
    return res;
  };

  const resumeSubscription = async (): Promise<{ success: boolean; message: string }> => {
    if (!organizationId) {
      return { success: false, message: 'No active organization found.' };
    }

    const isOwner = currentUser.role === 'Super Admin' || currentUser.role === 'Store Manager';
    if (!isOwner) {
      return { success: false, message: 'Only the Organization Owner can manage subscriptions.' };
    }

    const res = await resumeSubscriptionInSupabase(organizationId);
    if (res.success) {
      await refreshSubscription();
    }
    return res;
  };

  const scheduleDowngrade = async (targetSlug: string): Promise<{ success: boolean; message: string; effectiveDate?: string }> => {
    if (!organizationId) {
      return { success: false, message: 'No active organization found.' };
    }

    const isOwner = currentUser.role === 'Super Admin' || currentUser.role === 'Store Manager';
    if (!isOwner) {
      return { success: false, message: 'Only the Organization Owner can schedule plan downgrades.' };
    }

    const res = await schedulePlanDowngradeInSupabase(organizationId, targetSlug);
    if (res.success) {
      await refreshSubscription();
    }
    return res;
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        plan,
        plans,
        payments,
        isTrial,
        trialDaysRemaining,
        isActive,
        isExpired,
        isGracePeriod,
        graceDaysRemaining,
        isCancelledAtPeriodEnd,
        pendingDowngradePlan,
        limits,
        canAddUser,
        canAddMedicine,
        hasFeature,
        refreshSubscription,
        fetchPayments,
        changePlan,
        verifyAndRecordPayment,
        cancelSubscription,
        resumeSubscription,
        scheduleDowngrade,
        loading
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
