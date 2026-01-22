import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const TransitionSection3 = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section 
      ref={ref} 
      className="relative min-h-[70vh] flex items-center justify-center px-6 bg-foreground"
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
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight">
            <span className="text-white">If it's not </span>
            <span className="text-primary">proven</span>
            <span className="text-white"> —</span>
            <br />
            <span className="text-white">it didn't happen.</span>
          </h2>
        </motion.div>
      </div>
    </section>
  );
};

export default TransitionSection3;
