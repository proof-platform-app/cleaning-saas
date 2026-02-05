// dubai-control/src/components/locations/LocationForm.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationMap } from "./LocationMap";
import { AddressAutocompleteInput } from "./AddressAutocompleteInput";
import type { Location as ApiLocation } from "@/api/client";
import { AlertCircle, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface LocationFormProps {
  location?: ApiLocation | null;
  onSave: (data: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    is_active?: boolean;
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
    location?.latitude?.toString() || "",
  );
  const [longitude, setLongitude] = useState<string>(
    location?.longitude?.toString() || "",
  );
  const [isActive, setIsActive] = useState<boolean>(
    (location as ApiLocation | null)?.is_active ?? true,
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
          : "",
      );
      setLongitude(
        typeof location.longitude === "number"
          ? location.longitude.toString()
          : "",
      );
      setIsActive((location as ApiLocation | null)?.is_active ?? true);
    } else {
      setName("");
      setAddress("");
      setLatitude("");
      setLongitude("");
      setIsActive(true);
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

    const normalizedLat = latRaw.replace(",", ".").trim();
    const normalizedLng = lngRaw.replace(",", ".").trim();

    const parsedLat = Number.parseFloat(normalizedLat);
    const parsedLng = Number.parseFloat(normalizedLng);

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      setLocalError("Latitude and longitude must be valid numbers.");
      return;
    }

    if (parsedLat < -90 || parsedLat > 90) {
      setLocalError("Latitude must be between -90 and 90.");
      return;
    }

    if (parsedLng < -180 || parsedLng > 180) {
      setLocalError("Longitude must be between -180 and 180.");
      return;
    }

    setErrors({});

    try {
      await onSave({
        name: trimmedName,
        address: trimmedAddress,
        latitude: parsedLat,
        longitude: parsedLng,
        is_active: isActive,
      });
    } catch (err) {
      console.error("[LocationForm] onSave error", err);
      setLocalError("Failed to save location. Please try again.");
    }
  };

  const handleMapLocationChange = (lat: number, lng: number) => {
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
    setErrors((prev) => ({
      ...prev,
      latitude: undefined,
      longitude: undefined,
    }));
    setLocalError(null);
  };

  // когда менеджер выбирает адрес из автокомплита
  const handleAddressSelect = (data: {
    address: string;
    latitude: number;
    longitude: number;
  }) => {
    setAddress(data.address);
    setLatitude(data.latitude.toFixed(6));
    setLongitude(data.longitude.toFixed(6));
    setErrors((prev) => ({
      ...prev,
      address: undefined,
      latitude: undefined,
      longitude: undefined,
    }));
    setLocalError(null);
  };

  // когда он просто печатает текст (до клика по подсказке)
  const handleAddressChange = (value: string) => {
    setAddress(value);
    setErrors((prev) => ({
      ...prev,
      address: undefined,
    }));
  };

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

  const isEditing = !!location;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {apiError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{apiError}</p>
        </div>
      )}

      {localError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{localError}</p>
        </div>
      )}

      {/* Статус локации */}
      <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Location status</Label>
            <p className="text-xs text-muted-foreground">
              Active locations are available for new jobs. Inactive locations
              stay in history and reports, but are hidden from planning and
              dropdowns.
            </p>
            {isEditing && !isActive && (
              <p className="mt-1 text-[11px] text-amber-700">
                This location is inactive. Existing jobs and PDF reports will
                still reference it, but you won&apos;t be able to assign new
                jobs here until you reactivate it.
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isActive ? "Active" : "Inactive"}
              </span>
              <Switch
                checked={isActive}
                onCheckedChange={(value: boolean) => setIsActive(value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Name */}
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

      {/* Поиск адреса (Google Places) */}
      <div className="space-y-2">
        <AddressAutocompleteInput
          label="Address search"
          placeholder="Start typing address or building name…"
          initialAddress={address}
          disabled={isLoading}
          onSelect={handleAddressSelect}
          onAddressChange={handleAddressChange}
          error={errors.address || undefined}
        />
        <p className="text-xs text-muted-foreground">
          Start typing the address or building name. Pick a suggestion to fill
          the full address and set coordinates automatically.
        </p>
      </div>

      {/* Текстовое поле адреса (для ручной правки) */}
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

      {/* Координаты */}
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

      {/* Карта */}
      <LocationMap
        latitude={validLat}
        longitude={validLng}
        onLocationChange={handleMapLocationChange}
      />

      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" disabled={isLoading || !isFormValid}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
