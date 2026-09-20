import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useSubscription } from '../context/SubscriptionContext';
import {
  CreditCard,
  Check,
  ShieldCheck,
  Zap,
  Clock,
  AlertTriangle,
  Sparkles,
  Building2,
  Users,
  Pill,
  Lock,
  ArrowRight,
  RefreshCw,
  Loader2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  Download,
  Ban,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { SubscriptionPlan, SubscriptionPayment } from '../types';
import { getPaymentProvider, generatePaystackReference } from '../lib/payments';
import { SubscriptionInvoiceModal } from '../components/SubscriptionInvoiceModal';

export const SubscriptionPage: React.FC = () => {
  const { currentUser, organizationId, pharmacySettings } = usePharmacy();
  const {
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
    verifyAndRecordPayment,
    cancelSubscription,
    resumeSubscription,
    scheduleDowngrade,
    refreshSubscription,
    fetchPayments,
    loading
  } = useSubscription();

  const [isProcessing, setIsProcessing] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Modal States
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [targetPlan, setTargetPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedInvoicePayment, setSelectedInvoicePayment] = useState<SubscriptionPayment | null>(null);

  const isOwner = currentUser.role === 'Super Admin' || currentUser.role === 'Store Manager';
  const paystackPub = ((import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY as string) || '';
  const isPaystackTestMode = !paystackPub || paystackPub.startsWith('pk_test_') || paystackPub.includes('sample');

  const handleSelectPlan = (p: SubscriptionPlan) => {
    if (!isOwner) {
      setErrorNotice('Only the Organization Owner can modify the subscription plan.');
      return;
    }
    if (plan?.slug === p.slug) return;

    setTargetPlan(p);
    
    // If target plan price is lower, it's a downgrade
    if ((plan?.price || 0) > p.price) {
      setShowDowngradeModal(true);
    } else {
      setShowCheckoutModal(true);
    }
  };

  /**
   * Launch Paystack Checkout
   */
  const handleInitiatePaystackCheckout = async () => {
    if (!targetPlan || !organizationId) return;
    setIsProcessing(true);
    setErrorNotice(null);
    setSuccessNotice(null);

    const paymentProvider = getPaymentProvider('paystack');
    const paymentRef = generatePaystackReference(organizationId, targetPlan.slug);
    const userEmail = currentUser.email || 'billing@pharmacore-saas.com';

    try {
      await paymentProvider.initializeCheckout({
        email: userEmail,
        amount: targetPlan.price,
        currency: targetPlan.currency || 'USD',
        planName: targetPlan.name,
        planSlug: targetPlan.slug,
        organizationId: organizationId,
        userId: currentUser.id,
        reference: paymentRef,
        onSuccess: async (verificationPayload) => {
          try {
            // Authoritative server-side verification and activation
            const result = await verifyAndRecordPayment({
              reference: verificationPayload.reference,
              planSlug: targetPlan.slug,
              amount: targetPlan.price,
              currency: targetPlan.currency || 'USD',
              provider: 'paystack',
              providerTxId: verificationPayload.transactionId,
              metadata: {
                userEmail,
                planName: targetPlan.name,
                organizationName: pharmacySettings.pharmacyName
              }
            });

            if (result.success) {
              setSuccessNotice(result.message || `Successfully upgraded to ${targetPlan.name} plan!`);
              setShowCheckoutModal(false);
              setTimeout(() => setSuccessNotice(null), 5000);
            } else {
              setErrorNotice(result.message || 'Payment verification failed at server layer.');
            }
          } catch (err: any) {
            setErrorNotice(err?.message || 'Error processing server verification.');
          } finally {
            setIsProcessing(false);
          }
        },
        onCancel: () => {
          setIsProcessing(false);
        },
        onError: (err: any) => {
          setIsProcessing(false);
          setErrorNotice(typeof err === 'string' ? err : err?.message || 'Paystack checkout encountered an error.');
        }
      });
    } catch (err: any) {
      setIsProcessing(false);
      setErrorNotice(err?.message || 'Failed to start payment checkout.');
    }
  };

  /**
   * Handle Plan Downgrade Confirmation (graceful scheduling)
   */
  const handleConfirmDowngrade = async () => {
    if (!targetPlan) return;
    setIsProcessing(true);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      const res = await scheduleDowngrade(targetPlan.slug);
      if (res.success) {
        setSuccessNotice(res.message || `Downgrade to ${targetPlan.name} scheduled for next billing cycle.`);
        setShowDowngradeModal(false);
        setTimeout(() => setSuccessNotice(null), 5000);
      } else {
        setErrorNotice(res.message || 'Failed to schedule plan downgrade.');
      }
    } catch (err: any) {
      setErrorNotice(err?.message || 'Error scheduling plan downgrade.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle Subscription Cancellation at Period End
   */
  const handleConfirmCancellation = async () => {
    setIsProcessing(true);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      const res = await cancelSubscription();
      if (res.success) {
        setSuccessNotice(res.message || 'Subscription cancellation scheduled for period end.');
        setShowCancelModal(false);
        setTimeout(() => setSuccessNotice(null), 5000);
      } else {
        setErrorNotice(res.message || 'Failed to cancel subscription.');
      }
    } catch (err: any) {
      setErrorNotice(err?.message || 'Error cancelling subscription.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle Resume Auto-Renew
   */
  const handleResumeSubscription = async () => {
    setIsProcessing(true);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      const res = await resumeSubscription();
      if (res.success) {
        setSuccessNotice(res.message || 'Auto-renewal resumed successfully.');
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        setErrorNotice(res.message || 'Failed to resume subscription.');
      }
    } catch (err: any) {
      setErrorNotice(err?.message || 'Error resuming subscription.');
    } finally {
      setIsProcessing(false);
    }
  };

  const featureLabels: Record<string, string> = {
    core_inventory: 'Core Medicine Inventory & Batch Tracking',
    pos: 'Point of Sale (POS) Checkout & Invoices',
    customers: 'Patient Profiles & Purchase History',
    suppliers: 'Supplier Directory & Reorders',
    prescriptions: 'Prescription Records & Scanned Rx',
    basic_reports: 'Standard Sales & Revenue Reports',
    advanced_reports: 'Financial Profit/Loss Analytics',
    audit_logs: 'Enterprise Compliance Audit Logs',
    barcode_scanner: 'Real-Time Hardware Barcode Scanner',
    pdf_invoices: 'Custom PDF Invoices & Thermal Print',
    automated_alerts: 'Automated Low-Stock Email Alerts',
    advanced_staff_permissions: 'Custom RBAC Staff Permissions',
    advanced_analytics: 'Predictive Demand & Expiry AI Analysis',
    priority_support: '24/7 Dedicated Priority Support',
    multi_branch: 'Multi-Branch Readiness & Central Sync'
  };

  const getStatusBadge = () => {
    if (isCancelledAtPeriodEnd) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
          <Ban className="w-3.5 h-3.5" />
          <span>Cancels at Period End</span>
        </span>
      );
    }
    if (isTrial) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>14-Day Free Trial ({trialDaysRemaining} days remaining)</span>
        </span>
      );
    }
    if (isGracePeriod || subscription?.status === 'past_due' || subscription?.status === 'grace_period') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Grace Period ({graceDaysRemaining} day{graceDaysRemaining === 1 ? '' : 's'} remaining)</span>
        </span>
      );
    }
    if (subscription?.status === 'active') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Active Subscription</span>
        </span>
      );
    }
    if (isExpired) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Subscription Expired</span>
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
        {subscription?.status || 'Active'}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header & Overview */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <CreditCard className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span>Subscription Plans & Real Billing</span>
            </h1>
            {isPaystackTestMode && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                Paystack Test Mode
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Server-verified Paystack subscription checkout, automated invoicing, and capacity enforcement
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            refreshSubscription();
            fetchPayments();
          }}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Status</span>
        </button>
      </div>

      {/* Notifications */}
      {successNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Cancellation at period end banner */}
      {isCancelledAtPeriodEnd && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-black text-sm text-amber-600 dark:text-amber-400">
              <Ban className="w-5 h-5" />
              <span>Subscription Cancelled</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Your subscription will remain active until{' '}
              <strong className="font-mono">{new Date(subscription?.currentPeriodEnd || Date.now()).toLocaleDateString()}</strong>.
              You will not be billed again.
            </p>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={handleResumeSubscription}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resume Auto-Renewal</span>
            </button>
          )}
        </div>
      )}

      {/* Pending Downgrade banner */}
      {pendingDowngradePlan && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-200 flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600 shrink-0" />
          <p className="text-xs leading-relaxed">
            A downgrade to the <strong className="font-bold">{pendingDowngradePlan.name}</strong> plan is scheduled to take effect at the end of the current billing period ({new Date(subscription?.currentPeriodEnd || Date.now()).toLocaleDateString()}). All your data remains intact.
          </p>
        </div>
      )}

      {/* Non-owner access notice */}
      {!isOwner && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">Read-Only Billing Access</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              Only the primary Pharmacy Owner can initiate Paystack checkouts or modify subscription tiers. Your account role ({currentUser.role}) has view-only permissions.
            </p>
          </div>
        </div>
      )}

      {/* Grace Period Banner */}
      {isGracePeriod && !isExpired && (
        <div className="p-5 rounded-2xl bg-orange-500/10 border-2 border-orange-500 text-orange-900 dark:text-orange-200 space-y-2">
          <div className="flex items-center gap-2 font-black text-sm text-orange-600 dark:text-orange-400">
            <Clock className="w-5 h-5" />
            <span>3-Day Renewal Grace Period Active ({graceDaysRemaining} day{graceDaysRemaining === 1 ? '' : 's'} remaining)</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            Your billing renewal is pending. All features and data entry remain temporarily enabled during your grace window. Please settle your renewal or update payment details before grace expiration to prevent disruptions.
          </p>
        </div>
      )}

      {/* Expired Subscription Banner */}
      {isExpired && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500 text-rose-900 dark:text-rose-200 space-y-2">
          <div className="flex items-center gap-2 font-black text-sm text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <span>Your Trial / Subscription Has Expired</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            Your pharmacy data remains 100% safe and accessible for viewing and reporting. To resume adding new medicine stock, inviting additional staff members, and processing new sales, please select and activate a paid plan below.
          </p>
        </div>
      )}

      {/* Active Plan & Limits Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Plan Overview */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Current Plan
            </span>
            {getStatusBadge()}
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {plan?.name || 'Starter'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {plan?.description}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Plan Rate:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                ${plan?.price}/month
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Billing Interval:</span>
              <span className="font-bold text-slate-900 dark:text-white capitalize">
                {plan?.billingInterval || 'Monthly'}
              </span>
            </div>
            {subscription?.currentPeriodEnd && (
              <div className="flex justify-between">
                <span className="text-slate-500">Next Renewal / Expiry:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
            )}
            {subscription?.lastPaymentAt && (
              <div className="flex justify-between">
                <span className="text-slate-500">Last Verified Payment:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {new Date(subscription.lastPaymentAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Cancellation button */}
          {isOwner && isActive && !isCancelledAtPeriodEnd && !isTrial && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="text-[11px] font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Subscription Renewal</span>
              </button>
            </div>
          )}
        </div>

        {/* User Quota Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Staff Seat Usage
            </span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {limits.currentUsers}
              </span>
              <span className="text-xs font-bold text-slate-400">
                / {limits.maxUsers >= 9000 ? 'Unlimited' : `${limits.maxUsers} max`}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active staff members configured in this pharmacy
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-2">
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  limits.currentUsers >= limits.maxUsers
                    ? 'bg-rose-500'
                    : limits.currentUsers / limits.maxUsers > 0.8
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    limits.maxUsers >= 9000 ? 5 : (limits.currentUsers / limits.maxUsers) * 100
                  )}%`
                }}
              />
            </div>
            {limits.currentUsers >= limits.maxUsers && limits.maxUsers < 9000 && (
              <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Seat limit reached. Upgrade to add more.
              </p>
            )}
          </div>
        </div>

        {/* Medicine Inventory Quota Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Catalog SKUs
            </span>
            <Pill className="w-4 h-4 text-teal-600" />
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {limits.currentMedicines}
              </span>
              <span className="text-xs font-bold text-slate-400">
                / {limits.maxMedicines.toLocaleString()} max
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active pharmaceutical medicines in inventory
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-2">
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  limits.currentMedicines >= limits.maxMedicines
                    ? 'bg-rose-500'
                    : limits.currentMedicines / limits.maxMedicines > 0.8
                    ? 'bg-amber-500'
                    : 'bg-teal-500'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (limits.currentMedicines / limits.maxMedicines) * 100
                  )}%`
                }}
              />
            </div>
            {limits.currentMedicines >= limits.maxMedicines && (
              <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Medicine SKU limit reached. Upgrade to expand.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Plans Comparison Grid */}
      <div className="space-y-6 pt-4">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Compare Commercial Plans
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pay securely with Paystack. Authoritative tier limits enforced at PostgreSQL and API layers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = plan?.slug === p.slug;
            const isPopular = p.slug === 'professional';
            const isDowngrade = (plan?.price || 0) > p.price;

            return (
              <div
                key={p.id}
                className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 ${
                  isCurrent
                    ? 'bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10'
                    : isPopular
                    ? 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-md'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm'
                }`}
              >
                {/* Popular Badge */}
                {isPopular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow">
                    Most Popular
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow flex items-center gap-1">
                    <Check className="w-3 h-3" /> Current Plan
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">
                      {p.description}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">
                      ${p.price}
                    </span>
                    <span className="text-xs font-bold text-slate-400">/ month</span>
                  </div>

                  {/* Core Limits Summary */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-600" /> Max Staff:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {p.maxUsers >= 9000 ? 'Unlimited' : `${p.maxUsers} users`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-teal-600" /> Inventory SKUs:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {p.maxMedicines.toLocaleString()} medicines
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 pt-2">
                    <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Included Capabilities
                    </p>
                    <div className="space-y-2">
                      {p.features.map((featKey, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span>{featureLabels[featKey] || featKey}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Plan Action Button */}
                <div className="pt-8">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs cursor-default flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Active Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => handleSelectPlan(p)}
                      className={`w-full py-3 rounded-2xl font-bold text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDowngrade
                          ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                      }`}
                    >
                      <span>
                        {isDowngrade ? 'Schedule Downgrade to ' + p.name : 'Upgrade via Paystack ($' + p.price + ')'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing & Payment History Section */}
      <div className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>Billing History & Official Receipts</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Authoritative payment audit logs and downloadable PDF invoices
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchPayments()}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
              No Billing History Yet
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Once you upgrade your subscription via Paystack, verified payment receipts and tax invoices will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Plan License</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Gateway</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {payments.map((pmt) => (
                  <tr key={pmt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      {new Date(pmt.paidAt || pmt.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {pmt.planName || 'Commercial Plan'}
                    </td>
                    <td className="py-3.5 px-4 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      ${pmt.amount.toFixed(2)} {pmt.currency}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-slate-600 dark:text-slate-300">
                      {pmt.provider}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {pmt.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[160px]">
                      {pmt.paymentReference}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoicePayment(pmt)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paystack Integration Architecture Info */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 text-white shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">
              Paystack & Modular Billing Engine (Phase 6D)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure HMAC-SHA512 Webhooks, Server-Side Paystack Verification, and RLS Idempotency Protection
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-emerald-400">Zero Secret Keys in Browser</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Client bundles only public keys; payment secret keys reside strictly on secure server-side infrastructure.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-emerald-400">Authoritative Price Integrity</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Price calculations, currency validation, and billing periods are enforced from PostgreSQL tables.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-emerald-400">Idempotency & Audit Logs</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Duplicate payments are prevented by unique transaction constraints with automated audit logs.
            </p>
          </div>
        </div>
      </div>

      {/* Paystack Checkout Upgrade Modal */}
      {showCheckoutModal && targetPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white mx-auto flex items-center justify-center font-bold shadow-md shadow-emerald-600/30">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Upgrade to {targetPlan.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Complete your checkout via Paystack to activate expanded capacity immediately.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Selected Plan:</span>
                <span className="font-bold text-slate-900 dark:text-white">{targetPlan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Authoritative Price:</span>
                <span className="font-bold text-emerald-600 font-mono text-sm">${targetPlan.price} / month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Gateway:</span>
                <span className="font-bold text-slate-900 dark:text-white">Paystack</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Staff Seats:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {targetPlan.maxUsers >= 9000 ? 'Unlimited' : `${targetPlan.maxUsers} seats`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Medicine SKU Limit:</span>
                <span className="font-bold text-teal-600 font-mono">
                  {targetPlan.maxMedicines.toLocaleString()} medicines
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300 text-[11px] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-purple-600" />
              <span>Payments are verified directly with Paystack API before updating your subscription status.</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInitiatePaystackCheckout}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Payment...</span>
                  </>
                ) : (
                  <>
                    <span>Pay ${targetPlan.price} via Paystack</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Downgrade Scheduling Modal */}
      {showDowngradeModal && targetPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center font-bold">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Schedule Plan Downgrade: {targetPlan.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Downgrade will take effect at the end of your current paid billing period.
              </p>
            </div>

            {/* Capacity Warning Check */}
            {(limits.currentUsers > targetPlan.maxUsers || limits.currentMedicines > targetPlan.maxMedicines) && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Usage Exceeds New Plan Limits</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Your current pharmacy has <strong>{limits.currentUsers} active users</strong> (new limit: {targetPlan.maxUsers}) and <strong>{limits.currentMedicines} medicines</strong> (new limit: {targetPlan.maxMedicines}).
                </p>
                <p className="text-[11px] leading-relaxed font-bold text-amber-800 dark:text-amber-200">
                  Note: No users or medicines will be deleted. You will simply be prevented from adding new ones until usage is within limits.
                </p>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Target Plan:</span>
                <span className="font-bold text-slate-900 dark:text-white">{targetPlan.name} (${targetPlan.price}/mo)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Effective Date:</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white">
                  {new Date(subscription?.currentPeriodEnd || Date.now()).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDowngradeModal(false)}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDowngrade}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Confirm Scheduled Downgrade</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 mx-auto flex items-center justify-center font-bold">
                <Ban className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Cancel Subscription Renewal
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to stop automatic renewal for your pharmacy?
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
              <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                Your subscription will remain active with full access to all features until{' '}
                <strong className="font-bold text-slate-900 dark:text-white font-mono">
                  {new Date(subscription?.currentPeriodEnd || Date.now()).toLocaleDateString()}
                </strong>.
              </p>
              <p className="text-[11px] text-slate-400">
                You will not be billed again. You can resume auto-renewal anytime before this date.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleConfirmCancellation}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Cancel at Period End</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice / Receipt Modal */}
      {selectedInvoicePayment && (
        <SubscriptionInvoiceModal
          payment={selectedInvoicePayment}
          onClose={() => setSelectedInvoicePayment(null)}
        />
      )}
    </div>
  );
};
