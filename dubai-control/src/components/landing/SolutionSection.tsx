import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { MapPin, Camera, CheckSquare, LogOut, FileText } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MapPin,
    title: "Check in on site",
    description: "GPS verified location",
  },
  {
    number: "02",
    icon: Camera,
    title: "Before & after photos",
    description: "Timestamped visual evidence",
  },
  {
    number: "03",
    icon: CheckSquare,
    title: "Complete checklist",
    description: "Every task accounted for",
  },
  {
    number: "04",
    icon: LogOut,
    title: "Check out",
    description: "Time and location recorded",
  },
  {
    number: "05",
    icon: FileText,
    title: "Verified PDF report generated",
    description: "One file. Complete proof.",
  },
];

const SolutionSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-32 md:py-48 px-6 bg-muted/50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20 md:mb-28"
        >
          <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] mb-6">
            How it works
          </p>
          <h2 className="text-display text-foreground">
            CleanProof turns every job
            <br className="hidden md:block" />
            <span className="text-primary"> into verified proof.</span>
          </h2>
        </motion.div>
        
        {/* Steps - Horizontal on desktop, vertical on mobile */}
        <div className="relative">
          {/* Connection line - desktop */}
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-px bg-border" />
          
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ 
                    duration: 0.6, 
                    delay: 0.2 + index * 0.1,
                    ease: [0.25, 0.1, 0.25, 1]
                  }}
                  className="relative text-center"
                >
                  {/* Step circle */}
                  <div className="relative z-10 mx-auto w-24 h-24 rounded-full bg-background border-2 border-border flex items-center justify-center mb-6 shadow-soft">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  
                  {/* Step number */}
                  <span className="text-xs font-medium text-primary/60 tracking-wider mb-2 block">
                    STEP {step.number}
                  </span>
                  
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
