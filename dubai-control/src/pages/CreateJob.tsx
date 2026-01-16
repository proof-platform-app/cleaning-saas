import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { locations, cleaners } from "@/data/sampleData";
import { ArrowLeft } from "lucide-react";

export default function CreateJob() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    location: "",
    cleaner: "",
    date: "",
    startTime: "",
    endTime: "",
    hourlyRate: "",
    flatRate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate job creation
    setTimeout(() => {
      setIsLoading(false);
      navigate("/jobs");
    }, 800);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </Link>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Create New Job
        </h1>
        <p className="mt-1 text-muted-foreground">
          Schedule a new cleaning job with location, time, and cleaner details
        </p>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Location & Cleaner */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="font-semibold text-foreground mb-6">Assignment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Location
                </Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => handleChange("location", value)}
                >
                  <SelectTrigger className="h-11 bg-background border-border">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Property or building address
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Cleaner
                </Label>
                <Select
                  value={formData.cleaner}
                  onValueChange={(value) => handleChange("cleaner", value)}
                >
                  <SelectTrigger className="h-11 bg-background border-border">
                    <SelectValue placeholder="Select cleaner" />
                  </SelectTrigger>
                  <SelectContent>
                    {cleaners.map((cleaner) => (
                      <SelectItem key={cleaner.id} value={cleaner.id}>
                        {cleaner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Assigned team member
                </p>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="font-semibold text-foreground mb-6">Schedule</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Date
                </Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  className="h-11 bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  GST timezone (UTC+4)
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Start Time
                </Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleChange("startTime", e.target.value)}
                  className="h-11 bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  End Time
                </Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleChange("endTime", e.target.value)}
                  className="h-11 bg-background border-border"
                />
              </div>
            </div>
          </div>

          {/* Pricing (Display Only) */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="font-semibold text-foreground mb-2">
              Pricing
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                Optional
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              For display purposes only. Does not affect job tracking.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Hourly Rate (AED)
                </Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.hourlyRate}
                  onChange={(e) => handleChange("hourlyRate", e.target.value)}
                  className="h-11 bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Flat Rate (AED)
                </Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.flatRate}
                  onChange={(e) => handleChange("flatRate", e.target.value)}
                  className="h-11 bg-background border-border"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft px-8"
            >
              {isLoading ? "Creating..." : "Create Job"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/jobs")}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
