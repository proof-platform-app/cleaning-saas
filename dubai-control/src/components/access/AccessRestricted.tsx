// dubai-control/src/components/access/AccessRestricted.tsx

import { Link } from "react-router-dom";
import { ShieldX, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCESS_COPY } from "@/constants/copy";
import type { UserRole } from "@/hooks/useUserRole";

interface AccessRestrictedProps {
  /**
   * User's role for context-specific messaging
   */
  role?: UserRole;
  /**
   * What area is restricted (e.g., "Billing", "Company", "Team")
   */
  area?: string;
  /**
   * Where to redirect with back button
   * @default "/dashboard"
   */
  backTo?: string;
  /**
   * Label for back button
   * @default "Back to Dashboard"
   */
  backLabel?: string;
  /**
   * Show contact CTA for upgrade
   * @default false
   */
  showContactCta?: boolean;
  /**
   * Contact CTA text
   * @default "Contact to upgrade"
   */
  contactCtaText?: string;
  /**
   * Contact CTA destination
   * @default "/cleanproof/contact"
   */
  contactCtaHref?: string;
}

/**
 * Unified "Access restricted" screen for 403 errors
 *
 * Consistent UX across all restricted areas with role-specific copy:
 * - Manager: "Ask the account owner to grant access or upgrade."
 * - Staff/Cleaner: "This area is restricted to administrators."
 *
 * All CTAs point to /cleanproof/contact by default for pre-payment flow.
 */
export function AccessRestricted({
  role,
  area = "This area",
  backTo = "/dashboard",
  backLabel = "Back to Dashboard",
  showContactCta = false,
  contactCtaText = "Contact to upgrade",
  contactCtaHref = "/cleanproof/contact",
}: AccessRestrictedProps) {
  // Role-specific messaging using centralized copy
  const getMessage = (): string => {
    switch (role) {
      case "manager":
        return ACCESS_COPY.manager;
      case "staff":
        return ACCESS_COPY.staff;
      case "cleaner":
        return ACCESS_COPY.cleaner;
      default:
        return ACCESS_COPY.default;
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      {/* Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <ShieldX className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {ACCESS_COPY.title}
      </h1>

      {/* Area context */}
      <p className="mt-2 text-sm text-muted-foreground">
        {area} is not available for your account.
      </p>

      {/* Role-specific message */}
      <p className="mt-4 text-sm text-muted-foreground">{getMessage()}</p>

      {/* Action buttons */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="outline">
          <Link to={backTo}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>

        {showContactCta && (
          <Button asChild>
            <Link to={contactCtaHref}>
              {contactCtaText}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export default AccessRestricted;
