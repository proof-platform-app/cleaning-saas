// dubai-control/src/pages/company/CompanyProfile.tsx

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useUserRole, canAccessBilling } from "@/hooks/useUserRole";

export default function CompanyProfile() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const user = useUserRole();
  const canAccess = canAccessBilling(user.role); // Owner/Manager only

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [companyName, setCompanyName] = useState("CleanProof Demo Company");
  const [contactEmail, setContactEmail] = useState("contact@company.example");
  const [contactPhone, setContactPhone] = useState("+971 50 123 4567");
  const [logo, setLogo] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Redirect non-authorized users
  useEffect(() => {
    if (!canAccess) {
      toast({
        variant: "destructive",
        title: "Access restricted",
        description: "Company management is restricted to administrators",
      });
      navigate("/settings", { replace: true });
    }
  }, [canAccess, navigate, toast]);

  const handleSave = async () => {
    setIsSaving(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: "Changes saved",
      description: "Company profile updated successfully",
    });

    setIsSaving(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (!canAccess) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* Back Link - Mobile Only */}
      <Link
        to="/company/profile"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Company
      </Link>

      {/* Page Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Company Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your company information and branding
          </p>
        </div>
      </div>

      {/* Company Info Section */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-foreground">Company Information</h2>

        <div className="space-y-6">
          {/* Company Logo */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Company Logo</label>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted">
                {logo ? (
                  <img
                    src={logo}
                    alt="Company logo"
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("logo-upload")?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload logo
                </Button>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG up to 2MB. Recommended: 400x400px
                </p>
              </div>
            </div>
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Enter company name"
              disabled={isSaving}
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="contact@company.com"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              This email will be used for client communications and reports
            </p>
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Contact Phone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="+971 50 123 4567"
              disabled={isSaving}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
            <Button variant="outline" disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-medium">💡 Company profile settings</p>
        <p className="mt-1">
          These settings apply to your entire organization and will be visible on reports
          and client communications.
        </p>
      </div>
    </div>
  );
}
