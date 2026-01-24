import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const PricingTrialSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative py-16 md:py-20 px-6 bg-foreground"
    >
      {/* Верхний разделитель */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-primary-foreground/10" />

      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h3 className="text-2xl md:text-3xl font-semibold text-primary-foreground mb-10">
            7 days. Full access. No card.
          </h3>

          {/* Лимиты, как три равнозначных пункта с разделителями */}
          <div className="flex items-center justify-center gap-0">
            <span className="text-base text-primary-foreground/60 font-medium px-5">
              2 cleaners
            </span>
            <span className="w-px h-4 bg-primary-foreground/20" />
            <span className="text-base text-primary-foreground/60 font-medium px-5">
              10 jobs
            </span>
            <span className="w-px h-4 bg-primary-foreground/20" />
            <span className="text-base text-primary-foreground/60 font-medium px-5">
              Full proof flow
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingTrialSection;
