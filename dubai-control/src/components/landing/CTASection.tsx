import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-32 md:py-48 px-6 bg-foreground">
      <div className="absolute inset-0 gradient-glow opacity-30" />
      
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-8">
            <span className="text-white">See how CleanProof works</span>
            <br />
            <span className="text-primary">in real life.</span>
          </h2>
          
          <Button 
            size="lg" 
            className="h-14 px-12 text-base font-medium rounded-full bg-primary-foreground text-foreground hover:bg-primary-foreground/90 transition-all duration-300 mb-4"
          >
            Request demo
          </Button>
          
          <p className="text-slate-400 text-sm">
            No public signup. Demo only.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
