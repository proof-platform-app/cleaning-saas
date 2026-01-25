// dubai-control/src/marketing/cleanproof/CleanProofLanding.tsx
import CleanProofHeader from "./CleanProofHeader";

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
      {/* Единый маркетинговый хедер поверх тёмного hero */}
      <CleanProofHeader variant="onDark" />

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

          {/* Навигация в футере */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a
              href="/cleanproof"
              className="text-primary-foreground/40 hover:text-primary-foreground transition-colors"
            >
              Home
            </a>
            <a
              href="/cleanproof/pricing"
              className="text-primary-foreground/40 hover:text-primary-foreground transition-colors"
            >
              Pricing
            </a>
            <a
              href="/cleanproof/updates"
              className="text-primary-foreground/40 hover:text-primary-foreground transition-colors"
            >
              Product updates
            </a>
            <a
              href="/cleanproof/contact"
              className="text-primary-foreground/40 hover:text-primary-foreground transition-colors"
            >
              Contact
            </a>
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
}
