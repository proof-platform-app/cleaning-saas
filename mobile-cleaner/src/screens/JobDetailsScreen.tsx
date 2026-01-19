// mobile-cleaner/src/screens/JobDetailsScreen.tsx

import React from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
  Alert,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import {
  fetchJobDetail,
  fetchJobPhotos,
  uploadJobPhoto,
  checkInJob,
  checkOutJob,
  updateJobChecklistBulk,
  toggleJobChecklistItem, // fallback
  fetchJobReportPdf,
  JobChecklistItem,
} from "../api/client";

type RawJob = any;

type JobDetailsScreenProps = {
  route: {
    params: {
      jobId: number;
    };
  };
};

function formatDateTime(value: string) {
  const d = new Date(value);
  return d.toLocaleString();
}

export default function JobDetailsScreen({ route }: JobDetailsScreenProps) {
  const { jobId } = route.params;

  const [job, setJob] = React.useState<RawJob | null>(null);
  const [photos, setPhotos] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  // Phase 10: локальный стейт чеклиста
  const [checklist, setChecklist] = React.useState<JobChecklistItem[]>([]);
  const [isChecklistSaving, setIsChecklistSaving] = React.useState(false);
  const [savingItemId, setSavingItemId] = React.useState<number | null>(null);
  const [checklistError, setChecklistError] = React.useState<string | null>(
    null
  );

  // ----- загрузка job + photos -----
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
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
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to load job details";
        if (!cancelled) {
          Alert.alert("Error", msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // если job обновился (например, check-in/out), подтянем чеклист в локальный стейт
  React.useEffect(() => {
    if (!job) return;
    setChecklist(job.checklist_items ?? []);
  }, [job?.id, job?.status]);

  if (loading || !job) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  // ----- нормализация данных из backend -----

  const locationName: string = job.location_name ?? "Unknown location";

  const handleNavigate = async () => {
    try {
      const query = encodeURIComponent(locationName || "Job location");

      const url =
        Platform.OS === "ios"
          ? `maps:0,0?q=${query}`
          : `https://www.google.com/maps/search/?api=1&query=${query}`;

      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert("Navigation", "Cannot open maps on this device.");
        return;
      }

      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert(
        "Navigation",
        e?.message || "Failed to open maps application."
      );
    }
  };

  const status: string = job.status ?? "scheduled";
  const isScheduled = status === "scheduled";
  const isInProgress = status === "in_progress";
  const isCompleted = status === "completed";

  const canEditChecklist = isInProgress;

  const timelineEvents = normalizeAndSortEvents(job.check_events ?? []);

  const beforePhoto = photos.find((p) => p.photo_type === "before") || null;
  const afterPhoto = photos.find((p) => p.photo_type === "after") || null;

  const actualStart: string | null = job.actual_start_time ?? null;
  const actualEnd: string | null = job.actual_end_time ?? null;

  // состояние чеклиста считается один раз и переиспользуется
  const checklistState = computeChecklistState(checklist);

  // Прогресс чеклиста для подсказок в UI
  const checklistDone = checklistState.allCompleted;
  const checklistOk = checklistState.checklistOk;

  // Единый источник истины для Progress
  const progress = deriveJobProgress({
    status,
    timelineEvents,
    beforePhoto,
    afterPhoto,
    checklistState,
  });

  // dev-GPS: фиксированная точка возле Dubai Marina
  const getDevGpsPayload = () => ({
    latitude: 25.0763,
    longitude: 55.1345,
  });

  // ----- Handlers: Check-in / Check-out -----

  const handleCheckIn = async () => {
    if (!isScheduled) {
      Alert.alert(
        "Check-in failed",
        "Check-in allowed only for scheduled jobs."
      );
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

  // ----- Handlers: Checklist (Phase 10, bulk + fallback toggle) -----

  const handleToggleChecklistItem = async (itemId: number) => {
    if (!canEditChecklist) {
      Alert.alert(
        "Not allowed",
        "Checklist can be updated only when job is in progress."
      );
      return;
    }

    if (isChecklistSaving || submitting) return;

    setChecklistError(null);
    setSavingItemId(itemId);

    const prev = checklist;

    // optimistic update
    const next = checklist.map((it) =>
      it.id === itemId ? { ...it, is_completed: !it.is_completed } : it
    );
    setChecklist(next);

    setIsChecklistSaving(true);

    try {
      const payloadItems = next.map((it) => ({
        id: it.id,
        is_completed: it.is_completed,
      }));

      const updated = await updateJobChecklistBulk(jobId, payloadItems);

      if (Array.isArray(updated) && updated.length > 0) {
        setChecklist(updated);
      }
    } catch (e: any) {
      const baseMsg = e instanceof Error ? e.message : "Checklist update failed";

      const shouldTryFallback =
        typeof e?.status === "number" && e.status >= 400 && e.status < 500;

      if (shouldTryFallback) {
        try {
          const current = next.find((it) => it.id === itemId);
          const isCompleted = !!current?.is_completed;

          const toggled = await toggleJobChecklistItem(
            jobId,
            itemId,
            isCompleted
          );

          setChecklist((list) =>
            list.map((it) =>
              it.id === toggled.id
                ? { ...it, is_completed: toggled.is_completed }
                : it
            )
          );
        } catch (fallbackErr: any) {
          setChecklist(prev);
          setChecklistError(
            fallbackErr instanceof Error ? fallbackErr.message : baseMsg
          );
        }
      } else {
        setChecklist(prev);
        setChecklistError(baseMsg);
      }
    } finally {
      setIsChecklistSaving(false);
      setSavingItemId(null);
    }
  };

  // ----- Handlers: Photos upload -----

  const pickAndUpload = async (type: "before" | "after") => {
    if (!isInProgress) {
      Alert.alert(
        "Not allowed",
        "Photos can be uploaded only while job is in progress."
      );
      return;
    }

    if (type === "after" && !beforePhoto) {
      Alert.alert("Not allowed", "Upload the before photo first.");
      return;
    }

    try {
      // 1) Права на галерею
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Permission to access photos was denied."
        );
        return;
      }

      // 2) Выбор фото
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];

      if (!asset?.uri) {
        Alert.alert("Upload failed", "No image selected.");
        return;
      }

      setSubmitting(true);

      // 3) Вызов нашего API-обёртки
      await uploadJobPhoto(jobId, type, asset.uri);

      // 4) Обновляем фотки в UI
      const refreshed = await fetchJobPhotos(jobId);
      setPhotos(refreshed ?? []);
    } catch (e: any) {
      const msg =
        e instanceof Error ? e.message : "Photo upload request failed";
      console.error("[JobDetails] photo upload error:", msg);
      Alert.alert("Upload failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Handler: Share PDF report -----

  const handleSharePdf = async () => {
    try {
      setSubmitting(true);

      const buf = await fetchJobReportPdf(jobId);
      const base64 = arrayBufferToBase64(buf);

      // cacheDirectory в тайпингах может не быть, поэтому берём через any
      const cacheDir =
        ((FileSystem as any).cacheDirectory as string | undefined) ||
        ((FileSystem as any).documentDirectory as string | undefined) ||
        "";

      const fileUri = `${cacheDir}job-${jobId}-report.pdf`;

      // тут тоже плюём на тайпинги и шлём encoding как any
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

  // ----- derived flags для UI -----

  const canCheckIn = isScheduled;
  const canCheckOut =
    isInProgress &&
    progress.beforePhoto &&
    progress.afterPhoto &&
    progress.checklist;

  // ----- Render -----

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{locationName}</Text>
        <Text style={styles.subtitle}>Date: {job.scheduled_date}</Text>
        <Text style={styles.status}>Status: {status}</Text>
      </View>

      {/* Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>

        <Text style={styles.sectionText}>{locationName}</Text>

        <View style={{ marginTop: 8 }}>
          <Button
            title="Navigate"
            onPress={handleNavigate}
            disabled={submitting}
          />
        </View>
      </View>

      {/* Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress</Text>

        <Text style={styles.progressItem}>
          {progress.scheduled ? "✓" : "—"} Scheduled
        </Text>

        <Text style={styles.progressItem}>
          {progress.checkIn ? "✓" : "—"} Check-in
        </Text>

        <Text style={styles.progressItem}>
          {progress.beforePhoto ? "✓" : "—"} Before photo
        </Text>

        <Text style={styles.progressItem}>
          {progress.checklist ? "✓" : "—"} Checklist
        </Text>

        <Text style={styles.progressItem}>
          {progress.afterPhoto ? "✓" : "—"} After photo
        </Text>

        <Text style={styles.progressItem}>
          {progress.checkOut ? "✓" : "—"} Check-out
        </Text>
      </View>

      {/* Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        {timelineEvents.length === 0 ? (
          <Text style={styles.placeholder}>No events yet.</Text>
        ) : (
          timelineEvents.map((e) => (
            <View key={e.id} style={styles.timelineRow}>
              <Text style={styles.timelineMain}>
                {e.label} — {formatTime(e.createdAt)}
              </Text>
              <Text style={styles.timelineMeta}>
                {e.userName ? `${e.userName} • ` : ""}
                {typeof e.distanceM === "number" ? `${e.distanceM} m` : ""}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Photos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos</Text>

        <View style={styles.photoRow}>
          <View style={styles.photoSlot}>
            <Text style={styles.photoLabel}>Before</Text>

            {beforePhoto ? (
              <Text style={styles.sectionText}>Photo uploaded</Text>
            ) : (
              <Text style={styles.placeholder}>No photo yet.</Text>
            )}

            {isInProgress && !beforePhoto && (
              <View style={styles.photoButton}>
                <Button
                  title="Upload Before"
                  onPress={() => pickAndUpload("before")}
                  disabled={submitting}
                />
              </View>
            )}
          </View>

          <View style={styles.photoSlot}>
            <Text style={styles.photoLabel}>After</Text>

            {afterPhoto ? (
              <Text style={styles.sectionText}>Photo uploaded</Text>
            ) : (
              <Text style={styles.placeholder}>No photo yet.</Text>
            )}

            {isInProgress && beforePhoto && !afterPhoto && (
              <View style={styles.photoButton}>
                <Button
                  title="Upload After"
                  onPress={() => pickAndUpload("after")}
                  disabled={submitting}
                />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Checklist */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Checklist</Text>

        {checklistError && (
          <Text style={styles.errorText}>{checklistError}</Text>
        )}

        {isInProgress && checklist.length > 0 && !checklistDone && (
          <Text style={styles.helperText}>Tap an item to mark it completed.</Text>
        )}

        {!isInProgress && checklist.length > 0 && (
          <Text style={styles.helperText}>
            Checklist is read-only until job is in progress.
          </Text>
        )}

        {checklist.length === 0 ? (
          <Text style={styles.placeholder}>No checklist items.</Text>
        ) : (
          checklist.map((item) => {
            const isDone = !!item.is_completed;
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.checklistItem,
                  !canEditChecklist && styles.checklistItemDisabled,
                  pressed && canEditChecklist && styles.checklistItemPressed,
                ]}
                onPress={() => handleToggleChecklistItem(item.id)}
                disabled={submitting || isChecklistSaving || !canEditChecklist}
              >
                <Text
                  style={[
                    styles.checklistStatusIcon,
                    isDone && styles.checklistStatusIconDone,
                  ]}
                >
                  {isDone ? "✓" : "○"}
                </Text>
                <Text style={styles.checklistText}>
                  {item.text}
                  {item.is_required ? " *" : ""}
                </Text>
                <Text
                  style={[
                    styles.checklistMeta,
                    isDone && styles.checklistMetaDone,
                  ]}
                >
                  {savingItemId === item.id
                    ? "Saving..."
                    : isDone
                    ? "Completed"
                    : "Pending"}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        {canCheckIn && (
          <View style={styles.buttonWrapper}>
            <Button
              title="Check in"
              onPress={handleCheckIn}
              disabled={submitting}
            />
          </View>
        )}

        {isInProgress && (
          <View style={styles.buttonWrapper}>
            <Button
              title="Check out"
              onPress={handleCheckOut}
              disabled={submitting || !canCheckOut}
            />
          </View>
        )}

        {isInProgress && !canCheckOut && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.placeholder}>
              To check out, finish these steps:
            </Text>
            {!beforePhoto && (
              <Text style={styles.placeholder}>• Upload the before photo.</Text>
            )}
            {!afterPhoto && (
              <Text style={styles.placeholder}>• Upload the after photo.</Text>
            )}
            {checklistState.hasRequired && !checklistState.requiredCompleted && (
              <Text style={styles.placeholder}>
                • Complete all required checklist items (*).
              </Text>
            )}
          </View>
        )}

        <View style={styles.buttonWrapper}>
          <Button
            title="Share PDF report"
            onPress={handleSharePdf}
            disabled={submitting}
          />
        </View>

        {isCompleted && (
          <Text style={styles.placeholder}>
            Job is completed. No more actions available.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

// ----- helpers -----

type ChecklistState = {
  hasAny: boolean;
  hasRequired: boolean;
  allCompleted: boolean;
  requiredCompleted: boolean;
  checklistOk: boolean;
};

function computeChecklistState(checklist: JobChecklistItem[]): ChecklistState {
  const hasAny = checklist.length > 0;
  const requiredItems = checklist.filter((item) => item.is_required);
  const hasRequired = requiredItems.length > 0;

  const allCompleted =
    hasAny && checklist.every((item) => item.is_completed === true);

  const requiredCompleted =
    !hasRequired || requiredItems.every((item) => item.is_completed === true);

  // чеклист «ок» для прогресса / check-out:
  // - если вообще нет пунктов
  // - или все обязательные завершены
  const checklistOk = !hasAny || requiredCompleted;

  return {
    hasAny,
    hasRequired,
    allCompleted,
    requiredCompleted,
    checklistOk,
  };
}

type ProgressState = {
  scheduled: boolean;
  checkIn: boolean;
  beforePhoto: boolean;
  checklist: boolean;
  afterPhoto: boolean;
  checkOut: boolean;
};

function deriveJobProgress(params: {
  status: string;
  timelineEvents: any[];
  beforePhoto: any | null;
  afterPhoto: any | null;
  checklistState: ChecklistState;
}): ProgressState {
  const { status, timelineEvents, beforePhoto, afterPhoto, checklistState } =
    params;

  const hasCheckIn = timelineEvents.some((e) => e.event_type === "check_in");
  const hasCheckOut = timelineEvents.some((e) => e.event_type === "check_out");

  return {
    scheduled: true,
    checkIn: hasCheckIn || status === "in_progress" || status === "completed",
    beforePhoto: !!beforePhoto,
    checklist: checklistState.checklistOk,
    afterPhoto: !!afterPhoto,
    checkOut: hasCheckOut || status === "completed",
  };
}

function normalizeAndSortEvents(events: any[]) {
  const mapped = events
    .map((e) => {
      const createdAt = e.created_at ?? e.event_timestamp ?? e.createdAt ?? "";
      const type = e.event_type ?? e.type ?? "";
      const label =
        type === "check_in"
          ? "Checked in"
          : type === "check_out"
          ? "Checked out"
          : type || "Event";

      return {
        id: String(e.id ?? `${type}-${createdAt}`),
        createdAt,
        label,
        userName: e.user_name ?? e.userName ?? "",
        distanceM:
          typeof e.distance_m === "number"
            ? e.distance_m
            : typeof e.distanceM === "number"
            ? e.distanceM
            : undefined,
        event_type: type,
      };
    })
    .filter((e) => e.createdAt);

  mapped.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return mapped;
}

function formatTime(iso: string) {
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : iso;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  const btoaFn =
    // @ts-ignore
    globalThis.btoa ||
    // @ts-ignore
    (global as any).btoa;

  if (!btoaFn) {
    // fallback, если вдруг нет btoa
    // @ts-ignore
    return Buffer.from(binary, "binary").toString("base64");
  }

  return btoaFn(binary);
}

// ----- styles -----

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
  },
  status: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#b00020",
    marginBottom: 6,
  },
  placeholder: {
    fontSize: 14,
    color: "#888",
  },
  buttonWrapper: {
    marginTop: 8,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  checklistItemPressed: {
    opacity: 0.6,
  },
  checklistItemDisabled: {
    opacity: 0.5,
  },
  checklistStatusIcon: {
    width: 20,
    fontSize: 16,
    marginRight: 8,
    color: "#888",
  },
  checklistStatusIconDone: {
    color: "#0a7f42",
  },
  checklistText: {
    fontSize: 14,
    flexShrink: 1,
    flex: 1,
  },
  checklistMeta: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  checklistMetaDone: {
    color: "#0a7f42",
    fontWeight: "600",
  },
  // photos
  photoRow: {
    flexDirection: "row",
    gap: 12,
  },
  photoSlot: {
    flex: 1,
  },
  photoLabel: {
    fontWeight: "500",
    marginBottom: 4,
  },
  photoButton: {
    marginTop: 8,
  },
  // timeline
  timelineRow: {
    paddingVertical: 6,
  },
  timelineMain: {
    fontSize: 14,
    fontWeight: "500",
  },
  timelineMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#666",
  },
  // progress
  progressItem: {
    fontSize: 15,
    marginTop: 4,
  },
});
