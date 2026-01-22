import { Alert } from "react-native";
import * as Location from "expo-location";

// ⚠️ DEV-режим: форсим координаты job только в дев-сборке (Expo Go).
// В продакшн-билде (__DEV__ = false) всегда используется реальный GPS устройства.
const DEV_FORCE_JOB_COORDS = __DEV__ === true;


/**
 * getGpsPayload
 *
 * Production GPS wrapper.
 * НЕЛЬЗЯ:
 * - менять формат { latitude, longitude }
 * - инлайнить эту логику в экраны
 */
export default async function getGpsPayload(params: {
  jobLatitude: number | null;
  jobLongitude: number | null;
}): Promise<{ latitude: number; longitude: number }> {
  const { jobLatitude, jobLongitude } = params;

  // --- 1) Чистый DEV-режим: всегда шлём координаты job ---
  if (
    DEV_FORCE_JOB_COORDS &&
    typeof jobLatitude === "number" &&
    Number.isFinite(jobLatitude) &&
    typeof jobLongitude === "number" &&
    Number.isFinite(jobLongitude)
  ) {
    console.log("[getGpsPayload] DEV_FORCE_JOB_COORDS → using job coords");
    return {
      latitude: jobLatitude,
      longitude: jobLongitude,
    };
  }

  // --- 2) Нормальный PROD-путь: читаем координаты устройства ---
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      throw new Error("Location permission not granted");
    }

    const pos = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = pos.coords || {};

    if (
      typeof latitude === "number" &&
      Number.isFinite(latitude) &&
      typeof longitude === "number" &&
      Number.isFinite(longitude)
    ) {
      return { latitude, longitude };
    }

    throw new Error("Invalid device location");
  } catch (e) {
    console.log("[getGpsPayload] fallback to job coords after error:", e);

    if (
      typeof jobLatitude === "number" &&
      Number.isFinite(jobLatitude) &&
      typeof jobLongitude === "number" &&
      Number.isFinite(jobLongitude)
    ) {
      Alert.alert(
        "Location fallback",
        "Using job location because device location is unavailable."
      );
      return {
        latitude: jobLatitude,
        longitude: jobLongitude,
      };
    }

    Alert.alert(
      "Location error",
      "Could not determine your location. Please check location permissions."
    );

    throw new Error("GPS_UNAVAILABLE");
  }
}
