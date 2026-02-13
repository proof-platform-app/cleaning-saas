// dubai-control/src/pages/settings/Billing.tsx

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Download, Info, AlertCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useUserRole, canAccessBilling, canModifyBilling } from "@/hooks/useUserRole";
import { getBillingSummary, downloadInvoice, type BillingSummary } from "@/api/client";
import {
  extractAPIError,
  getErrorMessage,
  isForbiddenError,
  isNotImplementedError,
} from "@/utils/apiErrors";

interface UsageMetric {
  label: string;
  current: number;
  limit: number;
  helperText: string;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "failed" | "pending" | "refunded";
}

export default function Billing() {
  const user = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  const canAccess = canAccessBilling(user.role);
  const isOwner = canModifyBilling(user.role);
  const isManager = user.role === "manager";

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [billingData, setBillingData] = useState<BillingSummary | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState<number | null>(null);

  // Redirect Staff/Cleaner users with clear explanation
  useEffect(() => {
    if (!canAccess) {
      toast({
        variant: "destructive",
        title: "Access restricted",
        description: "Billing is only available to account owners and managers. Contact your administrator for billing inquiries.",
      });
      navigate("/settings", { replace: true });
    }
  }, [canAccess, navigate, toast]);

  // Fetch billing data
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      if (!canAccess) return;

      try {
        setIsLoading(true);
        setLoadError(null);

        const data = await getBillingSummary();

        if (!mounted) return;
        setBillingData(data);
      } catch (error: any) {
        console.error("Failed to fetch billing data:", error);

        if (!mounted) return;

        const apiError = extractAPIError(error);

        // Handle 403 specifically (shouldn't happen if RBAC is correct, but just in case)
        if (isForbiddenError(error)) {
          toast({
            variant: "destructive",
            title: "Access restricted",
            description: apiError.message,
          });
          navigate("/settings", { replace: true });
        } else {
          setLoadError(getErrorMessage(error));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [canAccess, navigate, toast]);

  // Trial countdown logic
  const getTrialStatus = (): { daysRemaining: number; expired: boolean; message: string } | null => {
    if (!billingData) return null;

    // Only show trial countdown if status is "trial" or plan is "trial"
    const isTrial = billingData.status === "trial" || billingData.plan === "trial";
    if (!isTrial || !billingData.trial_expires_at) return null;

    try {
      const now = new Date();
      const expiresAt = new Date(billingData.trial_expires_at);
      const diffMs = expiresAt.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        return {
          daysRemaining: 0,
          expired: true,
          message: "Trial expired",
        };
      }

      return {
        daysRemaining: diffDays,
        expired: false,
        message: `Trial expires in ${diffDays} ${diffDays === 1 ? "day" : "days"}`,
      };
    } catch (error) {
      console.error("Failed to parse trial_expires_at:", error);
      return null;
    }
  };

  // Usage progress bar color based on percentage
  const getUsageColor = (percentage: number): string => {
    if (percentage >= 100) return "bg-status-failed"; // Error
    if (percentage >= 80) return "bg-status-flagged"; // Warning
    return "bg-accent-primary"; // Accent (0-79%)
  };

  const getUsageTextColor = (percentage: number): string => {
    if (percentage >= 100) return "text-status-failed";
    if (percentage >= 80) return "text-status-flagged";
    return "text-foreground";
  };

  const handleDownloadInvoice = async (invoiceId: number) => {
    setDownloadingInvoice(invoiceId);

    try {
      const blob = await downloadInvoice(invoiceId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Invoice downloaded",
        description: "Your invoice has been downloaded successfully.",
      });
    } catch (error: any) {
      console.error("Failed to download invoice:", error);

      const apiError = extractAPIError(error);

      // Handle 501 (not implemented)
      if (isNotImplementedError(error)) {
        toast({
          variant: "destructive",
          title: "Not available yet",
          description: apiError.message,
        });
      } else if (isForbiddenError(error)) {
        toast({
          variant: "destructive",
          title: "Access denied",
          description: apiError.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: getErrorMessage(error),
        });
      }
    } finally {
      setDownloadingInvoice(null);
    }
  };

  // Helper functions to format API data
  const formatPlanName = (plan: string): string => {
    const planMap: Record<string, string> = {
      trial: "Trial Plan",
      active: "Pro Plan",
      blocked: "Suspended",
    };
    return planMap[plan] || plan;
  };

  const formatNextBillingDate = (date: string | null): string => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const getUsageHelperText = (current: number, limit: number | null, label: string): string => {
    if (limit === null) return "Unlimited";
    const remaining = limit - current;
    if (remaining <= 0) return `Limit reached`;
    if (label.includes("Job")) return "Resets monthly";
    return `${remaining} remaining`;
  };

  const getStatusBadgeClasses = (status: Invoice["status"]): string => {
    switch (status) {
      case "paid":
        return "bg-status-completed-bg text-status-completed";
      case "failed":
        return "bg-status-failed-bg text-status-failed";
      case "pending":
        return "bg-blue-50 text-blue-700";
      case "refunded":
        return "bg-status-flagged-bg text-status-flagged";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Don't render if access check fails (will redirect)
  if (!canAccess) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <CreditCard className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Billing
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your subscription and payment methods
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-6 h-6 w-48 animate-pulse rounded bg-muted" />
              <div className="space-y-4">
                <div className="h-11 w-full animate-pulse rounded bg-muted" />
                <div className="h-11 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (loadError || !billingData) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <Link
          to="/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <CreditCard className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Billing
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your subscription and payment methods
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-status-failed bg-status-failed-bg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-status-failed" />
            <div className="flex-1">
              <h3 className="font-semibold text-status-failed">Failed to load billing information</h3>
              <p className="mt-1 text-sm text-status-failed">
                {loadError || "Could not retrieve billing data"}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for rendering
  const plan = {
    name: formatPlanName(billingData.plan),
    status: billingData.status,
    nextBillingDate: formatNextBillingDate(billingData.next_billing_date),
  };

  const trialStatus = getTrialStatus();

  const usage: UsageMetric[] = [
    {
      label: "Active Users",
      current: billingData.usage_summary.users_count,
      limit: billingData.usage_summary.users_limit || 999999,
      helperText: getUsageHelperText(
        billingData.usage_summary.users_count,
        billingData.usage_summary.users_limit,
        "Users"
      ),
    },
    {
      label: "Locations",
      current: billingData.usage_summary.locations_count,
      limit: billingData.usage_summary.locations_limit || 999999,
      helperText: getUsageHelperText(
        billingData.usage_summary.locations_count,
        billingData.usage_summary.locations_limit,
        "Locations"
      ),
    },
    {
      label: "Job Volume (Current Month)",
      current: billingData.usage_summary.jobs_month_count,
      limit: billingData.usage_summary.jobs_month_limit || 999999,
      helperText: getUsageHelperText(
        billingData.usage_summary.jobs_month_count,
        billingData.usage_summary.jobs_month_limit,
        "Jobs"
      ),
    },
  ];

  const paymentMethod = billingData.payment_method
    ? {
        type: billingData.payment_method.brand,
        last4: billingData.payment_method.last4,
        expiry: `${billingData.payment_method.exp_month}/${billingData.payment_method.exp_year}`,
      }
    : null;

  const invoices: Invoice[] = billingData.invoices.map((inv: any) => ({
    id: String(inv.id),
    date: inv.date || "N/A",
    amount: inv.amount || 0,
    status: inv.status || "pending",
  }));

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* Back Link - Mobile Only */}
      <Link
        to="/settings"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Settings
      </Link>

      {/* Page Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <CreditCard className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Billing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your subscription and payment methods
          </p>
        </div>
      </div>

      {/* Role Context Banner */}
      {isOwner && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" />
          <p className="text-emerald-900">
            You are the <span className="font-medium">billing administrator</span> for this account.
            You can manage subscriptions, payment methods, and view invoices.
          </p>
        </div>
      )}

      {isManager && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
          <p className="text-blue-900">
            <span className="font-medium">Read-only access.</span> Only the account owner can modify billing settings, upgrade plans, or manage payment methods.
          </p>
        </div>
      )}

      {/* Trial Urgency Banner (Top Priority) */}
      {trialStatus && (
        <div
          className={`mb-6 rounded-xl border p-6 shadow-sm ${
            trialStatus.expired
              ? "border-status-flagged bg-status-flagged-bg"
              : "border-blue-200 bg-blue-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <Clock
              className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                trialStatus.expired ? "text-status-flagged" : "text-blue-700"
              }`}
            />
            <div className="flex-1">
              <h3
                className={`text-base font-semibold ${
                  trialStatus.expired ? "text-status-flagged" : "text-blue-900"
                }`}
              >
                {trialStatus.message}
              </h3>
              <p
                className={`mt-1 text-sm ${
                  trialStatus.expired ? "text-status-flagged" : "text-blue-800"
                }`}
              >
                {trialStatus.expired
                  ? "You can still access existing data. Creating new jobs may be restricted until your plan is activated."
                  : "Upgrade to keep creating new jobs and stay within limits."}
              </p>

              {/* CTA */}
              <div className="mt-4">
                {isOwner ? (
                  <Button
                    asChild
                    className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  >
                    <Link to="/cleanproof/pricing">View plans & upgrade</Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      asChild
                      variant="secondary"
                    >
                      <Link to="/cleanproof/pricing">View plans</Link>
                    </Button>
                    <p className="mt-2 text-xs text-blue-700">
                      Only the account owner can upgrade or modify the subscription.
                      Contact your administrator to make changes.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-6">
        {/* Section A: Current Plan */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-foreground">Current Plan</h2>

          <div className="space-y-4">
            {/* Plan Badge */}
            <div>
              <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground">
                {plan.name}
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  plan.status === "active"
                    ? "bg-status-completed-bg text-status-completed"
                    : plan.status === "trial"
                      ? "bg-blue-50 text-blue-700"
                      : plan.status === "past_due"
                        ? "bg-status-failed-bg text-status-failed"
                        : "bg-status-flagged-bg text-status-flagged"
                }`}
              >
                {plan.status === "active" ? "Active" : plan.status}
              </span>
            </div>

            {/* Next Billing Date */}
            <p className="text-sm text-muted-foreground">
              Next billing date: {plan.nextBillingDate}
            </p>

            {/* CTA Button - Owner Only */}
            {isOwner && (
              <div className="pt-2">
                <Button className="bg-accent-primary text-white hover:bg-accent-primary/90">
                  Manage plan
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Section A2: After Trial (Trial users only) */}
        {trialStatus && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-foreground">After trial</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• You can still access existing jobs, reports, and proof history.</p>
              <p>• Creating new jobs may be restricted until your plan is activated.</p>
              <p>• Usage limits will remain active until you upgrade.</p>
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              Need a paid plan? Contact us to upgrade.
            </p>
          </div>
        )}

        {/* Section B: Usage Summary */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-foreground">Usage Summary</h2>

          <div className="space-y-6">
            {usage.map((metric) => {
              // Handle unlimited (null limit)
              const isUnlimited = metric.limit >= 999999;
              const percentage = isUnlimited
                ? 0
                : Math.round((metric.current / metric.limit) * 100);
              const progressColor = getUsageColor(percentage);
              const textColor = getUsageTextColor(percentage);

              return (
                <div key={metric.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {metric.label}
                    </span>
                    <span className={`text-sm font-medium ${textColor}`}>
                      {metric.current} {isUnlimited ? "" : `of ${metric.limit}`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {!isUnlimited && (
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full transition-all duration-300 ${progressColor}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  )}

                  {/* Helper Text with Warning/Error States */}
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-xs ${
                        percentage >= 100
                          ? "font-medium text-status-failed"
                          : percentage >= 80
                            ? "font-medium text-status-flagged"
                            : "text-muted-foreground"
                      }`}
                    >
                      {metric.helperText}
                    </p>
                    {percentage >= 100 && (
                      <span className="text-xs font-semibold text-status-failed">
                        • Limit reached
                      </span>
                    )}
                    {percentage >= 80 && percentage < 100 && (
                      <span className="text-xs font-semibold text-status-flagged">
                        • Approaching limit
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section C: Payment Method */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-foreground">Payment Method</h2>

          {paymentMethod ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {paymentMethod.type} ending in {paymentMethod.last4}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires {paymentMethod.expiry}
                  </p>
                </div>
              </div>

              {/* Change Payment Method Button - Owner Only */}
              {isOwner && (
                <div className="pt-2">
                  <Button variant="outline">Change payment method</Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No payment method on file.</p>
              {isOwner ? (
                <>
                  <p className="text-sm text-foreground">
                    Add a payment method to activate a paid plan and unlock all features.
                  </p>
                  <div className="pt-1">
                    <Button asChild variant="outline">
                      <Link to="/cleanproof/contact">Contact us to set up billing</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Only the account owner can add payment methods.
                  Contact your administrator to set up billing.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Section D: Invoices */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-foreground">Invoices</h2>

          {invoices.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Download
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm text-foreground">
                        {invoice.date}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium tabular-nums text-foreground">
                        ${invoice.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClasses(invoice.status)}`}
                        >
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isOwner ? (
                          <button
                            onClick={() => handleDownloadInvoice(Number(invoice.id))}
                            disabled={downloadingInvoice === Number(invoice.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                            title="Download invoice"
                          >
                            {downloadingInvoice === Number(invoice.id) ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </button>
                        ) : (
                          <span
                            className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg text-muted-foreground/50"
                            title="Only account owner can download invoices"
                          >
                            <Download className="h-4 w-4" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No invoices yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Invoices appear after a paid plan is activated.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
