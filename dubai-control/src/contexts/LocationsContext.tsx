// dubai-control/src/contexts/LocationsContext.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  getLocations,
  createLocation as apiCreateLocation,
  updateLocation as apiUpdateLocation,
  type Location as LocationModel,
} from "@/api/client";

type LocationsContextValue = {
  locations: LocationModel[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;

  createLocation: (input: {
    name: string;
    address?: string;
    [key: string]: unknown;
  }) => Promise<LocationModel>;

  // алиас под старый код
  addLocation: (input: {
    name: string;
    address?: string;
    [key: string]: unknown;
  }) => Promise<LocationModel>;

  updateLocation: (
    id: number,
    input: Partial<{
      name: string;
      address: string | null;
      is_active: boolean;
      [key: string]: unknown;
    }>
  ) => Promise<LocationModel>;
};

const LocationsContext = createContext<LocationsContextValue | undefined>(
  undefined
);

type LocationsProviderProps = {
  children: ReactNode;
};

export function LocationsProvider({ children }: LocationsProviderProps) {
  const [locations, setLocations] = useState<LocationModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getLocations();
      setLocations(data);
    } catch (err) {
      console.error("[Locations] load error", err);
      const message =
        err instanceof Error ? err.message : "Failed to load locations";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = useCallback(
    async (input: {
      name: string;
      address?: string;
      [key: string]: unknown;
    }) => {
      const created = await apiCreateLocation(input);
      setLocations((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  const handleUpdate = useCallback(
    async (
      id: number,
      input: Partial<{
        name: string;
        address: string | null;
        is_active: boolean;
        [key: string]: unknown;
      }>
    ) => {
      const updated = await apiUpdateLocation(id, input);
      setLocations((prev) =>
        prev.map((loc) => (loc.id === id ? { ...loc, ...updated } : loc))
      );
      return updated;
    },
    []
  );

  const value: LocationsContextValue = {
    locations,
    isLoading,
    error,
    reload: load,
    createLocation: handleCreate,
    addLocation: handleCreate,
    updateLocation: handleUpdate,
  };

  return (
    <LocationsContext.Provider value={value}>
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations(): LocationsContextValue {
  const ctx = useContext(LocationsContext);
  if (!ctx) {
    throw new Error("useLocations must be used within a LocationsProvider");
  }
  return ctx;
}
