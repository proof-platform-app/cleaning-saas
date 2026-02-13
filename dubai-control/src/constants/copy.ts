// dubai-control/src/constants/copy.ts

/**
 * Unified copy strings for consistent UX across the app
 *
 * Usage:
 *   import { TRIAL_COPY, BILLING_COPY } from "@/constants/copy";
 */

// ============================================
// Trial Status Copy
// ============================================

export const TRIAL_COPY = {
  // Trial active
  trialActive: (daysLeft: number) =>
    `Trial ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`,

  // Trial expired
  trialExpired: "Trial expired — upgrade required to create new jobs",

  // Trial active description
  trialActiveDescription:
    "You're exploring CleanProof with full access. Upgrade anytime — no changes to your data.",

  // Trial expired description
  trialExpiredDescription:
    "Your 7-day free trial has ended. You can still view existing jobs and download reports, but creating new jobs requires an upgrade.",

  // After trial info
  afterTrialInfo: [
    "You can still access existing jobs, reports, and proof history.",
    "Creating new jobs is restricted until your plan is activated.",
    "Usage limits will remain active until you upgrade.",
  ],
} as const;

// ============================================
// Billing Page Copy
// ============================================

export const BILLING_COPY = {
  // Role-based banners
  ownerBanner:
    "You are the billing administrator for this account. You can manage subscriptions, payment methods, and view invoices.",

  managerBanner:
    "Read-only access. Only the account owner can modify billing settings, upgrade plans, or manage payment methods.",

  managerUpgradeNote: "Only the account owner can upgrade",

  // CTA labels
  ownerCta: "Contact to upgrade",
  viewPlans: "View plans",
  upgradeCta: "View plans & upgrade",

  // Payment method
  noPaymentMethod: "No payment method on file.",
  addPaymentOwner: "Contact us to activate a paid plan.",
  addPaymentNonOwner:
    "Only the account owner can manage billing. Contact your administrator.",
  contactToSetup: "Contact to upgrade",

  // Invoices
  noInvoices: "Invoices will appear after a paid plan is activated.",
  downloadRestricted: "Only account owner can download invoices",
} as const;

// ============================================
// Access Restriction Copy
// ============================================

export const ACCESS_COPY = {
  // Access restricted title
  title: "Access restricted",

  // Role-specific messages
  manager: "Ask the account owner to grant access or upgrade.",
  staff: "This area is restricted to administrators.",
  cleaner: "This area is restricted to administrators.",
  default: "You don't have permission to access this area.",

  // Toast messages
  billingRestricted:
    "Billing is only available to account owners and managers.",
  companyRestricted: "Company management is restricted to administrators.",
  teamRestricted: "Team management is restricted to administrators.",
} as const;

// ============================================
// Unified CTA Copy
// ============================================

export const CTA_COPY = {
  // Contact to upgrade - used everywhere pre-payment
  contactToUpgrade: "Contact to upgrade",
  // Contact destination
  contactHref: "/cleanproof/contact",
} as const;

// ============================================
// Plan Status Constants (source of truth)
// ============================================

export const PLAN_STATUS = {
  TRIAL: "trial",
  ACTIVE: "active",
  BLOCKED: "blocked",
} as const;

export const BILLING_STATUS = {
  TRIAL: "trial",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELLED: "cancelled",
} as const;

// Type helpers
export type PlanStatus = (typeof PLAN_STATUS)[keyof typeof PLAN_STATUS];
export type BillingStatus = (typeof BILLING_STATUS)[keyof typeof BILLING_STATUS];

// ============================================
// Plan Tier Display Names
// ============================================

export const PLAN_TIER_NAMES: Record<string, string> = {
  standard: "Standard Plan",
  pro: "Pro Plan",
  enterprise: "Enterprise Plan",
};

export const formatPlanTier = (tier: string): string => {
  return PLAN_TIER_NAMES[tier] || tier;
};

// ============================================
// Status Display Names
// ============================================

export const STATUS_NAMES: Record<string, string> = {
  active: "Active",
  trial: "Trial",
  past_due: "Past Due",
  cancelled: "Cancelled",
};

export const formatStatus = (status: string): string => {
  return STATUS_NAMES[status] || status;
};
