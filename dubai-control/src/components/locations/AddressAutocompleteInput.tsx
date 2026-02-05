// dubai-control/src/components/locations/AddressAutocompleteInput.tsx
import React, { useEffect, useRef, useState } from "react";
import { useLoadScript, type Libraries } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, MapPin, AlertCircle } from "lucide-react";

/**
 * Для автокомплита нужен ТОЛЬКО places
 * Никаких Library, drawing, visualization и т.п.
 */

const LIBRARIES: Libraries = ["places"];

type AddressAutocompleteInputProps = {
  label?: string;
  placeholder?: string;
  initialAddress?: string;
  disabled?: boolean;
  error?: string | null;

  onSelect: (data: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void;

  onAddressChange?: (address: string) => void;
};

type Suggestion = {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
};

export function AddressAutocompleteInput({
  label = "Address",
  placeholder = "Start typing address or place name...",
  initialAddress,
  disabled,
  error,
  onSelect,
  onAddressChange,
}: AddressAutocompleteInputProps) {
  const [inputValue, setInputValue] = useState(initialAddress ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const autocompleteServiceRef =
    useRef<any>(null);

  const placesServiceRef =
    useRef<any>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: LIBRARIES,
  });

  // Инициализация Google сервисов
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined") return;

    const g = (window as any).google;
    if (!g?.maps?.places) {
      console.warn("[AddressAutocompleteInput] Google Maps JS not available");
      return;
    }

    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current =
        new g.maps.places.AutocompleteService();
    }

    if (!placesServiceRef.current) {
      const dummyDiv = document.createElement("div");
      placesServiceRef.current =
        new g.maps.places.PlacesService(dummyDiv);
    }
  }, [isLoaded]);

  // Подсказки при вводе
  useEffect(() => {
    if (!isLoaded || !autocompleteServiceRef.current) return;

    const value = inputValue.trim();
    if (!value) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setLoadingSuggestions(true);
    setLocalError(null);

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: value,
        types: ["geocode"],
      },
      (results: any[], status: string) => {
        if (cancelled) return;

        setLoadingSuggestions(false);

        if (status !== "OK" || !results) {
          setSuggestions([]);
          return;
        }

        const mapped: Suggestion[] = results.map((r) => ({
          description: r.description,
          placeId: r.place_id,
          mainText:
            r.structured_formatting?.main_text ?? r.description,
          secondaryText:
            r.structured_formatting?.secondary_text ?? "",
        }));

        setSuggestions(mapped);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [inputValue, isLoaded]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const v = e.target.value;
    setInputValue(v);
    setLocalError(null);
    onAddressChange?.(v);
  };

  const handleSuggestionClick = (s: Suggestion) => {
    if (!placesServiceRef.current) return;

    setSuggestions([]);
    setInputValue(s.description);
    onAddressChange?.(s.description);

    placesServiceRef.current.getDetails(
      {
        placeId: s.placeId,
        fields: ["formatted_address", "geometry"],
      },
      (place: any, status: string) => {
        if (
          status !== "OK" ||
          !place?.geometry?.location
        ) {
          setLocalError(
            "Failed to fetch coordinates for this address.",
          );
          return;
        }

        const loc = place.geometry.location;

        onSelect({
          address:
            place.formatted_address ?? s.description,
          latitude: loc.lat(),
          longitude: loc.lng(),
        });
      },
    );
  };

  const showDropdown = isFocused && suggestions.length > 0;

  return (
    <div ref={containerRef} className="space-y-2 relative">
      {label && (
        <Label htmlFor="address-autocomplete">
          {label} <span className="text-destructive">*</span>
        </Label>
      )}

      {!isLoaded && !loadError && (
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Loading address search…</span>
        </div>
      )}

      {loadError && (
        <div className="mb-1 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>Address search is unavailable</span>
        </div>
      )}

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </div>

        <Input
          id="address-autocomplete"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          disabled={disabled || !isLoaded}
          placeholder={placeholder}
          className={cn(
            "pl-9",
            (error || localError) &&
              "border-destructive focus-visible:ring-destructive",
          )}
        />

        {showDropdown && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
            {suggestions.map((s) => (
              <button
                key={s.placeId}
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSuggestionClick(s);
                }}
              >
                <span className="font-medium">{s.mainText}</span>
                {s.secondaryText && (
                  <span className="text-xs text-muted-foreground">
                    {s.secondaryText}
                  </span>
                )}
              </button>
            ))}

            {loadingSuggestions && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground border-t border-border">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Searching…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {(error || localError) && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>{localError || error}</span>
        </p>
      )}
    </div>
  );
}
