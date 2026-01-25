// dubai-control/src/pages/Login.tsx
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Базовый URL для API — тот же, что и для всего проекта
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("manager@test.com");
  const [password, setPassword] = useState("Test1234!");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Если пришли с /?trial=standard — показываем текст про trial
  const isTrialFlow = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("trial") === "standard";
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const detail =
          (data && typeof data.detail === "string" && data.detail) ||
          "Unable to sign in. Please check your credentials.";
        throw new Error(detail);
      }

      // Ожидаемый формат ответа:
      // {
      //   "token": "...",
      //   "user_id": 2,
      //   "email": "manager@test.com",
      //   "full_name": "Dev Manager",
      //   "role": "manager"
      // }

      // Сохраняем токен и базовую инфу
      if (data?.token) {
        localStorage.setItem("authToken", data.token);
      }
      if (data?.role) {
        localStorage.setItem("authUserRole", data.role);
      }
      if (data?.email) {
        localStorage.setItem("authUserEmail", data.email);
      }

      // Помечаем, что зашли через trial-флоу — пригодится для баннера
      if (isTrialFlow) {
        localStorage.setItem("cleanproof_trial_entry", "standard");
      }

      navigate("/dashboard");
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to sign in. Please check your credentials."
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
              Welcome back
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              {isTrialFlow
                ? "Sign in to start your 7-day free trial"
                : "Sign in to manage your cleaning operations"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email address
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
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-soft"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Trusted by cleaning professionals across the UAE
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
            Proof of work you can trust
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            GPS verification, timestamped photos, and detailed
            checklists. Every job documented, every report
            client-ready.
          </p>
        </div>
      </div>
    </div>
  );
}
