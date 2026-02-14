// dubai-control/src/pages/Login.tsx

import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";

// Базовый URL для API — тот же, что и для всего проекта
const API_BASE_URL = "http://127.0.0.1:8000";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("manager@test.com");
  const [password, setPassword] = useState("Test1234!");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password change flow state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Если пришли с /?trial=<tier> — показываем текст про trial и сохраняем tier
  const trialTier = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tier = params.get("trial");
    // Accept standard, pro, enterprise
    if (tier === "standard" || tier === "pro" || tier === "enterprise") {
      return tier;
    }
    return null;
  }, [location.search]);

  const isTrialFlow = trialTier !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/manager/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Check for PASSWORD_CHANGE_REQUIRED error
        if (response.status === 403 && data?.code === "PASSWORD_CHANGE_REQUIRED") {
          setPasswordChangeData({
            currentPassword: password,
            newPassword: "",
            confirmPassword: "",
          });
          setShowPasswordChange(true);
          setIsLoading(false);
          return;
        }

        const detail =
          (data && typeof data.detail === "string" && data.detail) ||
          (data && typeof data.message === "string" && data.message) ||
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

      if (data?.token) {
        // новый ключ — используется новым кодом
        localStorage.setItem("authToken", data.token);
        // старый ключ — на всякий случай, для старого кода
        localStorage.setItem("auth_token", data.token);
      }
      if (data?.role) {
        localStorage.setItem("authUserRole", data.role);
      }
      if (data?.email) {
        localStorage.setItem("authUserEmail", data.email);
      }

      // Помечаем, что зашли через trial-флоу — пригодится для баннера
      if (isTrialFlow && trialTier) {
        localStorage.setItem("cleanproof_trial_entry", trialTier);
      }

      navigate("/dashboard");
    } catch (err: any) {
      setError(
        err?.message || "Unable to sign in. Please check your credentials.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);

    // Validation
    if (!passwordChangeData.newPassword) {
      setPasswordChangeError("New password is required");
      return;
    }

    if (passwordChangeData.newPassword.length < 8) {
      setPasswordChangeError("Password must be at least 8 characters");
      return;
    }

    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      setPasswordChangeError("Passwords do not match");
      return;
    }

    setIsChangingPassword(true);

    try {
      // Change password (using current temp password)
      const changeResponse = await fetch(`${API_BASE_URL}/api/me/change-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: passwordChangeData.currentPassword,
          new_password: passwordChangeData.newPassword,
        }),
      });

      const changeData = await changeResponse.json().catch(() => null);

      if (!changeResponse.ok) {
        const message =
          changeData?.message ||
          changeData?.detail ||
          "Failed to change password";
        throw new Error(message);
      }

      // Success! Now login with the new password
      const newLoginResponse = await fetch(`${API_BASE_URL}/api/manager/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: passwordChangeData.newPassword }),
      });

      const newLoginData = await newLoginResponse.json().catch(() => null);

      if (!newLoginResponse.ok) {
        throw new Error("Password changed but auto-login failed. Please log in manually.");
      }

      // Store auth data
      if (newLoginData?.token) {
        localStorage.setItem("authToken", newLoginData.token);
        localStorage.setItem("auth_token", newLoginData.token);
      }
      if (newLoginData?.role) {
        localStorage.setItem("authUserRole", newLoginData.role);
      }
      if (newLoginData?.email) {
        localStorage.setItem("authUserEmail", newLoginData.email);
      }

      // Navigate to dashboard
      navigate("/dashboard");
    } catch (err: any) {
      setPasswordChangeError(err?.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Password Change Modal
  if (showPasswordChange) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-soft">
              <span className="text-primary-foreground font-bold text-lg">SC</span>
            </div>
            <span className="font-semibold text-xl text-foreground tracking-tight">
              CleanProof
            </span>
          </div>

          {/* Card */}
          <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground">Password Change Required</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your access has been reset. Please set a new password to continue.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Current Password (readonly) */}
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-sm font-medium">
                  Current Password
                </Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordChangeData.currentPassword}
                  className="h-11 bg-muted border-border"
                  readOnly
                />
                <p className="text-xs text-muted-foreground">
                  This is your temporary password
                </p>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium">
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordChangeData.newPassword}
                  onChange={(e) =>
                    setPasswordChangeData({
                      ...passwordChangeData,
                      newPassword: e.target.value,
                    })
                  }
                  className="h-11 bg-background border-border focus:border-primary focus:ring-primary/20"
                  placeholder="Enter new password"
                  required
                  disabled={isChangingPassword}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 8 characters
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirm New Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordChangeData.confirmPassword}
                  onChange={(e) =>
                    setPasswordChangeData({
                      ...passwordChangeData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="h-11 bg-background border-border focus:border-primary focus:ring-primary/20"
                  placeholder="Confirm new password"
                  required
                  disabled={isChangingPassword}
                />
              </div>

              {passwordChangeError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {passwordChangeError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-soft"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing password...
                  </>
                ) : (
                  "Change password and sign in"
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Your new password will be used for future logins
          </p>
        </div>
      </div>
    );
  }

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

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-soft"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Sign up link (trial-aware) */}
          <p className="mt-4 text-sm text-muted-foreground text-center">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() =>
                navigate(isTrialFlow ? "/signup?trial=standard" : "/signup")
              }
              className="text-primary hover:underline font-medium"
            >
              Sign up
            </button>
          </p>

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
            GPS verification, timestamped photos, and detailed checklists. Every
            job documented, every report client-ready.
          </p>
        </div>
      </div>
    </div>
  );
}
