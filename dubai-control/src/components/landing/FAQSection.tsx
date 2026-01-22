import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    question: "What exactly does CleanProof do?",
    answer: "CleanProof captures proof that cleaning work was completed. It records when cleaners check in and out (GPS verified), what photos were taken, and which tasks were completed. At the end, it generates a professional PDF report you can share with clients.",
  },
  {
    question: "Is this a replacement for my current tools?",
    answer: "No. CleanProof is not a scheduling tool, CRM, or task manager. It works alongside your existing systems. You keep managing jobs your way — CleanProof simply adds a proof layer on top.",
  },
  {
    question: "Do cleaners need training?",
    answer: "Minimal. If your cleaners can use a phone camera, they can use CleanProof. The app shows only today's jobs and guides them step-by-step through check-in, photos, checklist, and check-out.",
  },
  {
    question: "What happens if a step is skipped?",
    answer: "Steps cannot be skipped. Cleaners must complete each required step in order. If something is missed, the job cannot be marked as complete. This ensures consistent, reliable proof every time.",
  },
  {
    question: "How reliable is GPS verification?",
    answer: "Very reliable. Check-in and check-out only work when the cleaner is physically near the job location. GPS coordinates are recorded and included in the final report. Faking location is not possible.",
  },
  {
    question: "Can I share reports with clients?",
    answer: "Yes. Each completed job generates a professional PDF report. You can download it, email it, or share a link. Clients don't need to log in — they simply receive the proof.",
  },
  {
    question: "Is this suitable for UAE regulations?",
    answer: "Yes. CleanProof is built for UAE-based cleaning operations. It supports local time zones, works offline when needed, and generates documentation that meets professional standards for service verification.",
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
        className="w-full text-left py-8 flex items-start justify-between gap-8 focus:outline-none"
      >
        <span className="text-xl md:text-2xl font-medium text-foreground group-hover:text-primary transition-colors duration-300">
          {faq.question}
        </span>
        <span className="flex-shrink-0 mt-1">
          {isOpen ? (
            <Minus className="w-5 h-5 text-primary" />
          ) : (
            <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
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
            <p className="pb-8 text-lg text-muted-foreground leading-relaxed max-w-3xl">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="h-px bg-border/50" />
    </motion.div>
  );
};

const FAQSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section ref={ref} className="relative py-32 md:py-48 px-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-16 md:mb-24"
        >
          <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] mb-6">
            FAQ
          </p>
          <h2 className="text-display text-foreground">
            Common questions
          </h2>
        </motion.div>
        
        {isInView && (
          <div className="divide-y-0">
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

export default FAQSection;
