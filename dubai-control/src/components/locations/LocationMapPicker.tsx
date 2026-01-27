// dubai-control/src/components/locations/LocationMapPicker.tsx
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon
const defaultIconProto = L.Icon.Default.prototype as unknown as {
  _getIconUrl?: () => string;
};
delete defaultIconProto._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LocationMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
}

// Default to Dubai center
const DUBAI_CENTER: L.LatLngExpression = [25.2048, 55.2708];

export function LocationMapPicker({
  latitude,
  longitude,
  onLocationChange,
}: LocationMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const hasValidCoords = latitude !== null && longitude !== null;
  const center: L.LatLngExpression = hasValidCoords
    ? [latitude as number, longitude as number]
    : DUBAI_CENTER;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView(
      center,
      hasValidCoords ? 15 : 11
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add marker if coordinates exist
    if (hasValidCoords) {
      markerRef.current = L.marker([latitude as number, longitude as number]).addTo(
        map
      );
    }

    // Handle map clicks
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }

      onLocationChange(lat, lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update marker position when coordinates change externally
  useEffect(() => {
    if (!mapRef.current) return;

    if (hasValidCoords) {
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude as number, longitude as number]);
      } else {
        markerRef.current = L.marker([
          latitude as number,
          longitude as number,
        ]).addTo(mapRef.current);
      }
    }
  }, [latitude, longitude, hasValidCoords]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Click on the map to set the location coordinates.
      </p>
      <div
        ref={mapContainerRef}
        className="h-[300px] rounded-lg border border-border overflow-hidden"
        style={{ height: "300px", width: "100%" }}
      />
      <p className="text-xs text-muted-foreground">
        These coordinates will be used for cleaner navigation and GPS check-in
        validation.
      </p>
    </div>
  );
}
