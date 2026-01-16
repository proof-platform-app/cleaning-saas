import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      navigate("/dashboard");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-soft">
              <span className="text-primary-foreground font-bold text-lg">SC</span>
            </div>
            <span className="font-semibold text-xl text-foreground tracking-tight">SparkClean</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-muted-foreground">
              Sign in to manage your cleaning operations
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
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
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
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
              <span className="text-primary-foreground font-bold text-xl">SC</span>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Proof of work you can trust
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            GPS verification, timestamped photos, and detailed checklists. 
            Every job documented, every report client-ready.
          </p>
        </div>
      </div>
    </div>
  );
}
