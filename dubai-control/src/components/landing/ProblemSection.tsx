import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const problems = [
  "Cleaners say the job is done — but there's no evidence",
  "Clients dispute work after completion",
  "WhatsApp photos are not proof",
  "Managers spend time explaining instead of managing",
];

const ProblemSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-32 md:py-48 px-6 bg-background overflow-hidden">
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-[0.02]" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-16 md:mb-24"
        >
          <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] mb-6">
            The problem
          </p>
          <h2 className="text-display text-foreground">
            Cleaning work is hard to prove.
          </h2>
        </motion.div>
        
        <div className="space-y-6 md:space-y-8">
          {problems.map((problem, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ 
                duration: 0.6, 
                delay: 0.3 + index * 0.15,
                ease: [0.25, 0.1, 0.25, 1]
              }}
              className="flex items-start gap-4"
            >
              <span className="w-2 h-2 rounded-full bg-primary/60 mt-3 flex-shrink-0" />
              <p className="text-xl md:text-2xl text-foreground/80 leading-relaxed">
                {problem}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
