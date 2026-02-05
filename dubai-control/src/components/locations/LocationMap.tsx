// dubai-control/src/components/locations/LocationMap.tsx
import React, { useCallback, useMemo } from "react";
import {
  GoogleMap,
  Marker,
  useLoadScript,
} from "@react-google-maps/api";
import { Loader2, MapPin } from "lucide-react";

type LocationMapProps = {
  latitude: number | null;
  longitude: number | null;
  onLocationChange?: (lat: number, lng: number) => void;
  /**
   * Если координат ещё нет — используем центр по умолчанию.
   * По умолчанию ставим Дубай.
   */
  defaultCenter?: {
    lat: number;
    lng: number;
  };
  height?: string;
};

const DEFAULT_CENTER = {
  lat: 25.2048,
  lng: 55.2708,
};

const MAP_CONTAINER_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
};

const DEFAULT_ZOOM_WITH_POINT = 16;
const DEFAULT_ZOOM_NO_POINT = 11;

// Набор библиотек для Google Maps (places нужен для автокомплита)
const LIBRARIES: ("places" | "drawing" | "geometry" | "visualization")[] = [
  "places",
];

export function LocationMap({
  latitude,
  longitude,
  onLocationChange,
  defaultCenter = DEFAULT_CENTER,
  height = "260px",
}: LocationMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as
    | string
    | undefined;

  // Лёгкий лог, чтобы в консоли сразу было видно, что ключ подхватился
  console.log(
    "[LocationMap] GOOGLE_MAPS_API_KEY present:",
    Boolean(apiKey),
  );

  // Если ключа нет — честно показываем пользователю, а не просто пустой блок
  if (!apiKey) {
    return (
      <div
        className="mt-4 flex h-[200px] flex-col items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 text-destructive"
        aria-label="Map configuration error"
      >
        <MapPin className="mb-1 h-5 w-5" />
        <p className="text-sm font-medium">Map is not configured</p>
        <p className="mt-1 px-4 text-center text-xs opacity-80">
          Google Maps API key is missing on the frontend. Please set
          VITE_GOOGLE_MAPS_API_KEY in dubai-control/.env.local and
          restart the dev server.
        </p>
      </div>
    );
  }

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const hasPoint =
    typeof latitude === "number" &&
    !Number.isNaN(latitude) &&
    typeof longitude === "number" &&
    !Number.isNaN(longitude);

  const center = useMemo(
    () =>
      hasPoint
        ? { lat: latitude as number, lng: longitude as number }
        : defaultCenter,
    [hasPoint, latitude, longitude, defaultCenter],
  );

  const zoom = hasPoint ? DEFAULT_ZOOM_WITH_POINT : DEFAULT_ZOOM_NO_POINT;

  const handleMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!onLocationChange) return;
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (typeof lat === "number" && typeof lng === "number") {
        onLocationChange(lat, lng);
      }
    },
    [onLocationChange],
  );

  if (loadError) {
    return (
      <div
        className="mt-4 flex h-[200px] flex-col items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 text-destructive"
        aria-label="Map failed to load"
      >
        <MapPin className="mb-1 h-5 w-5" />
        <p className="text-sm font-medium">Map is temporarily unavailable</p>
        <p className="mt-1 px-4 text-center text-xs opacity-80">
          You can still enter coordinates manually. Try again later.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="mt-4 flex h-[200px] items-center justify-center rounded-md border border-border bg-muted/40">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading map…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-border bg-muted/40">
      <div style={{ height }}>
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={center}
          zoom={zoom}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {hasPoint && (
            <Marker
              position={center}
              draggable={true}
              onDragEnd={handleMarkerDragEnd}
            />
          )}
        </GoogleMap>
      </div>
      <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        Drag the pin to fine-tune the exact entrance or building. Coordinates
        will be updated automatically.
      </div>
    </div>
  );
}
