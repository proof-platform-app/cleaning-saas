// dubai-control/src/pages/settings/Billing.tsx

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Download, Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useUserRole, canAccessBilling, canModifyBilling } from "@/hooks/useUserRole";

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

  // Redirect Staff users
  useEffect(() => {
    if (!canAccess) {
      toast({
        variant: "destructive",
        title: "Access restricted",
        description: "Billing access restricted to administrators",
      });
      navigate("/settings", { replace: true });
    }
  }, [canAccess, navigate, toast]);

  // Mock data
  const [plan] = useState({
    name: "Pro Plan",
    status: "active" as "trial" | "active" | "past_due" | "cancelled",
    nextBillingDate: "March 15, 2026",
  });

  const [usage] = useState<UsageMetric[]>([
    {
      label: "Active Users",
      current: 8,
      limit: 10,
      helperText: "2 more users available",
    },
    {
      label: "Locations",
      current: 12,
      limit: 30,
      helperText: "18 locations remaining",
    },
    {
      label: "Job Volume (Current Month)",
      current: 145,
      limit: 200,
      helperText: "Resets on March 1",
    },
  ]);

  const [paymentMethod] = useState({
    type: "Visa",
    last4: "4242",
    expiry: "12/2026",
  });

  const [invoices] = useState<Invoice[]>([
    { id: "inv_1", date: "Feb 1 2026", amount: 199.0, status: "paid" },
    { id: "inv_2", date: "Jan 1 2026", amount: 199.0, status: "paid" },
    { id: "inv_3", date: "Dec 1 2025", amount: 199.0, status: "failed" },
  ]);

  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

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

  const handleDownloadInvoice = async (invoiceId: string) => {
    setDownloadingInvoice(invoiceId);

    try {
      // TODO: API call to download invoice
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Invoice downloaded",
        description: "Your invoice has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download invoice",
      });
    } finally {
      setDownloadingInvoice(null);
    }
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

      {/* Manager Read-Only Banner */}
      {isManager && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
          <p className="text-blue-900">
            Billing management restricted to account owner. You have read-only access.
          </p>
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

        {/* Section B: Usage Summary */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-foreground">Usage Summary</h2>

          <div className="space-y-6">
            {usage.map((metric) => {
              const percentage = Math.round((metric.current / metric.limit) * 100);
              const progressColor = getUsageColor(percentage);
              const textColor = getUsageTextColor(percentage);

              return (
                <div key={metric.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {metric.label}
                    </span>
                    <span className={`text-sm font-medium ${textColor}`}>
                      {metric.current} of {metric.limit}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all duration-300 ${progressColor}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  {/* Helper Text */}
                  <p
                    className={`text-xs ${
                      percentage >= 100
                        ? "font-medium text-status-failed"
                        : percentage >= 80
                          ? "font-medium text-status-flagged"
                          : "text-muted-foreground"
                    }`}
                  >
                    {percentage >= 100 && "❌ "}
                    {percentage >= 80 && percentage < 100 && "⚠ "}
                    {metric.helperText}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section C: Payment Method */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-foreground">Payment Method</h2>

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
                        <button
                          onClick={() => handleDownloadInvoice(invoice.id)}
                          disabled={downloadingInvoice === invoice.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                          title="Download invoice"
                        >
                          {downloadingInvoice === invoice.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
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
                You'll see your billing history here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
