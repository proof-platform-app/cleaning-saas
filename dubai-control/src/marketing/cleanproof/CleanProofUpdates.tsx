// dubai-control/src/marketing/cleanproof/CleanProofUpdates.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import CleanProofHeader from "./CleanProofHeader";

interface Update {
  id: string;
  date: string;
  title: string;
  summary: string;
  fullDescription: string[];
  hasImage?: boolean;
}

const updates: Update[] = [
  {
    id: "1",
    date: "Jan 18, 2026",
    title: "Trial limits added for Standard plan",
    summary:
      "Cleaner limits, job caps, and proof enforcement are now active during trial.",
    fullDescription: [
      "Trial accounts on the Standard plan now include realistic operational limits to help you evaluate CleanProof under real conditions.",
      "During the 7-day trial, you can add up to 2 cleaners and create up to 10 jobs. The full proof flow — including GPS validation, photo capture, and timestamping — is fully enabled.",
      "These limits help ensure a focused evaluation experience while giving you access to all core features.",
    ],
    hasImage: true,
  },
  {
    id: "2",
    date: "Jan 12, 2026",
    title: "GPS validation accuracy improvements",
    summary:
      "Location verification now uses refined geofencing for more reliable proof of presence.",
    fullDescription: [
      "We've updated the GPS validation engine to provide more accurate location verification for job sites.",
      "The new geofencing algorithm accounts for building layouts, multi-floor structures, and areas with limited GPS signal. This reduces false negatives in dense urban environments like Dubai Marina and Downtown.",
      "Validation tolerance is now configurable per location, allowing you to adjust sensitivity based on site requirements.",
    ],
  },
  {
    id: "3",
    date: "Jan 5, 2026",
    title: "PDF report formatting updates",
    summary:
      "Exported proof reports now include cleaner timestamps and improved photo layouts.",
    fullDescription: [
      "PDF exports have been redesigned for better readability and professional presentation.",
      "Key improvements include:",
      "• Larger, higher-resolution proof photos with proper aspect ratios",
      "• Cleaner timestamp formatting with timezone indicators",
      "• Location details now include map thumbnails when GPS data is available",
      "• Report headers include your company branding and contact information",
    ],
    hasImage: true,
  },
];

const UpdateCard = ({ update }: { update: Update }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      className="bg-card border border-border/40 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-elevated cursor-pointer"
      whileHover={{ scale: 1.01 }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground/70 mb-2">
              {update.date}
            </p>
            <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">
              {update.title}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {update.summary}
            </p>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1 flex-shrink-0"
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground/60" />
          </motion.div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-6 mt-6 border-t border-border/40">
                <p className="text-xs text-muted-foreground/50 mb-4 uppercase tracking-wide">
                  {update.date}
                </p>
                <div className="space-y-4">
                  {update.fullDescription.map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-muted-foreground leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>

                {update.hasImage && (
                  <div className="mt-6 rounded-lg bg-muted/20 border border-border/30 aspect-video flex items-center justify-center">
                    <p className="text-sm text-muted-foreground/40">
                      Image placeholder
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const ProductUpdatesPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Общий хедер в светлой версии */}
      <CleanProofHeader variant="onLight" />

      <main>
        {/* Hero Section */}
        <section className="relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-primary/[0.06] to-background pt-24 pb-12">
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                               linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
              backgroundSize: "80px 80px",
            }}
          />

          {/* Bottom edge divider */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-border/30" />

          <div className="relative z-10 max-w-xl mx-auto px-6 text-center">
            <p className="text-primary text-sm uppercase tracking-[0.25em] mb-6">
              Product Updates
            </p>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.15] tracking-tight text-foreground mb-5">
              Product updates
            </h1>

            <p className="text-muted-foreground text-base max-w-md mx-auto">
              What's new in <span className="text-primary">CleanProof</span>.
            </p>
          </div>
        </section>

        {/* Updates List */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="space-y-5">
              {updates.map((update) => (
                <UpdateCard key={update.id} update={update} />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <span className="text-foreground font-semibold">CleanProof</span>
            <p className="text-sm text-muted-foreground">
              Built for UAE cleaning operations.
            </p>
          </div>
          <div className="flex items-center gap-8">
            <Link
              to="/cleanproof"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              to="/cleanproof/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/cleanproof/updates"
              className="text-sm text-foreground font-medium"
            >
              Product updates
            </Link>
            <Link
              to="/cleanproof/contact"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
            <a
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProductUpdatesPage;
