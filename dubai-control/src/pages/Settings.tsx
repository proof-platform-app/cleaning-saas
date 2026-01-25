// dubai-control/src/pages/Settings.tsx

import { useState, useEffect, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { companySettings } from "@/data/sampleData";
import { Upload, MoreHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getUsageSummary, type UsageSummary } from "@/api/client";

interface Cleaner {
  id: string;
  name: string;
  phone: string;
  email?: string;
  isActive: boolean;
}

const initialCleaners: Cleaner[] = [
  { id: "1", name: "Aisha Khan", phone: "+971 50 123 4567", isActive: true },
  { id: "2", name: "Omar Al Mansoori", phone: "+971 55 234 5678", isActive: true },
  { id: "3", name: "Maria Santos", phone: "+971 52 345 6789", isActive: false },
];

export default function Settings() {
  const [settings, setSettings] = useState(companySettings);
  const [isLoading, setIsLoading] = useState(false);

  // --- ЛОГОТИП КОМПАНИИ (превью + файл) ---
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // локальный список клинеров (пока мок, позже заменим на API)
  const [cleaners, setCleaners] = useState<Cleaner[]>(initialCleaners);

  // trial / usage summary (для soft-limits)
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  const [isAddCleanerOpen, setIsAddCleanerOpen] = useState(false);
  const [newCleaner, setNewCleaner] = useState({
    name: "",
    email: "",
    phone: "",
    isActive: true,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadUsage() {
      try {
        const data = await getUsageSummary();
        if (!isMounted) return;
        setUsage(data);
      } catch (err) {
        if (!isMounted) return;
        console.warn("[Settings] Failed to load usage summary", err);
        setUsage(null);
      }
    }

    loadUsage();

    return () => {
      isMounted = false;
      // заодно подчистим урл, если он есть
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setIsLoading(true);

    // TODO: сюда потом добавим реальный аплоад логотипа:
    // if (logoFile) — отправить на backend вместе с остальными настройками

    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  const handleChange = (field: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ограничимся картинками
    if (!file.type.startsWith("image/")) {
      console.warn("Not an image");
      return;
    }

    setLogoFile(file);

    const url = URL.createObjectURL(file);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  const handleAddCleaner = () => {
    if (!newCleaner.name.trim()) return;

    const cleaner: Cleaner = {
      id: Date.now().toString(),
      name: newCleaner.name.trim(),
      phone: newCleaner.phone.trim(),
      email: newCleaner.email.trim() || undefined,
      isActive: newCleaner.isActive,
    };

    setCleaners((prev) => [...prev, cleaner]);
    setNewCleaner({ name: "", email: "", phone: "", isActive: true });
    setIsAddCleanerOpen(false);
  };

  const renderCleanersSoftLimitBanner = () => {
    if (!usage) return null;

    const isTrialPlan =
      usage.plan === "trial" || usage.is_trial_active === true;

    if (!isTrialPlan) return null;

    const closeToLimit =
      usage.cleaners_count >= usage.cleaners_soft_limit - 1 &&
      usage.cleaners_count < usage.cleaners_soft_limit;

    const atLimit = usage.cleaners_count >= usage.cleaners_soft_limit;

    if (!closeToLimit && !atLimit) return null;

    return (
      <div className="mb-6 flex items-start justify-between gap-4 rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm">
        <div>
          <p className="font-medium text-slate-900">
            {atLimit
              ? "You’ve reached the recommended cleaner limit for trial accounts."
              : "Trial accounts support a limited number of cleaners."}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            {atLimit
              ? "You can still continue — your existing data stays safe."
              : "Upgrade if you need to add more team members."}
          </p>
        </div>
        <Link
          to="/cleanproof/pricing"
          className="whitespace-nowrap text-xs font-medium text-blue-700 hover:text-blue-800"
        >
          Upgrade
        </Link>
      </div>
    );
  };

  const cleanersCountLabel =
    usage && typeof usage.cleaners_count === "number"
      ? `${usage.cleaners_count} cleaners`
      : `${cleaners.length} cleaners`;

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Company Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your company profile and preferences
        </p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Soft-limit banner для клинеров в trial */}
        {renderCleanersSoftLimitBanner()}

        {/* Company Info */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <h2 className="mb-6 font-semibold text-foreground">
            Company Information
          </h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Company Name
              </Label>
              <Input
                value={settings.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="h-11 bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Company Logo
              </Label>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Company logo preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                {/* скрытый input для выбора файла */}
                <input
                  id="company-logo-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={handleLogoChange}
                />

                <Button
                  variant="outline"
                  className="border-border"
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("company-logo-input")
                      ?.click()
                  }
                >
                  Upload Logo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                PNG or JPG, max 2MB. Appears on PDF reports.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <h2 className="mb-6 font-semibold text-foreground">
            Contact Information
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Contact Email
              </Label>
              <Input
                type="email"
                value={settings.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="h-11 bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Contact Phone
              </Label>
              <Input
                type="tel"
                value={settings.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="h-11 bg-background border-border"
              />
            </div>
          </div>
        </div>

        {/* Team / Cleaners */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Team / Cleaners</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your cleaners and see who is active today.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {cleanersCountLabel}
              </span>
              <Button size="sm" onClick={() => setIsAddCleanerOpen(true)}>
                Add cleaner
              </Button>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {cleaners.map((cleaner) => (
              <div
                key={cleaner.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-4"
              >
                <div>
                  <p className="font-medium text-foreground">{cleaner.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Cleaner · {cleaner.phone}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      cleaner.isActive
                        ? "bg-status-completed-bg text-status-completed"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {cleaner.isActive ? "Active" : "Inactive"}
                  </span>
                  <button className="rounded-md p-1.5 transition-colors hover:bg-muted">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Trial accounts support a limited number of cleaners. Upgrade if you
            need more.
          </p>
        </div>

        {/* Preferences */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <h2 className="mb-6 font-semibold text-foreground">Preferences</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-foreground">
                  Email Notifications
                </Label>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Receive email alerts for job issues and completions
                </p>
              </div>
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={(checked) =>
                  handleChange("notificationsEnabled", checked)
                }
              />
            </div>

            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-foreground">
                    Ramadan Mode
                  </Label>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Adjust scheduling defaults for Ramadan working hours
                  </p>
                </div>
                <Switch
                  checked={settings.ramadanMode}
                  onCheckedChange={(checked) =>
                    handleChange("ramadanMode", checked)
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4">
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-primary px-8 text-primary-foreground shadow-soft hover:bg-primary/90"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Add Cleaner Modal */}
      <Dialog open={isAddCleanerOpen} onOpenChange={setIsAddCleanerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add cleaner</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={newCleaner.name}
                onChange={(e) =>
                  setNewCleaner((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Aisha Khan"
                className="h-11 bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                type="email"
                value={newCleaner.email}
                onChange={(e) =>
                  setNewCleaner((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="e.g. aisha@example.com"
                className="h-11 bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                Optional. Used for future invites and notifications.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Phone
              </Label>
              <Input
                type="tel"
                value={newCleaner.phone}
                onChange={(e) =>
                  setNewCleaner((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="e.g. +971 50 123 4567"
                className="h-11 bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                Optional contact number for your internal reference.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-foreground">
                  Active
                </Label>
              </div>
              <Switch
                checked={newCleaner.isActive}
                onCheckedChange={(checked) =>
                  setNewCleaner((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsAddCleanerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCleaner}
              disabled={!newCleaner.name.trim()}
            >
              Save cleaner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
