// dubai-control/src/pages/PricingPage.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import PricingHeroSection from "@/components/pricing/PricingHeroSection";
import PricingPlansSection from "@/components/pricing/PricingPlansSection";
import PricingTrialSection from "@/components/pricing/PricingTrialSection";
import PricingFAQSection from "@/components/pricing/PricingFAQSection";
import PricingCTASection from "@/components/pricing/PricingCTASection";
import { Button } from "@/components/ui/button";

const PricingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header такой же, как на лендинге */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 bg-transparent"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/cleanproof" className="text-lg font-semibold text-foreground">
            CleanProof
          </Link>

          <div className="flex items-center gap-3">
            {/* FIX: Sign in ведёт на / (Login), а не на /login */}
            <Link to="/">
              <Button
                variant="ghost"
                className="text-foreground/70 hover:text-foreground hover:bg-foreground/5"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Контент страницы */}
      <main className="overflow-hidden">
        <PricingHeroSection />
        <PricingPlansSection />
        <PricingTrialSection />
        <PricingFAQSection />
        <PricingCTASection />
      </main>

      {/* Футер как на лендинге */}
      <footer className="py-16 px-6 bg-foreground border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <span className="text-primary-foreground font-semibold">
              CleanProof
            </span>
            <p className="text-sm text-primary-foreground/40">
              Built for UAE cleaning operations.
            </p>
          </div>
          <div className="flex items-center gap-8">
            <Link
              to="/cleanproof"
              className="text-sm text-primary-foreground/40 hover:text-primary-foreground transition-colors"
            >
              Home
            </Link>
            <a
              href="#"
              className="text-sm text-primary-foreground/40 hover:text-primary-foreground transition-colors"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-sm text-primary-foreground/40 hover:text-primary-foreground transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;
