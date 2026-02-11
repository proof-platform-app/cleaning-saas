// mobile-cleaner/src/screens/JobDetailsScreen.tsx
import React from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import NetInfo from "@react-native-community/netinfo";

import {
  fetchJobDetail,
  fetchJobPhotos,
  uploadJobPhoto,
  checkInJob,
  checkOutJob,
  updateJobChecklistBulk,
  toggleJobChecklistItem,
  fetchJobReportPdf,
  JobChecklistItem,
} from "../api/client";

// helpers
import {
  computeChecklistState,
  deriveJobProgress,
  normalizeAndSortEvents,
} from "./jobDetails.helpers";

import getGpsPayload from "../utils/gps";

// status config (лежит в src/, не в components)
import { getStatusConfig } from "../components/job-details/statusConfig";

// job details blocks
import LocationBlock from "../components/job-details/LocationBlock";
import JobProgressBlock from "../components/job-details/JobProgressBlock";
import JobTimelineSection from "../components/job-details/JobTimelineSection";
import JobPhotosBlock from "../components/job-details/JobPhotosBlock";
import ChecklistSection from "../components/job-details/ChecklistSection";
import JobActionsSection from "../components/job-details/JobActionsSection";

import type { OutboxItem } from "../offline/types";

/**
 * JobDetailsScreen — Mobile Execution Core (Layer 1)
 *
 * Этот экран замыкает основной цикл клинера:
 * Login → Today Jobs → Job Details → Check-in → Photos → Checklist → Check-out → PDF.
 *
 * ВАЖНО:
 * - Любое изменение здесь может сломать:
 *   - GPS-валидацию,
 *   - проверку чек-листа,
 *   - PDF-отчёты,
 *   - Manager Portal (Job Details).
 * - Перед изменениями логики смотри:
 *   - backend/apps/api (jobs, photos, pdf),
 *   - Manager Portal Job Details,
 *   - PDF-репорт.
 *
 * Разрешено:
 * - косметические правки UI (тексты, отступы),
 * - небольшие комментарии и логи без изменения порядка действий.
 *
 * НЕЛЬЗЯ:
 * - менять порядок шагов,
 * - переупаковывать payload’ы API,
 * - "упрощать" хендлеры без полного E2E-ревью.
 */

const COLORS = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  primary: "#0F766E",
  primarySoft: "#ECFDF3",
  warningBg: "#FFF4E5",
  warningBorder: "#FCD9A6",
  warningText: "#9A5B00",
  textMain: "#111827",
  textMuted: "#6B7280",
  textSoft: "#9CA3AF",
  success: "#059669",
};

type RawJob = any;

type JobDetailsScreenProps = {
  route: {
    params: {
      jobId: number;
    };
  };
};

function parseCoordinate(value: any): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return null;

    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

export default function JobDetailsScreen({ route }: JobDetailsScreenProps) {
  const { jobId } = route.params;

  const [job, setJob] = React.useState<RawJob | null>(null);
  const [photos, setPhotos] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const [uploadingType, setUploadingType] = React.useState<
    "before" | "after" | null
  >(null);

  const [isOnline, setIsOnline] = React.useState<boolean | null>(null);

  const [checklist, setChecklist] = React.useState<JobChecklistItem[]>([]);
  const [isChecklistSaving, setIsChecklistSaving] = React.useState(false);
  const [savingItemId, setSavingItemId] = React.useState<number | null>(null);
  const [checklistError, setChecklistError] = React.useState<string | null>(
    null
  );

  const [isSyncing, setIsSyncing] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0); // B-3: manual retry trigger

  // ------------------------------------------
  // OFFLINE MODEL v0 (архитектура, не реализация)
  // ------------------------------------------
  //
  // Что сейчас считаем оффлайн-безопасным:
  // - checklist_bulk: синхронизация чек-листа;
  // - photo: загрузка before/after фото.
  //
  // Чего здесь НЕТ и не будет без отдельной фазы:
  // - check-in / check-out (онлайн-только);
  // - генерация PDF отчёта;
  // - первичная загрузка job / списка задач.
  //
  // Реальная очередь сейчас НЕ реализована:
  // - ожидаем, что (global as any).outboxPeek / outboxShift
  //   могут быть провайднуты где-то ещё;
  // - если их нет, flushOutbox просто ничего не делает.
  //
  // ВАЖНО:
  // - Не добавлять новые type'ы в outbox, пока не
  //   согласуем это с backend / бизнес-логикой.
  // - Не менять формат payload без апдейта типов
  //   в src/offline/types.ts.
  const flushOutbox = React.useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      while (true) {
        const item = (await (global as any).outboxPeek?.()) as OutboxItem | null;
        if (!item) break;

        // B-6: isolate each item — a single failure does not abort the rest
        try {
          if (item.type === "checklist_bulk") {
            await updateJobChecklistBulk(item.jobId, item.payload);
          } else if (item.type === "photo") {
            await uploadJobPhoto(item.jobId, item.photoType, item.localUri);
          }
        } catch (itemErr) {
          if (__DEV__) {
            console.warn("[flushOutbox] item failed, skipping:", item.type, itemErr);
          }
        }

        // Always shift (success or failure) to advance past this item
        await (global as any).outboxShift?.();
      }

      const [jobData, photosData] = await Promise.all([
        fetchJobDetail(jobId),
        fetchJobPhotos(jobId),
      ]);

      setJob(jobData);
      setPhotos(photosData ?? []);
      setChecklist(jobData?.checklist_items ?? []);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, jobId]);

  React.useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
      if (online) void flushOutbox();
    });

    return () => unsub();
  }, [flushOutbox]);

  React.useEffect(() => {
    if (isOnline === null) return;

    let cancelled = false;

    const load = async () => {
      if (!isOnline) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const [jobData, photosData] = await Promise.all([
          fetchJobDetail(jobId),
          fetchJobPhotos(jobId),
        ]);

        if (!cancelled) {
          setJob(jobData);
          setPhotos(photosData ?? []);
          setChecklist(jobData?.checklist_items ?? []);
        }
      } catch (e: any) {
        if (!cancelled) {
          Alert.alert("Error", e?.message || "Failed to load job details");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [jobId, isOnline, retryCount]);

  React.useEffect(() => {
    if (job) {
      setChecklist(job.checklist_items ?? []);
    }
  }, [job?.id, job?.status]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>
          {isOnline === false
            ? "You are offline. Job details are unavailable."
            : "Failed to load job details."}
        </Text>
        {/* B-3: retry button — re-triggers the load effect without altering its logic */}
        <Pressable
          onPress={() => {
            setLoading(true);
            setRetryCount((c) => c + 1);
          }}
          style={styles.retryBtn}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const locationName =
    job.location?.name ?? job.location_name ?? "Unknown location";

  const locationAddress =
    job.location?.address ?? job.location_address ?? locationName;

  const rawLat =
    job.location?.latitude ?? job.location_latitude ?? job.location_lat ?? null;
  const rawLng =
    job.location?.longitude ??
    job.location_longitude ??
    job.location_lng ??
    null;

  const locationLat = parseCoordinate(rawLat);
  const locationLng = parseCoordinate(rawLng);

  const hasLocationCoords =
    typeof locationLat === "number" && typeof locationLng === "number";

  const status = job.status ?? "scheduled";
  const isScheduled = status === "scheduled";
  const isInProgress = status === "in_progress";
  const isCompleted = status === "completed";

  const statusCfg = getStatusConfig(status);

  const timelineEvents = normalizeAndSortEvents(job.check_events ?? []);

  const beforePhoto = photos.find((p) => p.photo_type === "before") || null;
  const afterPhoto = photos.find((p) => p.photo_type === "after") || null;

  const beforeUrl: string | null =
    (beforePhoto?.file_url as string | undefined) ??
    (beforePhoto?.url as string | undefined) ??
    null;

  const afterUrl: string | null =
    (afterPhoto?.file_url as string | undefined) ??
    (afterPhoto?.url as string | undefined) ??
    null;

  const checklistState = computeChecklistState(checklist);

  const progress = deriveJobProgress({
    status,
    timelineEvents,
    beforePhoto,
    afterPhoto,
    checklistState,
  });

  const isOnlineBool = isOnline === true;

  // NOTE (offline design):
  // Checklist and photo actions are offline-capable by design.
  // Check-in / check-out are strictly online-only and must never be queued.
  // ----- Handlers: Check-in / Check-out -----

  /**
   * handleCheckIn
   *
   * Точка входа в check-in:
   * - клинер должен быть на статусе scheduled,
   * - координаты берутся из getGpsPayload,
   * - после вызова обязательно refetch job + photos + checklist.
   *
   * НЕЛЬЗЯ:
   * - вызывать checkInJob без GPS,
   * - менять порядок "API → refetch" без проверки Manager Portal / PDF,
   * - дописывать сюда лишние ветки/ретраи "для надёжности".
   */
  const handleCheckIn = async () => {
    if (!isScheduled) {
      Alert.alert(
        "Check-in failed",
        "Check-in allowed only for scheduled jobs."
      );
      return;
    }

    if (!isOnlineBool) {
      Alert.alert("Offline", "You need internet to check in.");
      return;
    }

    setSubmitting(true);
    try {
      const { latitude, longitude } = await getGpsPayload({
        jobLatitude: locationLat,
        jobLongitude: locationLng,
      });

      await checkInJob(jobId, latitude, longitude);

      const [jobData, photosData] = await Promise.all([
        fetchJobDetail(jobId),
        fetchJobPhotos(jobId),
      ]);

      setJob(jobData);
      setPhotos(photosData ?? []);
      setChecklist(jobData?.checklist_items ?? []);
    } catch (e) {
      if (e instanceof Error && e.message === "GPS_UNAVAILABLE") {
        Alert.alert(
          "Location unavailable",
          "Could not get your GPS location. Please enable location access and try again."
        );
        return;
      }

      Alert.alert(
        "Check-in failed",
        e instanceof Error ? e.message : "Check-in request failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * handleCheckOut
   *
   * Финализирует job:
   * - разрешён только для in_progress,
   * - завязан на проверку чек-листа и фото на backend,
   * - меняет статус на completed и влияет на PDF-отчёт.
   *
   * НЕЛЬЗЯ:
   * - вызывать checkOutJob без GPS,
   * - вызывать, если доказательная база неполная (обходить guards),
   * - менять формат вызова без ревью backend и Manager Portal.
   */
  const handleCheckOut = async () => {
    if (!isInProgress) {
      Alert.alert(
        "Check-out failed",
        "Check-out allowed only for in_progress jobs."
      );
      return;
    }

    if (!isOnlineBool) {
      Alert.alert("Offline", "You need internet to check out.");
      return;
    }

    setSubmitting(true);
    try {
      const { latitude, longitude } = await getGpsPayload({
        jobLatitude: locationLat,
        jobLongitude: locationLng,
      });

      await checkOutJob(jobId, latitude, longitude);

      const [jobData, photosData] = await Promise.all([
        fetchJobDetail(jobId),
        fetchJobPhotos(jobId),
      ]);

      setJob(jobData);
      setPhotos(photosData ?? []);
      setChecklist(jobData?.checklist_items ?? []);
    } catch (e) {
      if (e instanceof Error && e.message === "GPS_UNAVAILABLE") {
        Alert.alert(
          "Location unavailable",
          "Could not get your GPS location. Please enable location access and try again."
        );
        return;
      }

      Alert.alert(
        "Check-out failed",
        e instanceof Error ? e.message : "Check-out request failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm-обёртки для защиты от случайных тапов

  /**
   * Confirm-обёртки не меняют бизнес-логику,
   * только спрашивают подтверждение перед "настоящим" действием.
   *
   * Если нужно менять UI текста — можно.
   * Логику (какой хендлер вызывается и когда) — НЕ трогать.
   */
  const handleCheckInConfirm = () => {
    Alert.alert("Check in", "Start this job now?", [
      { text: "Cancel", style: "cancel" },
      { text: "Check in", style: "default", onPress: () => void handleCheckIn() },
    ]);
  };

  const handleCheckOutConfirm = () => {
    Alert.alert(
      "Check out",
      "Finish this job and lock photos and checklist?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Check out", style: "destructive", onPress: () => void handleCheckOut() },
      ]
    );
  };

  // ----- Handler: Share PDF report -----

  /**
   * handleSharePdf
   *
   * Связка:
   * - fetchJobReportPdf (backend генерирует PDF),
   * - временное сохранение в файловую систему,
   * - системный share sheet.
   *
   * НЕЛЬЗЯ:
   * - менять тип возвращаемых данных из fetchJobReportPdf,
   * - подмешивать сюда другие API-вызовы отчётов,
   * - завязывать сюда какую-либо бизнес-валидацию (это только транспорт).
   */
  const handleSharePdf = async () => {
    if (!isOnlineBool) {
      Alert.alert("Offline", "You need internet to generate PDF report.");
      return;
    }

    try {
      setSubmitting(true);

      const buf = await fetchJobReportPdf(jobId);
      const base64 = arrayBufferToBase64(buf);

      const cacheDir =
        ((FileSystem as any).cacheDirectory as string | undefined) ||
        ((FileSystem as any).documentDirectory as string | undefined) ||
        "";

      const fileUri = `${cacheDir}job-${jobId}-report.pdf`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: "base64" as any,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Not available", "Sharing is not available on this device.");
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "application/pdf",
        dialogTitle: `Job #${jobId} report`,
        UTI: "com.adobe.pdf",
      });
    } catch (e: any) {
      Alert.alert("PDF failed", e?.message || "Failed to generate PDF");
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Навигация -----

  /**
   * handleNavigate
   *
   * Открывает внешнюю карту:
   * - iOS → Apple Maps,
   * - Android → Google Maps,
   * - fallback → web Google Maps.
   *
   * Важно:
   * - Не подтягивать сюда GPS устройства, тут используются координаты задачи.
   * - При отсутствии координат просто ничего не делаем.
   */
  const handleNavigate = async () => {
    if (!hasLocationCoords || !locationLat || !locationLng) return;

    const latLng = `${locationLat},${locationLng}`;
    const label = encodeURIComponent(locationName);

    const iosUrl = `maps://?q=${label}&ll=${latLng}`;
    const androidUrl = `google.navigation:q=${latLng}`;
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${latLng}`;

    try {
      if (Platform.OS === "ios" && (await Linking.canOpenURL(iosUrl))) {
        await Linking.openURL(iosUrl);
        return;
      }

      if (
        Platform.OS === "android" &&
        (await Linking.canOpenURL(androidUrl))
      ) {
        await Linking.openURL(androidUrl);
        return;
      }

      await Linking.openURL(webUrl);
    } catch {
      Alert.alert("Navigation error", "Could not open maps.");
    }
  };

  // ----- Фото -----

  /**
   * handleTakePhoto
   *
   * Фото-флоу:
   * - запрашиваем разрешение камеры,
   * - открываем камеру,
   * - берём первый asset.uri,
   * - отправляем в uploadJobPhoto(jobId, photoType, uri),
   * - потом refetch job + photos + checklist.
   *
   * НЕЛЬЗЯ:
   * - вызывать uploadJobPhoto без uri,
   * - менять тип photoType (строго "before" | "after"),
   * - подмешивать сюда FormData/headers — это уровень api/client.ts.
   */
  const handleTakePhoto = async (photoType: "before" | "after") => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Camera access", "Camera permission is required to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"] as any, // новый API: 'images' / 'videos' / 'livePhotos'
        quality: 0.7,
      });

      if ((result as any).canceled) {
        return;
      }

      const asset = (result as any).assets?.[0];
      if (!asset?.uri) {
        return;
      }

      // B-2: cache URI before upload so retry can reuse it without reopening camera
      const cachedUri = asset.uri;

      // Spinner starts only after we have a valid asset — permission check and camera
      // cancellation no longer trigger the upload indicator.
      setUploadingType(photoType);

      // B-2: upload + refresh as a named function so retry can call it again
      const doUploadAndRefresh = async () => {
        await uploadJobPhoto(jobId, photoType, cachedUri);
        const [jobData, photosData] = await Promise.all([
          fetchJobDetail(jobId),
          fetchJobPhotos(jobId),
        ]);
        setJob(jobData);
        setPhotos(photosData ?? []);
        setChecklist(jobData?.checklist_items ?? []);
      };

      try {
        await doUploadAndRefresh();
      } catch (uploadErr: any) {
        // B-2: offer retry on upload failure (camera already closed, URI cached)
        Alert.alert(
          "Photo upload failed",
          uploadErr?.message || "Failed to upload photo.",
          [
            {
              text: "Try again",
              onPress: () => {
                setUploadingType(photoType);
                void doUploadAndRefresh().finally(() => setUploadingType(null));
              },
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
      }
    } catch (e: any) {
      Alert.alert(
        "Camera error",
        e?.message || "Calling the camera failed. Please try again."
      );
    } finally {
      setUploadingType(null);
    }
  };

  const canCheckInVisible = isScheduled === true;
  const canCheckIn = isScheduled === true && isOnlineBool;

  const canCheckOutVisible = isInProgress === true;
  const canCheckOut =
    isInProgress === true &&
    !!progress.beforePhoto &&
    !!progress.afterPhoto &&
    !!progress.checklist &&
    isOnlineBool;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{locationName}</Text>
            <Text style={styles.subtitle}>
              Date: {job.scheduled_date ?? "—"}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: statusCfg.badgeBg },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  { color: statusCfg.badgeText },
                ]}
              >
                {statusCfg.label}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* B-5: show syncing indicator regardless of online status (e.g. after reconnect) */}
      {isSyncing && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>Syncing offline changes...</Text>
        </View>
      )}

      {isOnline === false && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            You are offline. Some actions are disabled.
          </Text>
          {isSyncing && (
            <Text style={styles.offlineBannerText}>
              Syncing offline changes...
            </Text>
          )}
        </View>
      )}

      {/* Location */}
      <LocationBlock
        address={locationAddress}
        canNavigate={hasLocationCoords}
        onNavigate={hasLocationCoords ? handleNavigate : undefined}
      />

      {/* Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress</Text>
        <JobProgressBlock
          status={status}
          hasBeforePhoto={!!beforePhoto}
          hasAfterPhoto={!!afterPhoto}
          checklistCompleted={checklistState.checklistOk}
        />
      </View>

      {/* Timeline */}
      <JobTimelineSection events={timelineEvents} />

      {/* Photos */}
      <JobPhotosBlock
        isInProgress={isInProgress}
        beforeUrl={beforeUrl}
        afterUrl={afterUrl}
        hasBeforePhoto={!!beforePhoto}
        hasAfterPhoto={!!afterPhoto}
        canTakeBeforePhoto={isInProgress && !beforePhoto}
        canTakeAfterPhoto={isInProgress && !!beforePhoto && !afterPhoto}
        isUploadingBefore={uploadingType === "before"}
        isUploadingAfter={uploadingType === "after"}
        submitting={submitting}
        onTakeBefore={() => handleTakePhoto("before")}
        onTakeAfter={() => handleTakePhoto("after")}
      />

      {/* Checklist */}
      <ChecklistSection
        items={checklist}
        canEditChecklist={isInProgress}
        isInProgress={isInProgress}
        isOnline={isOnline}
        checklistState={checklistState}
        checklistError={checklistError}
        isChecklistSaving={isChecklistSaving}
        savingItemId={savingItemId}
        submitting={submitting}
        onToggleItem={async (itemId: number, nextValue: boolean) => {
          /**
           * Checklist inline handler
           *
           * Важно:
           * - UI вызывает только toggleJobChecklistItem,
           * - после изменения чек-листа всегда refetch всего job,
           *   чтобы не разойтись с backend-валидацией required-пунктов.
           *
           * НЕЛЬЗЯ:
           * - пытаться "кэшировать" локально и не дергать backend,
           * - менять структуру payload без синхронизации с backend.
           */
          // A-4: ignore concurrent taps while any item save is in flight
          if (savingItemId !== null) return;

          try {
            setSavingItemId(itemId);
            setIsChecklistSaving(true); // A-5: mark bulk-save state
            setChecklistError(null);
            await toggleJobChecklistItem(jobId, itemId, nextValue);
            const jobData = await fetchJobDetail(jobId);
            setJob(jobData);
            setChecklist(jobData?.checklist_items ?? []);
          } catch (e: any) {
            setChecklistError(e?.message || "Failed to update checklist item");
          } finally {
            setSavingItemId(null);
            setIsChecklistSaving(false); // A-5
          }
        }}
      />

      {/* Actions */}
      <JobActionsSection
        isOnline={isOnlineBool}
        isScheduled={isScheduled === true}
        isInProgress={isInProgress === true}
        isCompleted={isCompleted === true}
        canCheckInVisible={canCheckInVisible}
        canCheckIn={canCheckIn}
        canCheckOutVisible={canCheckOutVisible}
        canCheckOut={canCheckOut}
        submitting={!!submitting}
        beforePhoto={beforePhoto}
        afterPhoto={afterPhoto}
        checklistState={{
          hasRequired: checklistState.hasRequired,
          requiredCompleted: checklistState.requiredCompleted,
        }}
        onCheckIn={handleCheckInConfirm}
        onCheckOut={handleCheckOutConfirm}
        onSharePdf={handleSharePdf}
      />
    </ScrollView>
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  // @ts-ignore
  const btoaFn = globalThis.btoa || (global as any).btoa;

  if (!btoaFn) {
    // @ts-ignore
    return Buffer.from(binary, "binary").toString("base64");
  }

  return btoaFn(binary);
}

// ----- styles -----

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#555",
  },
  header: {
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRight: {
    marginLeft: 12,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
    color: COLORS.textMain,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  statusPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 14,
    fontWeight: "600",
  },
  offlineBanner: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.warningBg,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
  },
  offlineBannerText: {
    fontSize: 13,
    color: COLORS.warningText,
  },
  section: {
    marginTop: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: COLORS.textMain,
  },
  // B-3: retry button in empty state
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
