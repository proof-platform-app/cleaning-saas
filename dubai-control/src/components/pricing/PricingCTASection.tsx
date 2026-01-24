// dubai-control/src/components/pricing/PricingCTASection.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";

const PricingCTASection: React.FC = () => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="py-16 md:py-24 px-6 bg-foreground border-t border-white/5"
    >
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-2xl md:text-3xl font-semibold text-primary-foreground mb-4">
            Questions? Let&apos;s talk.
          </h2>
          <p className="text-sm md:text-base text-primary-foreground/60 mb-8">
            We&apos;ll walk you through how CleanProof fits into your existing
            operations, pricing, and rollout.
          </p>

          {/* CTA – тоже белая «пилюля», чтобы совпадать со стилем лендинга */}
          <Link to="/cleanproof/demo">
            <Button
              size="lg"
              className="h-12 px-8 text-sm font-medium rounded-full bg-white text-slate-900 hover:bg-slate-100 shadow-md transition-colors"
            >
              Request demo
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingCTASection;
