// dubai-control/src/pages/Signup.tsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Test1234!");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Если пришли с лендинга с trial-параметром — можем пометить источник
  const searchParams = new URLSearchParams(location.search);
  const trialSource = searchParams.get("trial") || "self_serve";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const detail =
          (data && typeof data.detail === "string" && data.detail) ||
          "Unable to sign up. Please check your details.";
        throw new Error(detail);
      }

      // Ожидаемый формат ответа:
      // {
      //   "token": "...",
      //   "user": {
      //     "id": 7,
      //     "email": "newmanager@test.com",
      //     "full_name": "Manager",
      //     "role": "manager"
      //   },
      //   "company": { ... },
      //   "trial": { ... }
      // }

      if (data?.token) {
        localStorage.setItem("authToken", data.token);
      }
      if (data?.user?.role) {
        localStorage.setItem("authUserRole", data.user.role);
      }
      if (data?.user?.email) {
        localStorage.setItem("authUserEmail", data.user.email);
      }

      // Помечаем, что зашли через self-serve signup
      localStorage.setItem("cleanproof_trial_entry", trialSource || "self_serve");

      navigate("/dashboard");
    } catch (err: any) {
      setError(
        err?.message || "Unable to sign up. Please check your details."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-soft">
              <span className="text-primary-foreground font-bold text-lg">
                SC
              </span>
            </div>
            <span className="font-semibold text-xl text-foreground tracking-tight">
              CleanProof
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Start your 7-day free trial
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Create your CleanProof account and get instant access to the
              manager dashboard.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Work email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.ae"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-background border-border focus:border-primary focus:ring-primary/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-background border-border focus:border-primary focus:ring-primary/20"
                required
              />
              <p className="text-xs text-muted-foreground">
                You can change this later in Settings.
              </p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-soft"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          {/* Link to login */}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </button>
          </p>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            No credit card required during trial.
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 gradient-blue items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">
                SC
              </span>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Every job becomes proof
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            GPS-verified check-ins, before/after photos, and completed
            checklists. One PDF report your clients can trust.
          </p>
        </div>
      </div>
    </div>
  );
}
