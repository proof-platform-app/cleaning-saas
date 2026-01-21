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

import {
  computeChecklistState,
  deriveJobProgress,
  normalizeAndSortEvents,
} from "./jobDetails.helpers";

import { getStatusConfig } from "../components/job-details/statusConfig";
import JobProgressBlock from "../components/job-details/JobProgressBlock";
import JobPhotosBlock from "../components/job-details/JobPhotosBlock";
import ChecklistSection from "../components/job-details/ChecklistSection";
import JobActionsSection from "../components/job-details/JobActionsSection";
import JobTimelineSection from "../components/job-details/JobTimelineSection";
import LocationBlock from "../components/job-details/LocationBlock";

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

  const flushOutbox = React.useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      while (true) {
        const item: any = await (global as any).outboxPeek?.();
        if (!item) break;

        if (item.type === "checklist_bulk") {
          await updateJobChecklistBulk(item.jobId, item.payload);
        } else if (item.type === "photo") {
          await uploadJobPhoto(item.jobId, item.photoType, item.localUri);
        }

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
  }, [jobId, isOnline]);

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

  // Дев-helper: для чек-ина/аута всегда шлём координаты задачи
  const getDevGpsPayload = () => {
    if (hasLocationCoords && locationLat != null && locationLng != null) {
      return {
        latitude: locationLat,
        longitude: locationLng,
      };
    }

    // запасной вариант, если у задачи нет координат
    return {
      latitude: 25.08,
      longitude: 55.14,
    };
  };

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

  // ----- Handlers: Check-in / Check-out -----

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
      const { latitude, longitude } = getDevGpsPayload();
      await checkInJob(jobId, latitude, longitude);

      const [jobData, photosData] = await Promise.all([
        fetchJobDetail(jobId),
        fetchJobPhotos(jobId),
      ]);

      setJob(jobData);
      setPhotos(photosData ?? []);
      setChecklist(jobData?.checklist_items ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Check-in request failed";
      Alert.alert("Check-in failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

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
      const { latitude, longitude } = getDevGpsPayload();
      await checkOutJob(jobId, latitude, longitude);

      const [jobData, photosData] = await Promise.all([
        fetchJobDetail(jobId),
        fetchJobPhotos(jobId),
      ]);

      setJob(jobData);
      setPhotos(photosData ?? []);
      setChecklist(jobData?.checklist_items ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Check-out request failed";
      Alert.alert("Check-out failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm-обёртки для защиты от случайных тапов
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

  const handleTakePhoto = async (photoType: "before" | "after") => {
    try {
      setUploadingType(photoType);

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

      await uploadJobPhoto(jobId, photoType, asset.uri);

      const [jobData, photosData] = await Promise.all([
        fetchJobDetail(jobId),
        fetchJobPhotos(jobId),
      ]);
      setJob(jobData);
      setPhotos(photosData ?? []);
      setChecklist(jobData?.checklist_items ?? []);
    } catch (e: any) {
      Alert.alert(
        "Photo upload failed",
        e?.message ||
          "Calling the camera failed. Please try again."
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
        onToggleItem={async (itemId, nextValue) => {
          // оставляю простой вариант — как было до рефактора
          try {
            setSavingItemId(itemId);
            setChecklistError(null);
            await toggleJobChecklistItem(jobId, itemId, nextValue);
            const jobData = await fetchJobDetail(jobId);
            setJob(jobData);
            setChecklist(jobData?.checklist_items ?? []);
          } catch (e: any) {
            setChecklistError(e?.message || "Failed to update checklist item");
          } finally {
            setSavingItemId(null);
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
});
