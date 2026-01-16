import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { companySettings } from "@/data/sampleData";
import { Upload } from "lucide-react";

export default function Settings() {
  const [settings, setSettings] = useState(companySettings);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate save
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  const handleChange = (field: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
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
        {/* Company Info */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <h2 className="font-semibold text-foreground mb-6">Company Information</h2>
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
                <div className="w-16 h-16 rounded-xl bg-muted border border-border flex items-center justify-center">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
                <Button variant="outline" className="border-border">
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
          <h2 className="font-semibold text-foreground mb-6">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {/* Preferences */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <h2 className="font-semibold text-foreground mb-6">Preferences</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-foreground">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
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
                  <p className="text-sm text-muted-foreground mt-0.5">
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
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft px-8"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
