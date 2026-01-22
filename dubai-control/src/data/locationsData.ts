// src/data/locationsData.ts

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

// Базовый мок-лист локаций — просто для фронтового UI.
// В дальнейшем можно будет заменить на реальные данные из API.
export const initialLocations: Location[] = [
  {
    id: "1",
    name: "Marina Tower Residence",
    address: "Tower 23, Dubai Marina\nDubai, UAE",
    latitude: 25.0805,
    longitude: 55.1403,
    createdAt: "2024-01-05T00:00:00+04:00",
  },
  {
    id: "2",
    name: "Business Bay Executive Office",
    address: "Bay Square, Building 1\nBusiness Bay, Dubai, UAE",
    latitude: 25.1865,
    longitude: 55.2622,
    createdAt: "2024-01-08T00:00:00+04:00",
  },
  {
    id: "3",
    name: "Downtown Dubai Apartment",
    address: "Boulevard Point Tower A\nDowntown Dubai, UAE",
    latitude: 25.1972,
    longitude: 55.2744,
    createdAt: "2024-01-10T00:00:00+04:00",
  },
  {
    id: "4",
    name: "JBR Beach Residence",
    address: "Sadaf 7, Jumeirah Beach Residence\nDubai, UAE",
    latitude: 25.0772,
    longitude: 55.1331,
    createdAt: "2024-01-12T00:00:00+04:00",
  },
  {
    id: "5",
    name: "DIFC Corporate Suite",
    address: "Gate Building, Level 15\nDIFC, Dubai, UAE",
    latitude: 25.2133,
    longitude: 55.281,
    createdAt: "2024-01-14T00:00:00+04:00",
  },
];

// alias, если кто-то импортирует "locations" напрямую
export const locations = initialLocations;
