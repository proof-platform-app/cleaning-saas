// dubai-control/src/pages/Settings.tsx

import { useState, useEffect, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getUsageSummary,
  type UsageSummary,
  getCompanyProfile,
  updateCompanyProfile,
  uploadCompanyLogo,
  getCleaners,
  createCleaner,
  updateCleaner,
  resetCleanerPin,
  type Cleaner as ApiCleaner,
} from "@/api/client";
import { PLAN_STATUS } from "@/constants/copy";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

type SettingsState = {
  name: string;
  email: string;
  phone: string;
  notificationsEnabled: boolean;
  ramadanMode: boolean;
};

const initialSettings: SettingsState = {
  name: "",
  email: "",
  phone: "",
  notificationsEnabled: true,
  ramadanMode: false,
};

type CleanerRow = ApiCleaner;

type NewCleanerState = {
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  pin: string;
  pinConfirm: string;
};

const initialNewCleaner: NewCleanerState = {
  name: "",
  email: "",
  phone: "",
  isActive: true,
  pin: "",
  pinConfirm: "",
};

export default function Settings() {
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [isLoading, setIsLoading] = useState(false);

  // --- ЛОГОТИП КОМПАНИИ (превью + файл + backend URL) ---
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);

  // список клинеров из API
  const [cleaners, setCleaners] = useState<CleanerRow[]>([]);

  // trial / usage summary (для soft-limits)
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  const [isAddCleanerOpen, setIsAddCleanerOpen] = useState(false);
  const [newCleaner, setNewCleaner] = useState<NewCleanerState>(
    initialNewCleaner,
  );
  const [newCleanerError, setNewCleanerError] = useState<string | null>(null);

  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Модалка с данными для входа клинера
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [lastCreatedPhone, setLastCreatedPhone] = useState<string | null>(null);
  const [lastCreatedPin, setLastCreatedPin] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAll() {
      try {
        setIsLoadingInitial(true);
        const [company, cleanersData, usageData] = await Promise.all([
          getCompanyProfile(),
          getCleaners(),
          getUsageSummary(),
        ]);

        if (!isMounted) return;

        setSettings((prev) => ({
          ...prev,
          name: company.name || "",
          email: company.contact_email || "",
          phone: company.contact_phone || "",
        }));

        setCompanyLogoUrl(company.logo_url || null);
        setCleaners(cleanersData);
        setUsage(usageData);
      } catch (err) {
        if (!isMounted) return;
        console.warn("[Settings] Failed to load initial data", err);
        setUsage(null);
      } finally {
        if (isMounted) setIsLoadingInitial(false);
      }
    }

    loadAll();

    return () => {
      isMounted = false;
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setIsSavingCompany(true);
    setIsLoading(true);

    try {
      const updatedCompany = await updateCompanyProfile({
        name: settings.name || "",
        contact_email: settings.email || null,
        contact_phone: settings.phone || null,
      });

      setSettings((prev) => ({
        ...prev,
        name: updatedCompany.name || "",
        email: updatedCompany.contact_email || "",
        phone: updatedCompany.contact_phone || "",
      }));

      if (logoFile) {
        const updatedWithLogo = await uploadCompanyLogo(logoFile);
        setCompanyLogoUrl(updatedWithLogo.logo_url || null);
        setLogoFile(null);
        setLogoPreview(null);
      }
    } catch (err) {
      console.error("[Settings] Failed to save company settings", err);
    } finally {
      setIsSavingCompany(false);
      setIsLoading(false);
    }
  };

  const handleChange = <K extends keyof SettingsState>(
    field: K,
    value: SettingsState[K],
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const validateNewCleaner = (state: NewCleanerState): string | null => {
    if (!state.name.trim()) {
      return "Full name is required.";
    }
    if (!state.phone.trim()) {
      return "Phone number is required. It will be used as cleaner login.";
    }
    const phone = state.phone.trim();
    if (!/^\+?[0-9\s-]+$/.test(phone)) {
      return "Please enter a valid phone number.";
    }

    if (!state.pin.trim()) {
      return "PIN is required.";
    }
    if (!/^[0-9]{4}$/.test(state.pin.trim())) {
      return "PIN must be exactly 4 digits.";
    }
    if (state.pin.trim() !== state.pinConfirm.trim()) {
      return "PIN confirmation does not match.";
    }

    return null;
  };

  const handleAddCleaner = async () => {
    const error = validateNewCleaner(newCleaner);
    if (error) {
      setNewCleanerError(error);
      return;
    }

    setNewCleanerError(null);

    try {
      const payload: any = {
        full_name: newCleaner.name.trim(),
        email: newCleaner.email.trim() || undefined,
        phone: newCleaner.phone.trim(),
        is_active: newCleaner.isActive,
        pin: newCleaner.pin.trim(),
      };

      const created = await createCleaner(payload);

      setCleaners((prev) => [...prev, created]);

      // сохраняем данные для модалки логина
      setLastCreatedPhone(payload.phone);
      setLastCreatedPin(payload.pin);
      setShowLoginModal(true);

      setNewCleaner(initialNewCleaner);
      setIsAddCleanerOpen(false);
    } catch (err) {
      console.error("[Settings] Failed to create cleaner", err);
      setNewCleanerError("Failed to create cleaner. Please try again.");
    }
  };

  const handleResetPin = async (cleaner: CleanerRow) => {
    const confirmed = window.confirm(
      `Reset login PIN for ${cleaner.full_name}? The old PIN will stop working.`,
    );
    if (!confirmed) return;

    try {
      const data = await resetCleanerPin(cleaner.id);

      setLastCreatedPhone(data.phone);
      setLastCreatedPin(data.pin);
      setShowLoginModal(true);
    } catch (err) {
      console.error("[Settings] Failed to reset cleaner PIN", err);
      // здесь можно потом добавить тост
    }
  };

  const renderCleanersSoftLimitBanner = () => {
    if (!usage) return null;

    const isTrialPlan =
      usage.plan === PLAN_STATUS.TRIAL || usage.is_trial_active === true;

    if (!isTrialPlan) return null;

    const currentCount =
      typeof usage.cleaners_count === "number"
        ? usage.cleaners_count
        : cleaners.length;

    const limit = usage.cleaners_soft_limit;

    const closeToLimit = currentCount >= limit - 1 && currentCount < limit;

    const atLimit = currentCount >= limit;

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

  const resolveLogoUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url}`;
  };

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
                disabled={isLoadingInitial}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Company Logo
              </Label>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                  {logoPreview || companyLogoUrl ? (
                    <img
                      src={logoPreview || resolveLogoUrl(companyLogoUrl)}
                      alt="Company logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

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
                    document.getElementById("company-logo-input")?.click()
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
                disabled={isLoadingInitial}
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
                disabled={isLoadingInitial}
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
              <Button
                size="sm"
                onClick={() => {
                  setNewCleaner(initialNewCleaner);
                  setNewCleanerError(null);
                  setIsAddCleanerOpen(true);
                }}
                disabled={isLoadingInitial}
              >
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
                  <p className="font-medium text-foreground">
                    {cleaner.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cleaner · {cleaner.phone || "No phone"}
                    {cleaner.email ? ` · ${cleaner.email}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Login for mobile app:{" "}
                    <span className="font-medium">phone number + 4-digit PIN</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      cleaner.is_active
                        ? "bg-status-completed-bg text-status-completed"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {cleaner.is_active ? "Active" : "Inactive"}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-1"
                    onClick={() => handleResetPin(cleaner)}
                  >
                    Reset PIN
                  </Button>

                  <Switch
                    checked={cleaner.is_active}
                    onCheckedChange={async (checked) => {
                      try {
                        const updated = await updateCleaner(cleaner.id, {
                          is_active: checked,
                        });
                        setCleaners((prev) =>
                          prev.map((c) => (c.id === updated.id ? updated : c)),
                        );
                      } catch (e) {
                        console.error(
                          "[Settings] Failed to update cleaner status",
                          e,
                        );
                      }
                    }}
                  />
                </div>
              </div>
            ))}

            {cleaners.length === 0 && !isLoadingInitial && (
              <p className="text-sm text-muted-foreground">
                No cleaners yet. Add your first team member to get started.
              </p>
            )}
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
            disabled={isLoading || isLoadingInitial}
            className="bg-primary px-8 text-primary-foreground shadow-soft hover:bg-primary/90"
          >
            {isSavingCompany ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Add Cleaner Modal */}
      <Dialog open={isAddCleanerOpen} onOpenChange={setIsAddCleanerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add cleaner</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {newCleanerError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {newCleanerError}
              </div>
            )}

            {/* Full name */}
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

            {/* Phone + Email */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="tel"
                  value={newCleaner.phone}
                  onChange={(e) =>
                    setNewCleaner((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="e.g. +971 50 123 4567"
                  className="h-11 bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Required. This phone number will be used as the cleaner&apos;s
                  login on the mobile app.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <Input
                  type="email"
                  value={newCleaner.email}
                  onChange={(e) =>
                    setNewCleaner((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="e.g. aisha@example.com"
                  className="h-11 bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Used for future invites and notifications.
                </p>
              </div>
            </div>

            {/* PIN + Confirm PIN */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  4-digit PIN <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  value={newCleaner.pin}
                  maxLength={4}
                  onChange={(e) =>
                    setNewCleaner((prev) => ({
                      ...prev,
                      pin: e.target.value.replace(/[^0-9]/g, "").slice(0, 4),
                    }))
                  }
                  placeholder="e.g. 1234"
                  className="h-11 bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Cleaner will log in with{" "}
                  <span className="font-medium">
                    phone number + this PIN
                  </span>
                  .
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Confirm PIN <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  value={newCleaner.pinConfirm}
                  maxLength={4}
                  onChange={(e) =>
                    setNewCleaner((prev) => ({
                      ...prev,
                      pinConfirm: e.target.value
                        .replace(/[^0-9]/g, "")
                        .slice(0, 4),
                    }))
                  }
                  placeholder="Repeat PIN"
                  className="h-11 bg-background border-border"
                />
              </div>
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
              onClick={() => {
                setIsAddCleanerOpen(false);
                setNewCleaner(initialNewCleaner);
                setNewCleanerError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCleaner}
              disabled={!newCleaner.name.trim() || !newCleaner.phone.trim()}
            >
              Save cleaner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login details modal (создание + reset PIN) */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cleaner login details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <p className="text-sm text-muted-foreground">
              Share these login details with the cleaner:
            </p>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-foreground">Phone:</span>{" "}
                <span className="text-muted-foreground">
                  {lastCreatedPhone}
                </span>
              </div>
              <div>
                <span className="font-medium text-foreground">PIN:</span>{" "}
                <span className="text-muted-foreground">{lastCreatedPin}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  if (!lastCreatedPhone || !lastCreatedPin) return;
                  const text = `CleanProof login:\nPhone: ${lastCreatedPhone}\nPIN: ${lastCreatedPin}`;
                  navigator.clipboard.writeText(text).catch(() => {});
                }}
              >
                Copy details
              </Button>
              <Button
                type="button"
                className="text-xs"
                onClick={() => setShowLoginModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
