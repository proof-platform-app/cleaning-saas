// dubai-control/src/components/pricing/PricingFAQSelection.tsx

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    question: "What happens if I exceed my cleaner limit?",
    answer: "You cannot add more cleaners than your plan allows. If your team grows beyond the limit, you can upgrade at any time. There are no overage charges — you simply upgrade before adding more cleaners.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes. You can upgrade or downgrade at any time. Changes take effect immediately. If you downgrade, you'll need to reduce your active cleaners to fit within the new plan's limits.",
  },
  {
    question: "Is there a contract?",
    answer: "No long-term contracts. All plans are month-to-month. You can cancel at any time. If you cancel, your account remains active until the end of your billing period.",
  },
];

const FAQItem = ({ faq, index, isOpen, onToggle }: { 
  faq: typeof faqs[0]; 
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      className="group"
    >
      <button
        onClick={onToggle}
        className="w-full text-left py-6 flex items-start justify-between gap-6 focus:outline-none"
      >
        <span className="text-base font-medium text-foreground/80 group-hover:text-foreground transition-colors duration-300">
          {faq.question}
        </span>
        <span className="flex-shrink-0 mt-0.5">
          {isOpen ? (
            <Minus className="w-4 h-4 text-primary" />
          ) : (
            <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
          )}
        </span>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="h-px bg-border/40" />
    </motion.div>
  );
};

const PricingFAQSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section ref={ref} className="relative py-20 md:py-24 px-6 bg-background">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-12 md:mb-16"
        >
          <p className="text-primary text-xs uppercase tracking-[0.2em] mb-4">
            FAQ
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
            Common questions
          </h2>
        </motion.div>
        
        {isInView && (
          <div>
            {faqs.map((faq, index) => (
              <FAQItem 
                key={index} 
                faq={faq} 
                index={index}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingFAQSection;