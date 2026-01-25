// dubai-control/src/marketing/cleanproof/CleanProofContact.tsx
import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import CleanProofHeader from "./CleanProofHeader";

const CleanProofContact = () => {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.message.trim()) newErrors.message = "Message is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitted(true);
      // здесь позже добавим реальную отправку на backend
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Общий хедер в светлой версии */}
      <CleanProofHeader variant="onLight" />

      {/* Hero */}
      <section className="relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-primary/[0.06] to-background pt-24 pb-10">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                             linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative z-10 max-w-xl mx-auto px-6 text-center"
        >
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight mb-3">
            Have a question about{" "}
            <span className="text-primary">CleanProof?</span>
          </h1>
          <p className="text-base text-muted-foreground">
            We'll get back to you.
          </p>
        </motion.div>
      </section>

      {/* Form Section */}
      <section className="relative px-6 py-16 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-lg mx-auto"
        >
          {!isSubmitted ? (
            <>
              <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-8 md:p-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium text-foreground"
                    >
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      className={`h-11 ${
                        errors.name ? "border-destructive" : ""
                      }`}
                      placeholder="Your name"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>

                  {/* Company */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="company"
                      className="text-sm font-medium text-foreground"
                    >
                      Company
                    </Label>
                    <Input
                      id="company"
                      type="text"
                      value={formData.company}
                      onChange={(e) =>
                        handleInputChange("company", e.target.value)
                      }
                      className="h-11"
                      placeholder="Your company (optional)"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-foreground"
                    >
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      className={`h-11 ${
                        errors.email ? "border-destructive" : ""
                      }`}
                      placeholder="you@company.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="message"
                      className="text-sm font-medium text-foreground"
                    >
                      Message <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) =>
                        handleInputChange("message", e.target.value)
                      }
                      className={`min-h-[140px] resize-none ${
                        errors.message ? "border-destructive" : ""
                      }`}
                      placeholder="How can we help?"
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full md:w-auto h-11 px-8 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
                  >
                    Send message
                  </Button>
                </form>

                {/* Helper text */}
                <div className="mt-6 pt-6 border-t border-border/40 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    For product demos, use{" "}
                    <Link
                      to="/cleanproof/demo"
                      className="text-primary hover:underline"
                    >
                      Request demo
                    </Link>
                    .
                  </p>
                  <p className="text-sm text-muted-foreground">
                    For support — describe your case here.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-card border border-border/50 rounded-2xl shadow-sm p-10 text-center"
            >
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Message sent
              </h2>
              <p className="text-muted-foreground mb-6">
                We'll get back to you soon.
              </p>
              <Link to="/cleanproof">
                <Button variant="outline" className="h-10 rounded-full">
                  Back to home
                </Button>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </section>

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
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Product updates
            </Link>
            <Link
              to="/cleanproof/contact"
              className="text-sm text-foreground font-medium"
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

export default CleanProofContact;
