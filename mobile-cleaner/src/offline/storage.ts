// mobile-cleaner/src/offline/storage.ts

// OFFLINE STORAGE (v0)
// ------------------------------------------
// Здесь только generic-хелперы кэширования и dev-GPS.
// Оффлайн-очередь (outbox) здесь НЕ реализуем.
// Для модели очереди см. src/offline/types.ts.
// Любая "умная" оффлайн-логика делается отдельной фазой
// после согласования с backend.

import AsyncStorage from "@react-native-async-storage/async-storage";

const key = (jobId: number, part: string) => `job:${jobId}:${part}`;

// =======================
// Generic cache helpers
// =======================

export async function cacheSetJSON(
  jobId: number,
  part: string,
  value: any
) {
  const payload = JSON.stringify({
    savedAt: Date.now(),
    value,
  });

  await AsyncStorage.setItem(key(jobId, part), payload);
}

export async function cacheGetJSON<T>(
  jobId: number,
  part: string
): Promise<{ savedAt: number; value: T } | null> {
  const raw = await AsyncStorage.getItem(key(jobId, part));
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function cacheRemove(jobId: number, part: string) {
  await AsyncStorage.removeItem(key(jobId, part));
}

// ==================================================
// Dev GPS payload (используется в Check-in / Check-out)
// ==================================================

export type DevGpsPayload = {
  latitude: number;
  longitude: number;
};

/**
 * Временный GPS-пейлоад для разработки.
 * Используется вместо реального GPS.
 * Координаты — район Дубая.
 */
export function getDevGpsPayload(): DevGpsPayload {
  return {
    latitude: 25.0800,
    longitude: 55.1400,
  };
}
