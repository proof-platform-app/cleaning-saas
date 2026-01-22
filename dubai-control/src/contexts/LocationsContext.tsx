import { createContext, useContext, useState, ReactNode } from "react";
import { initialLocations, Location } from "@/data/locationsData";

interface LocationsContextType {
  locations: Location[];
  isLoading: boolean;
  addLocation: (location: Omit<Location, "id" | "createdAt">) => Location;
  updateLocation: (
    id: string,
    data: Omit<Location, "id" | "createdAt">
  ) => void;
}

const LocationsContext = createContext<LocationsContextType | undefined>(
  undefined
);

export function LocationsProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] =
    useState<Location[]>(initialLocations);

  const isLoading = false;

  const addLocation = (
    data: Omit<Location, "id" | "createdAt">
  ): Location => {
    const newLocation: Location = {
      ...data,
      id: `loc_${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setLocations((prev) => [...prev, newLocation]);
    return newLocation;
  };

  const updateLocation = (
    id: string,
    data: Omit<Location, "id" | "createdAt">
  ) => {
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === id ? { ...loc, ...data } : loc
      )
    );
  };

  return (
    <LocationsContext.Provider
      value={{
        locations,
        isLoading,
        addLocation,
        updateLocation,
      }}
    >
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations() {
  const context = useContext(LocationsContext);
  if (!context) {
    throw new Error(
      "useLocations must be used within a LocationsProvider"
    );
  }
  return context;
}
