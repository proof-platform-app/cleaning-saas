// dubai-control/src/pages/company/CompanyProfile.tsx

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Upload, Loader2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useUserRole, canAccessBilling } from "@/hooks/useUserRole";
import {
  getCompanyProfile,
  updateCompanyProfile,
  uploadCompanyLogo,
  type CompanyProfile as CompanyProfileType,
} from "@/api/client";

export default function CompanyProfile() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const user = useUserRole();
  const canAccess = canAccessBilling(user.role); // Owner/Manager only
  const queryClient = useQueryClient();

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch company profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["company-profile"],
    queryFn: getCompanyProfile,
    enabled: canAccess,
  });

  // Update company profile mutation
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<CompanyProfileType>) =>
      updateCompanyProfile(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(["company-profile"], data);
      toast({
        title: "Changes saved",
        description: "Company profile updated successfully",
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to update company profile";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

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

  // Sync form state with fetched profile
  useEffect(() => {
    if (profile) {
      setCompanyName(profile.name);
      setContactEmail(profile.contact_email || "");
      setContactPhone(profile.contact_phone || "");
    }
  }, [profile]);

  const handleSave = async () => {
    updateMutation.mutate({
      name: companyName,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
    });
  };

  // Compress image to fit under 2MB
  const compressImage = async (file: File): Promise<File> => {
    const maxSize = 2 * 1024 * 1024; // 2MB

    // If file is already small enough, return as is
    if (file.size <= maxSize) {
      return file;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions (max 1200px on longest side)
          const maxDimension = 1200;
          if (width > height && width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Try different quality levels until file is small enough
          let quality = 0.9;
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error("Failed to compress image"));
                  return;
                }

                // If still too large and quality can be reduced, try again
                if (blob.size > maxSize && quality > 0.5) {
                  quality -= 0.1;
                  tryCompress();
                  return;
                }

                // Create new file from blob
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });

                resolve(compressedFile);
              },
              "image/jpeg",
              quality
            );
          };

          tryCompress();
        };

        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Logo must be PNG, JPG, JPEG, or WEBP",
      });
      return;
    }

    setIsUploadingLogo(true);

    try {
      // Compress image if needed
      const compressedFile = await compressImage(file);

      // Final size check (should always pass after compression)
      const maxSize = 2 * 1024 * 1024;
      if (compressedFile.size > maxSize) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Unable to compress image below 2MB. Please use a smaller image.",
        });
        setIsUploadingLogo(false);
        return;
      }

      const result = await uploadCompanyLogo(compressedFile);

      // Update cache with new logo_url
      queryClient.setQueryData(["company-profile"], (old: any) => ({
        ...old,
        logo_url: result.logo_url,
      }));

      toast({
        title: "Logo uploaded",
        description: "Company logo updated successfully",
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to upload logo";
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: message,
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  if (!canAccess) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
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
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Company
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your company information and team
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8 border-b border-border">
        <nav className="flex gap-8">
          <Link
            to="/company/profile"
            className="border-b-2 border-primary pb-3 text-sm font-medium text-foreground"
          >
            Profile
          </Link>
          <Link
            to="/company/team"
            className="border-b-2 border-transparent pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Team
          </Link>
        </nav>
      </div>

      {/* Company Info Section */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-foreground">Company Information</h2>

        <div className="space-y-6">
          {/* Company Logo */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Company Logo</label>
            <div className="flex items-start gap-4">
              {/* Logo Preview with Drag & Drop */}
              <div
                className={`relative flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted"
                } ${isUploadingLogo ? "opacity-50" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isUploadingLogo && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                {isUploadingLogo ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : profile?.logo_url ? (
                  <>
                    <img
                      src={profile.logo_url}
                      alt="Company logo"
                      className="h-full w-full rounded-xl object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                      <Upload className="h-6 w-6 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Drop or click</span>
                  </div>
                )}
              </div>

              {/* Upload Instructions */}
              <div className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                >
                  {isUploadingLogo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {profile?.logo_url ? "Replace logo" : "Upload logo"}
                    </>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleFileInputChange}
                  disabled={isUploadingLogo}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  PNG, JPG, JPEG, or WEBP up to 2MB
                </p>
                <p className="text-xs text-muted-foreground">
                  Drag and drop or click to upload
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
              disabled={updateMutation.isPending || isUploadingLogo}
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
              disabled={updateMutation.isPending || isUploadingLogo}
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
              disabled={updateMutation.isPending || isUploadingLogo}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || isUploadingLogo}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
            <Button
              variant="outline"
              disabled={updateMutation.isPending || isUploadingLogo}
              onClick={() => {
                if (profile) {
                  setCompanyName(profile.name);
                  setContactEmail(profile.contact_email || "");
                  setContactPhone(profile.contact_phone || "");
                }
              }}
            >
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
