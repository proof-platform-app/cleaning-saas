// dubai-control/src/pages/PricingPage.tsx
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

import PricingHeroSection from "@/components/pricing/PricingHeroSection";
import PricingPlansSection from "@/components/pricing/PricingPlansSection";
import PricingTrialSection from "@/components/pricing/PricingTrialSection";
import PricingFAQSection from "@/components/pricing/PricingFAQSection";
import PricingCTASection from "@/components/pricing/PricingCTASection";

import CleanProofHeader from "@/marketing/cleanproof/CleanProofHeader";

const PricingPage = () => {
  const navigate = useNavigate();

  /**
   * Start 7-day trial flow (Standard plan)
   *
   * Правило:
   * — триал стартует только через Pricing → Login
   * — здесь мы просто добавляем query-параметр ?trial=standard
   * — дальше login-страница, увидев этот параметр, дергает
   *   POST /api/cleanproof/trials/start/ после успешного входа.
   */
  const handleStartStandardTrial = () => {
    navigate("/?trial=standard");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header в едином стиле с другими маркетинговыми страницами */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/40"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Логотип / переход на лендинг */}
          <Link
            to="/cleanproof"
            className="text-lg font-semibold text-foreground"
          >
            CleanProof
          </Link>

          {/* Навигация по маркетинговым страницам */}
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <Link
              to="/cleanproof/pricing"
              className="text-foreground font-medium"
            >
              Pricing
            </Link>
            <Link
              to="/cleanproof/updates"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Product updates
            </Link>
            <Link
              to="/cleanproof/contact"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Sign in справа */}
          <Link to="/">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground hover:bg-transparent"
            >
              Sign in
            </Button>
          </Link>
        </div>
      </motion.header>

      {/* Основные секции страницы */}
      <main className="overflow-hidden">
        <PricingHeroSection />
        <PricingPlansSection />
        {/* Здесь триал секция получает хендлер для кнопки */}
        <PricingTrialSection onStartStandardTrial={handleStartStandardTrial} />
        <PricingFAQSection />
        <PricingCTASection />
      </main>

      {/* Футер с навигацией, видимой и для гостей, и для пользователей */}
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
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link
              to="/cleanproof"
              className="text-primary-foreground/40 hover:text-primary-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              to="/cleanproof/pricing"
              className="text-primary-foreground hover:text-primary-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/cleanproof/updates"
              className="text-primary-foreground/40 hover:text-primary-foreground transition-colors"
            >
              Product updates
            </Link>
            <Link
              to="/cleanproof/contact"
              className="text-primary-foreground/40 hover:text-primary-foreground transition-colors"
            >
              Contact
            </Link>
            <a
              href="#"
              className="text-primary-foreground/40 hover:text-primary-foreground transition-colors"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-primary-foreground/40 hover:text-primary-foreground transition-colors"
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
