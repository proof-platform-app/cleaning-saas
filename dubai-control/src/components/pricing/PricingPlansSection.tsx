// dubai-control/src/components/pricing/PricingPlansSection.tsx
import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import type { PricingMode } from "@/pages/PricingPage";
import { upgradeToActive, type PlanTier } from "@/api/client";

const plans: {
  name: string;
  tier: PlanTier;
  price: string;
  description: string;
  features: string[];
  cta: string;
  ctaLink: string | null;
  note: string | null;
  badge: string | null;
  highlighted: boolean;
}[] = [
  {
    name: "Standard",
    tier: "standard",
    price: "$79",
    description: "For small teams that need reliable proof.",
    features: [
      "Up to 5 cleaners",
      "Up to 300 jobs / month",
      "GPS check-in / check-out",
      "Before & after photos",
      "Checklist validation",
      "Verified PDF reports",
    ],
    cta: "Start 7-day trial",
    ctaLink: null as string | null,
    note: "No credit card required.",
    badge: null as string | null,
    highlighted: false,
  },
  {
    name: "Pro",
    tier: "pro",
    price: "$149",
    description: "For growing operations with higher volume.",
    features: [
      "Up to 15 cleaners",
      "Unlimited jobs",
      "Everything in Standard",
      "Priority support",
      "Advanced proof use cases",
      "",
    ],
    cta: "Request access",
    ctaLink: "/cleanproof/demo",
    note: null as string | null,
    badge: "Most teams choose Pro",
    highlighted: true,
  },
];

type Props = {
  mode: PricingMode;
};

const PricingPlansSection = ({ mode }: Props) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const navigate = useNavigate();
  const [isUpgrading, setIsUpgrading] = useState(false);

  // CTA для Standard-плана в зависимости от режима
  const getStandardCta = () => {
    switch (mode) {
      case "trial_active":
        return {
          label: "Current plan",
          note: "Trial active",
          disabled: true,
        };
      case "trial_expired":
        return {
          label: "Upgrade to Standard",
          note: "Continue with full access",
          disabled: false,
        };
      case "other":
        return {
          label: "Current plan",
          note: "Active subscription",
          disabled: true,
        };
      default: // "anonymous"
        return {
          label: "Start 7-day trial",
          note: "No credit card required.",
          disabled: false,
        };
    }
  };

  const standardCta = getStandardCta();

  const handleUpgrade = async (tier: PlanTier) => {
    setIsUpgrading(true);
    try {
      await upgradeToActive(tier);
      // После успешного апгрейда перенаправляем на dashboard
      navigate("/dashboard");
    } catch (error) {
      console.error("Upgrade failed:", error);
      alert("Failed to upgrade. Please try again or contact support.");
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <section
      ref={ref}
      className="relative py-20 md:py-28 px-6 bg-foreground"
    >
      {/* Grid overlay - matching landing page */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-12 md:mb-14 text-center"
        >
          <p className="text-primary/60 text-xs uppercase tracking-[0.2em] mb-4">
            Plans
          </p>
          <h2 className="text-2xl md:text-3xl font-semibold text-primary-foreground">
            Choose your scale.
          </h2>
        </motion.div>

        {/* Shared container for both cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="bg-primary-foreground/[0.02] border border-primary-foreground/[0.08] rounded-2xl p-2"
        >
          <div className="grid md:grid-cols-2">
            {plans.map((plan, index) => {
              const isStandard = plan.name === "Standard";

              const ctaText = isStandard ? standardCta.label : plan.cta;
              const noteText = isStandard ? standardCta.note : plan.note;

              return (
                <div
                  key={plan.name}
                  className={`relative flex flex-col p-7 rounded-xl transition-all duration-300 ${
                    plan.highlighted ? "bg-primary-foreground/[0.04]" : ""
                  } ${
                    index === 0
                      ? "md:border-r md:border-primary-foreground/[0.06]"
                      : ""
                  }`}
                >
                  {/* Reserved badge space - identical height for both cards */}
                  <div className="h-7 mb-3">
                    {plan.badge && (
                      <span className="inline-block px-3 py-1 text-[11px] font-medium text-primary bg-primary/10 rounded-full border border-primary/20">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  {/* Plan name - larger and bolder */}
                  <h3 className="text-2xl font-bold text-primary-foreground mb-4 tracking-tight">
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <p className="text-4xl font-semibold text-primary-foreground mb-1.5">
                    {plan.price}
                    <span className="text-sm font-normal text-primary-foreground/40 ml-1.5">
                      / month
                    </span>
                  </p>

                  {/* Description - fixed height */}
                  <p className="text-sm text-primary-foreground/50 h-10 mb-6">
                    {plan.description}
                  </p>

                  {/* Features - fixed height container */}
                  <div className="flex-1 mb-6" style={{ minHeight: "156px" }}>
                    <div className="space-y-2.5">
                      {plan.features.map((feature, i) => (
                        <p
                          key={i}
                          className="text-sm text-primary-foreground/55 h-5"
                        >
                          {feature}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* CTA - aligned at bottom with equal sizing */}
                  <div>
                    {plan.ctaLink ? (
                      <Link to={plan.ctaLink} className="block">
                        <Button
                          size="lg"
                          className={`w-full h-12 text-sm font-medium rounded-full transition-all duration-300 ${
                            plan.highlighted
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "bg-primary-foreground/90 text-foreground hover:bg-primary-foreground"
                          }`}
                        >
                          {ctaText}
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="lg"
                        disabled={isStandard ? standardCta.disabled || isUpgrading : false}
                        onClick={
                          isStandard
                            ? () => {
                                if (mode === "trial_expired") {
                                  // trial закончился → апгрейд с выбранным tier
                                  handleUpgrade(plan.tier);
                                } else if (mode === "anonymous") {
                                  // гость → в триал-флоу с выбранным tier
                                  navigate(`/?trial=${plan.tier}`);
                                }
                                // trial_active или other → кнопка disabled
                              }
                            : undefined
                        }
                        className={`w-full h-12 text-sm font-medium rounded-full transition-all duration-300 ${
                          plan.highlighted
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-primary-foreground/90 text-foreground hover:bg-primary-foreground"
                        }`}
                      >
                        {isStandard && isUpgrading ? "Upgrading..." : ctaText}
                      </Button>
                    )}
                    {/* Note space - fixed height */}
                    <div className="h-5 mt-2.5">
                      {noteText && (
                        <p className="text-[11px] text-primary-foreground/40 text-center">
                          {noteText}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingPlansSection;
