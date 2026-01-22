// dubai-control/src/marketing/cleanproof/CleanProofDemoRequest.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CleanProofDemoRequest = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    role: "",
    cleanerCount: "",
    contact: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isFormValid =
    formData.companyName &&
    formData.role &&
    formData.cleanerCount &&
    formData.contact;

  return (
    <div className="min-h-screen bg-[hsl(210,20%,98%)]">
      {/* Header */}
      <header className="px-6 py-6 border-b border-gray-100">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/cleanproof"
            className="text-lg font-semibold text-gray-900"
          >
            CleanProof
          </Link>
        </div>
      </header>

      {/* Hero Section - Dark */}
      <section className="relative bg-foreground px-6 py-20 md:py-28 overflow-hidden">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 gradient-glow opacity-50" />

        {/* Grid overlay - matching landing hero */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px),
                             linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)`,
            backgroundSize: "100px 100px",
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-8"
          >
            <span className="text-primary-foreground">If it&apos;s not proven</span>
            <br />
            <span className="text-primary">it didn&apos;t happen.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl md:text-2xl text-primary-foreground/90 font-medium mb-4"
          >
            See how CleanProof works in a real cleaning job.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-lg text-primary-foreground/50"
          >
            From job creation to a verified PDF report — every step recorded,
            nothing skipped.
          </motion.p>
        </div>
      </section>

      {/* Main Content */}
      <main className="px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {/* What this demo shows - White card */}
                <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 mb-8">
                  <h2 className="text-lg font-medium text-gray-900 mb-5">
                    What this demo shows
                  </h2>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 mr-3 flex-shrink-0" />
                      Job planning by the manager
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 mr-3 flex-shrink-0" />
                      On-site check-in by cleaners
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 mr-3 flex-shrink-0" />
                      Photos and checklist captured as proof
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 mr-3 flex-shrink-0" />
                      Final verified PDF report
                    </li>
                  </ul>
                </div>

                {/* Expectation alignment - Light blue-gray background */}
                <div className="bg-[hsl(210,25%,95%)] rounded-xl p-8 mb-8">
                  <div className="space-y-4 text-gray-600 leading-relaxed">
                    <p className="text-gray-800">
                      CleanProof is built to prove work — not to manage tasks or
                      promises.
                    </p>
                    <p>The workflow is fixed. Every step is required.</p>
                    <p>The demo shows the real process used by cleaning teams.</p>
                    <p className="text-gray-500 pt-2">
                      If you need a highly customizable system, CleanProof may
                      not be the right fit for your workflow.
                    </p>
                  </div>
                </div>

                {/* Transition Section - Dark */}
                <div className="relative bg-foreground -mx-6 px-6 py-12 mb-8 text-center overflow-hidden">
                  {/* Subtle glow effect */}
                  <div className="absolute inset-0 gradient-glow opacity-50" />

                  {/* Grid overlay - matching hero */}
                  <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                      backgroundImage: `linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px),
                                       linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)`,
                      backgroundSize: "100px 100px",
                    }}
                  />

                  <p className="relative z-10 text-xl md:text-2xl font-medium text-primary-foreground/90">
                    This is what verified work looks like.
                  </p>
                </div>

                {/* Form - White card */}
                <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label
                          htmlFor="companyName"
                          className="text-gray-700 text-sm font-medium"
                        >
                          Company name
                        </Label>
                        <Input
                          id="companyName"
                          type="text"
                          value={formData.companyName}
                          onChange={(e) =>
                            handleInputChange("companyName", e.target.value)
                          }
                          className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-primary/20 h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="role"
                          className="text-gray-700 text-sm font-medium"
                        >
                          Your role
                        </Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value) =>
                            handleInputChange("role", value)
                          }
                        >
                          <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 h-11 focus:ring-primary/20 focus:border-primary">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            <SelectItem
                              value="owner"
                              className="text-gray-900 focus:bg-gray-100"
                            >
                              Owner
                            </SelectItem>
                            <SelectItem
                              value="operations-manager"
                              className="text-gray-900 focus:bg-gray-100"
                            >
                              Operations Manager
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="cleanerCount"
                          className="text-gray-700 text-sm font-medium"
                        >
                          Number of cleaners
                        </Label>
                        <Select
                          value={formData.cleanerCount}
                          onValueChange={(value) =>
                            handleInputChange("cleanerCount", value)
                          }
                        >
                          <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 h-11 focus:ring-primary/20 focus:border-primary">
                            <SelectValue placeholder="Select team size" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            <SelectItem
                              value="1-5"
                              className="text-gray-900 focus:bg-gray-100"
                            >
                              1–5
                            </SelectItem>
                            <SelectItem
                              value="6-20"
                              className="text-gray-900 focus:bg-gray-100"
                            >
                              6–20
                            </SelectItem>
                            <SelectItem
                              value="21-50"
                              className="text-gray-900 focus:bg-gray-100"
                            >
                              21–50
                            </SelectItem>
                            <SelectItem
                              value="50+"
                              className="text-gray-900 focus:bg-gray-100"
                            >
                              50+
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="contact"
                          className="text-gray-700 text-sm font-medium"
                        >
                          WhatsApp or email
                        </Label>
                        <Input
                          id="contact"
                          type="text"
                          value={formData.contact}
                          onChange={(e) =>
                            handleInputChange("contact", e.target.value)
                          }
                          className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-primary/20 h-11"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={!isFormValid}
                        className="w-full h-12 bg-primary text-white hover:bg-primary/90 font-medium text-base rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Request demo
                      </Button>
                      <p className="text-center text-sm text-gray-400 mt-4">
                        This is a demo request. No account will be created.
                      </p>
                    </div>
                  </form>
                </div>

                {/* Back link */}
                <div className="text-center mt-6">
                  <Link
                    to="/cleanproof"
                    className="inline-flex items-center text-sm text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    ← Back to CleanProof overview
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center pt-16"
              >
                <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-6 tracking-tight">
                  Thanks.
                </h1>
                <div className="space-y-3 text-gray-600 text-lg">
                  <p>
                    We&apos;ll review your request and contact you within one
                    business day.
                  </p>
                  <p className="text-gray-400">
                    The demo is conducted live and shows the real product
                    workflow.
                  </p>
                </div>

                <div className="mt-8">
                  <Link to="/cleanproof">
                    <Button variant="outline" className="px-6">
                      Back to CleanProof
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gray-400 text-sm">
            CleanProof — Proof of work for cleaning teams
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CleanProofDemoRequest;
