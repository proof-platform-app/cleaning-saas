// dubai-control/src/pages/Signup.tsx

import { FormEvent, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const trialParam = searchParams.get("trial");
  const isTrialFlow = trialParam === "standard";

  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    companyName.trim().length > 0 &&
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    password === passwordConfirm &&
    !isLoading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedCompany = companyName.trim();
    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedCompany || !trimmedFullName || !trimmedEmail) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/signup/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_name: trimmedCompany,
          full_name: trimmedFullName,
          email: trimmedEmail,
          password,
        }),
      });

      if (!res.ok) {
        let message = "Failed to create account. Please try again.";
        try {
          const data = (await res.json()) as any;
          if (typeof data?.detail === "string") {
            message = data.detail;
          } else if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore JSON parse error
        }
        setError(message);
        return;
      }

      // Успешный signup:
      // если это trial-флоу — отправляем на login с ?trial=standard
      // иначе — просто на login
      const nextUrl = isTrialFlow ? "/?trial=standard" : "/";
      navigate(nextUrl, {
        replace: true,
        state: { email: trimmedEmail },
      });
    } catch (err: any) {
      console.error("[Signup] request failed", err);
      setError(err?.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoToLogin = () => {
    const url = isTrialFlow ? "/?trial=standard" : "/";
    navigate(url);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-6 py-8 bg-card rounded-xl shadow-sm border border-border">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Create your CleanProof account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isTrialFlow
              ? "Sign up to start your 7-day Standard trial."
              : "Create an account to start using CleanProof."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="company_name">
              Company name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company_name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Sparkle Clean Services"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="full_name">
              Your name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., Aisha Khan"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">
              Work email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password_confirm">
              Confirm password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password_confirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            disabled={!canSubmit}
          >
            {isLoading
              ? "Creating account…"
              : isTrialFlow
                ? "Create account & start trial"
                : "Create account"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground text-center">
          Already have an account?{" "}
          <button
            type="button"
            onClick={handleGoToLogin}
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
