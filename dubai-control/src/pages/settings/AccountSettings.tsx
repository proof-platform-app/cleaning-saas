// dubai-control/src/pages/settings/AccountSettings.tsx

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Settings, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useUserRole, isPasswordAuth } from "@/hooks/useUserRole";

interface ProfileFormData {
  fullName: string;
  email: string;
  phone: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  jobAssignmentAlerts: boolean;
  weeklySummary: boolean;
}

type PasswordStrength = "weak" | "medium" | "strong";

export default function AccountSettings() {
  const user = useUserRole();
  const { toast } = useToast();
  const location = useLocation();
  const isPasswordAuthUser = isPasswordAuth(user);
  const isSSO = !isPasswordAuthUser;

  // Profile state
  const [profileData, setProfileData] = useState<ProfileFormData>({
    fullName: user.name,
    email: user.email,
    phone: "+971 50 123 4567",
  });

  const [initialProfile, setInitialProfile] = useState<ProfileFormData>(profileData);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password state
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    emailNotifications: true,
    jobAssignmentAlerts: true,
    weeklySummary: false,
  });

  const [savingNotificationId, setSavingNotificationId] = useState<string | null>(null);

  // Scroll to section if hash present
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [location]);

  // Profile form handlers
  const isProfileDirty = JSON.stringify(profileData) !== JSON.stringify(initialProfile);

  const handleProfileChange = (field: keyof ProfileFormData, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileCancel = () => {
    if (isProfileDirty) {
      const confirmed = window.confirm("Discard changes?");
      if (!confirmed) return;
    }
    setProfileData(initialProfile);
  };

  const handleProfileSave = async () => {
    // Validation
    if (profileData.fullName.trim().length < 2) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Please enter your full name (at least 2 characters)",
      });
      return;
    }

    if (!isValidEmail(profileData.email)) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Please enter a valid email address",
      });
      return;
    }

    if (profileData.phone && !isValidPhone(profileData.phone)) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Please enter a valid phone number",
      });
      return;
    }

    setIsSavingProfile(true);

    try {
      // TODO: API call to save profile
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setInitialProfile(profileData);

      toast({
        title: "✓ Profile updated successfully",
        description: "Your profile information has been saved.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile. Please try again.",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Password form handlers
  const calculatePasswordStrength = (password: string): PasswordStrength => {
    if (password.length === 0) return "weak";

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return "weak";
    if (score <= 3) return "medium";
    return "strong";
  };

  const passwordStrength = calculatePasswordStrength(passwordData.newPassword);

  const handlePasswordChange = (field: keyof PasswordFormData, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordCancel = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handlePasswordSave = async () => {
    // Validation
    if (!passwordData.currentPassword) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Current password is required",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description:
          "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
      });
      return;
    }

    if (
      !/[A-Z]/.test(passwordData.newPassword) ||
      !/[a-z]/.test(passwordData.newPassword) ||
      !/[0-9]/.test(passwordData.newPassword) ||
      !/[^A-Za-z0-9]/.test(passwordData.newPassword)
    ) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description:
          "Password must contain uppercase, lowercase, number, and special character",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Passwords do not match",
      });
      return;
    }

    setIsSavingPassword(true);

    try {
      // TODO: API call to change password
      await new Promise((resolve) => setTimeout(resolve, 1000));

      handlePasswordCancel();

      toast({
        title: "✓ Password updated successfully",
        description: "Your password has been changed.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Current password is incorrect",
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Notification handlers
  const handleNotificationToggle = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    // If turning off master toggle, disable all sub-toggles
    if (key === "emailNotifications" && !value) {
      setNotifications({
        emailNotifications: false,
        jobAssignmentAlerts: false,
        weeklySummary: false,
      });
    } else {
      setNotifications((prev) => ({ ...prev, [key]: value }));
    }

    setSavingNotificationId(key);

    try {
      // TODO: API call to save notification preference
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      // Revert on error
      setNotifications((prev) => ({ ...prev, [key]: !value }));

      toast({
        variant: "destructive",
        title: "Failed to save notification preferences",
        description: "Please try again",
      });
    } finally {
      setSavingNotificationId(null);
    }
  };

  // Utility functions
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone: string): boolean => {
    return /^\+?[0-9\s-]{10,}$/.test(phone);
  };

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* Back Link - Mobile/Deeplink Only */}
      <Link
        to="/settings"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Settings
      </Link>

      {/* Page Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Settings className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Account Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your profile and access preferences
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {/* Section A: Profile Information */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-foreground">
            Profile Information
          </h2>

          <div className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">
                Full name *
              </Label>
              <Input
                id="fullName"
                type="text"
                value={profileData.fullName}
                onChange={(e) => handleProfileChange("fullName", e.target.value)}
                className="h-11"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => handleProfileChange("email", e.target.value)}
                disabled={isSSO}
                className="h-11"
              />
              {isSSO && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>Email managed by your organization</span>
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone number (optional)
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+971 50 123 4567"
                value={profileData.phone}
                onChange={(e) => handleProfileChange("phone", e.target.value)}
                className="h-11"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleProfileCancel}
                disabled={!isProfileDirty || isSavingProfile}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProfileSave}
                disabled={!isProfileDirty || isSavingProfile}
                className="bg-accent-primary text-white hover:bg-accent-primary/90"
              >
                {isSavingProfile ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>

        {/* Section B: Password & Security */}
        {isPasswordAuthUser ? (
          <div
            id="security"
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <h2 className="mb-6 text-lg font-semibold text-foreground">
              Password & Security
            </h2>

            <div className="space-y-6">
              <h3 className="text-sm font-medium text-foreground">Change Password</h3>

              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-sm font-medium">
                  Current password *
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    handlePasswordChange("currentPassword", e.target.value)
                  }
                  className="h-11"
                />
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  New password *
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                  className="h-11"
                />

                {/* Password Strength Indicator */}
                {passwordData.newPassword && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((segment) => (
                        <div
                          key={segment}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            (passwordStrength === "weak" && segment <= 1) ||
                            (passwordStrength === "medium" && segment <= 3) ||
                            passwordStrength === "strong"
                              ? passwordStrength === "weak"
                                ? "bg-status-failed"
                                : passwordStrength === "medium"
                                  ? "bg-status-flagged"
                                  : "bg-status-completed"
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p
                      className={`text-xs font-medium ${
                        passwordStrength === "weak"
                          ? "text-status-failed"
                          : passwordStrength === "medium"
                            ? "text-status-flagged"
                            : "text-status-completed"
                      }`}
                    >
                      Password strength:{" "}
                      {passwordStrength.charAt(0).toUpperCase() +
                        passwordStrength.slice(1)}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm new password *
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    handlePasswordChange("confirmPassword", e.target.value)
                  }
                  className="h-11"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handlePasswordCancel}
                  disabled={isSavingPassword}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePasswordSave}
                  disabled={
                    !passwordData.currentPassword ||
                    !passwordData.newPassword ||
                    !passwordData.confirmPassword ||
                    isSavingPassword
                  }
                  className="bg-accent-primary text-white hover:bg-accent-primary/90"
                >
                  {isSavingPassword ? "Updating..." : "Update password"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div
            id="security"
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <h2 className="mb-6 text-lg font-semibold text-foreground">
              Password & Security
            </h2>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Authentication managed by your organization
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Contact your IT administrator for help
              </p>
            </div>
          </div>
        )}

        {/* Section C: Notifications */}
        <div
          id="notifications"
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="mb-6 text-lg font-semibold text-foreground">
            Notifications
          </h2>

          <div className="space-y-6">
            {/* Email Notifications (Master Toggle) */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="emailNotifications" className="text-sm font-medium">
                  Email Notifications
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Receive updates and alerts via email
                </p>
              </div>
              <Switch
                id="emailNotifications"
                checked={notifications.emailNotifications}
                onCheckedChange={(checked) =>
                  handleNotificationToggle("emailNotifications", checked)
                }
                disabled={savingNotificationId === "emailNotifications"}
              />
            </div>

            {/* Job Assignment Alerts */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label
                  htmlFor="jobAssignmentAlerts"
                  className={`text-sm font-medium ${!notifications.emailNotifications ? "text-muted-foreground" : ""}`}
                >
                  Job Assignment Alerts
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get notified when assigned to a new job
                </p>
              </div>
              <Switch
                id="jobAssignmentAlerts"
                checked={notifications.jobAssignmentAlerts}
                onCheckedChange={(checked) =>
                  handleNotificationToggle("jobAssignmentAlerts", checked)
                }
                disabled={
                  !notifications.emailNotifications ||
                  savingNotificationId === "jobAssignmentAlerts"
                }
              />
            </div>

            {/* Weekly Summary */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label
                  htmlFor="weeklySummary"
                  className={`text-sm font-medium ${!notifications.emailNotifications ? "text-muted-foreground" : ""}`}
                >
                  Weekly Summary
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Receive a weekly summary of your activity
                </p>
              </div>
              <Switch
                id="weeklySummary"
                checked={notifications.weeklySummary}
                onCheckedChange={(checked) =>
                  handleNotificationToggle("weeklySummary", checked)
                }
                disabled={
                  !notifications.emailNotifications ||
                  savingNotificationId === "weeklySummary"
                }
              />
            </div>

            {/* Helper Text */}
            <p className="pt-2 text-xs text-muted-foreground">
              Changes are saved automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
