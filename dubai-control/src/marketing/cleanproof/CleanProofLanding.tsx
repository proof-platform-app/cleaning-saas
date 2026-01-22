// dubai-control/src/marketing/cleanproof/CleanProofLanding.tsx
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import SolutionSection from "@/components/landing/SolutionSection";
import ScrollShowcaseSection from "@/components/landing/ScrollShowcaseSection";
import FAQSection from "@/components/landing/FAQSection";
import CTASection from "@/components/landing/CTASection";
import TransitionSection1 from "@/components/landing/TransitionSection1";
import TransitionSection3 from "@/components/landing/TransitionSection3";

export default function CleanProofLanding() {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header over dark hero */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 bg-transparent"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link
            to="/cleanproof"
            className="text-lg font-semibold text-primary-foreground"
          >
            CleanProof
          </Link>

          <div className="flex items-center gap-3">
            {/* Login ведём на текущий логин-скрин приложения */}
            <Link to="/">
              <Button
                variant="ghost"
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                Sign in
              </Button>
            </Link>

            {/* Переход на страницу заявки на демо */}
            <Link to="/cleanproof/demo">
              <Button size="sm" className="bg-primary text-primary-foreground">
                Request demo
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Структура лендинга */}
      <main className="overflow-hidden">
        <HeroSection />
        <ProblemSection />
        <TransitionSection1 />
        <SolutionSection />
        <ScrollShowcaseSection />
        <FAQSection />
        <TransitionSection3 />
        <CTASection />
      </main>

      {/* Минималистичный футер */}
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
}
