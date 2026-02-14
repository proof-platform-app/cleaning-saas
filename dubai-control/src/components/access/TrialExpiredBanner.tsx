// dubai-control/src/components/access/TrialExpiredBanner.tsx

import { Link } from "react-router-dom";
import { Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRIAL_COPY } from "@/constants/copy";

interface TrialExpiredBannerProps {
  /**
   * Variant controls the visual style
   * - "inline": Compact banner for embedding in pages (default)
   * - "block": Larger block for prominent display
   */
  variant?: "inline" | "block";
  /**
   * Custom title (overrides default TRIAL_COPY.trialExpired)
   */
  title?: string;
  /**
   * Custom description (overrides default TRIAL_COPY.trialExpiredDescription)
   */
  description?: string;
  /**
   * Show/hide the CTA button
   * @default true
   */
  showCta?: boolean;
  /**
   * CTA button text
   * @default "Contact to upgrade"
   */
  ctaText?: string;
  /**
   * CTA destination
   * @default "/cleanproof/contact"
   */
  ctaHref?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Unified trial expired banner for consistent UX across the app
 *
 * Usage:
 * - Inline variant for page headers and form contexts
 * - Block variant for empty states and prominent notices
 *
 * All CTAs point to /cleanproof/contact by default for pre-payment flow.
 */
export function TrialExpiredBanner({
  variant = "inline",
  title = TRIAL_COPY.trialExpired,
  description = TRIAL_COPY.trialExpiredDescription,
  showCta = true,
  ctaText = "Contact to upgrade",
  ctaHref = "/cleanproof/contact",
  className = "",
}: TrialExpiredBannerProps) {
  if (variant === "block") {
    return (
      <div
        className={`rounded-lg border border-amber-200 bg-amber-50 p-6 ${className}`}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-amber-900">{title}</h3>
            <p className="mt-1 text-sm text-amber-800">{description}</p>
            {showCta && (
              <Button
                asChild
                variant="outline"
                className="mt-4 border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
              >
                <Link to={ctaHref}>
                  {ctaText}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Inline variant (default)
  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 ${className}`}
    >
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-amber-900">{title}</p>
          <p className="mt-0.5 text-sm text-amber-800">{description}</p>
        </div>
      </div>
      {showCta && (
        <Button
          asChild
          size="sm"
          variant="outline"
          className="flex-shrink-0 border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
        >
          <Link to={ctaHref}>{ctaText}</Link>
        </Button>
      )}
    </div>
  );
}

export default TrialExpiredBanner;
