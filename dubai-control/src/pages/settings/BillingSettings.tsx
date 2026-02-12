import { Link } from 'react-router-dom';
import { ArrowLeft, CreditCard } from 'lucide-react';

export default function BillingSettings() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* Back Link */}
      <Link
        to="/settings"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
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
          <p className="text-sm text-muted-foreground">
            Manage your subscription, payment methods, and billing history
          </p>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <CreditCard className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Coming Soon
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Billing management interface is under development. You'll be able to
          view your subscription plan, update payment methods, and access
          invoices here.
        </p>
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Return to Settings
        </Link>
      </div>
    </div>
  );
}
