// dubai-control/src/components/locations/LocationForm.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationMapPicker } from "./LocationMapPicker";
import type { Location as ApiLocation } from "@/api/client";
import { AlertCircle, Loader2 } from "lucide-react";

interface LocationFormProps {
  location?: ApiLocation | null;
  onSave: (data: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  }) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  apiError?: string | null;
}

interface FormErrors {
  name?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
}

export function LocationForm({
  location,
  onSave,
  onCancel,
  isLoading,
  apiError,
}: LocationFormProps) {
  const [name, setName] = useState(location?.name || "");
  const [address, setAddress] = useState(location?.address || "");
  const [latitude, setLatitude] = useState<string>(
    location?.latitude?.toString() || ""
  );
  const [longitude, setLongitude] = useState<string>(
    location?.longitude?.toString() || ""
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (location) {
      setName(location.name || "");
      setAddress(location.address || "");
      setLatitude(
        typeof location.latitude === "number"
          ? location.latitude.toString()
          : ""
      );
      setLongitude(
        typeof location.longitude === "number"
          ? location.longitude.toString()
          : ""
      );
    } else {
      setName("");
      setAddress("");
      setLatitude("");
      setLongitude("");
    }
  }, [location]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.length > 200) {
      newErrors.name = "Name must be 200 characters or less";
    }

    if (!address.trim()) {
      newErrors.address = "Address is required";
    }

    const lat = parseFloat(latitude.replace(",", "."));
    if (!latitude.trim()) {
      newErrors.latitude = "Latitude is required";
    } else if (isNaN(lat) || lat < -90 || lat > 90) {
      newErrors.latitude = "Latitude must be between -90 and 90";
    }

    const lng = parseFloat(longitude.replace(",", "."));
    if (!longitude.trim()) {
      newErrors.longitude = "Longitude is required";
    } else if (isNaN(lng) || lng < -180 || lng > 180) {
      newErrors.longitude = "Longitude must be between -180 and 180";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!validateForm()) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const latRaw = latitude?.toString() ?? "";
    const lngRaw = longitude?.toString() ?? "";

    // Нормализуем запятые → точки
    const normalizedLat = latRaw.replace(",", ".").trim();
    const normalizedLng = lngRaw.replace(",", ".").trim();

    const parsedLat = Number.parseFloat(normalizedLat);
    const parsedLng = Number.parseFloat(normalizedLng);

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      setLocalError("Latitude and longitude must be valid numbers.");
      return;
    }

    // Дополнительно проверяем диапазон
    if (parsedLat < -90 || parsedLat > 90) {
      setLocalError("Latitude must be between -90 and 90.");
      return;
    }

    if (parsedLng < -180 || parsedLng > 180) {
      setLocalError("Longitude must be between -180 and 180.");
      return;
    }

    // Синхронизируем с полевыми ошибками (на всякий случай)
    setErrors({});

    try {
      await onSave({
        name: trimmedName,
        address: trimmedAddress,
        latitude: parsedLat,
        longitude: parsedLng,
      });
    } catch (err) {
      console.error("[LocationForm] onSave error", err);
      setLocalError("Failed to save location. Please try again.");
    }
  };

  const handleMapLocationChange = (lat: number, lng: number) => {
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
    // Clear any coordinate errors when user picks from map
    setErrors((prev) => ({
      ...prev,
      latitude: undefined,
      longitude: undefined,
    }));
    setLocalError(null);
  };

  // Check if form can be submitted (all required fields filled)
  const isFormValid =
    name.trim().length > 0 &&
    address.trim().length > 0 &&
    latitude.trim().length > 0 &&
    longitude.trim().length > 0;

  const parsedLat = latitude
    ? Number.parseFloat(latitude.replace(",", "."))
    : null;
  const parsedLng = longitude
    ? Number.parseFloat(longitude.replace(",", "."))
    : null;
  const validLat =
    parsedLat !== null &&
    !Number.isNaN(parsedLat) &&
    parsedLat >= -90 &&
    parsedLat <= 90
      ? parsedLat
      : null;
  const validLng =
    parsedLng !== null &&
    !Number.isNaN(parsedLng) &&
    parsedLng >= -180 &&
    parsedLng <= 180
      ? parsedLng
      : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {apiError && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{apiError}</p>
        </div>
      )}

      {localError && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{localError}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Marina Tower Residence"
          maxLength={200}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {name.length}/200 characters
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">
          Address <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Full address including building, street, area..."
          rows={3}
          className={errors.address ? "border-destructive" : ""}
        />
        {errors.address && (
          <p className="text-sm text-destructive">{errors.address}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="latitude">
            Latitude <span className="text-destructive">*</span>
          </Label>
          <Input
            id="latitude"
            type="text"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="e.g., 25.2048 or 25,2048"
            className={errors.latitude ? "border-destructive" : ""}
          />
          {errors.latitude && (
            <p className="text-sm text-destructive">{errors.latitude}</p>
          )}
          <p className="text-xs text-muted-foreground">Range: -90 to 90</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="longitude">
            Longitude <span className="text-destructive">*</span>
          </Label>
          <Input
            id="longitude"
            type="text"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="e.g., 55.2708 or 55,2708"
            className={errors.longitude ? "border-destructive" : ""}
          />
          {errors.longitude && (
            <p className="text-sm text-destructive">{errors.longitude}</p>
          )}
          <p className="text-xs text-muted-foreground">Range: -180 to 180</p>
        </div>
      </div>

      <LocationMapPicker
        latitude={validLat}
        longitude={validLng}
        onLocationChange={handleMapLocationChange}
      />

      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" disabled={isLoading || !isFormValid}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
