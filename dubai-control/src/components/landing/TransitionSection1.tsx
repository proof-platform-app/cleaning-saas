import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const TransitionSection1 = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section 
      ref={ref} 
      className="relative min-h-[60vh] flex items-center justify-center px-6 bg-foreground"
    >
      {/* Subtle grid background */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary-foreground)) 1px, transparent 0)`,
          backgroundSize: '48px 48px'
        }}
      />
      
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white mb-6">
            Without proof, cleaning is just a <span className="text-primary">promise.</span>
          </h2>
          <p className="text-slate-400 text-lg">
            CleanProof turns promises into facts.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default TransitionSection1;
