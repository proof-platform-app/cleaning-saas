// mobile-cleaner/src/screens/JobsScreen.tsx

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { fetchTodayJobs, type CleanerJobSummary } from "../api/client";
import { getStatusConfig } from "../components/job-details/statusConfig";

type Props = NativeStackScreenProps<RootStackParamList, "Jobs">;

const listColors = {
  bg: "#F8FAFC", // фон как в theme.background
  card: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  teal: "#0F766E", // основной акцент

  // мягкий бренд-фон для summary
  summaryBg: "#E0F2F1",
  summaryBorder: "#BAE6E1",

  tealSoft: "#CCFBF1", // мягкий фон под summary-card (может использоваться в других местах)
  success: "#16A34A",
  successSoft: "#BBF7D0",
  warning: "#F97316",
  warningSoft: "#FFEDD5",
  greySoft: "#E5E7EB",
};

export default function JobsScreen({ navigation }: Props) {
  const [jobs, setJobs] = React.useState<CleanerJobSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadJobs = React.useCallback(async () => {
    try {
      setError(null);
      const data = await fetchTodayJobs();
      setJobs(Array.isArray(data) ? (data as CleanerJobSummary[]) : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load today jobs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const renderJobItem = ({ item }: { item: CleanerJobSummary }) => {
    const job = item;
    const anyJob = job as any;

    const title =
      job.location__name ||
      anyJob.location_name ||
      anyJob.location ||
      anyJob.name ||
      "Cleaning job";

    // пробуем вытащить район / город
    const area =
      anyJob.location_area ||
      anyJob.location_city ||
      anyJob.city ||
      anyJob.location_district ||
      "";

    // если area есть → "Today · Dubai Marina", иначе просто "Today"
    const subtitle = area ? `Today · ${area}` : "Today";

    const status = job.status ?? "scheduled";
    const { label, badgeBg, badgeText, stripe } = getStatusConfig(status) as any;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("JobDetails", { jobId: job.id })}
      >
        <View style={styles.jobCard}>
          <View
            style={[
              styles.jobStripe,
              { backgroundColor: stripe ?? listColors.teal },
            ]}
          />

          <View style={styles.jobContentRow}>
            <View style={styles.jobMain}>
              <Text style={styles.jobTitle} numberOfLines={1}>
                {title}
              </Text>

              <Text style={styles.jobMeta} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>

            <View style={styles.jobRight}>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: badgeBg ?? listColors.tealSoft },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    { color: badgeText ?? listColors.teal },
                  ]}
                >
                  {label}
                </Text>
              </View>

              <Text style={styles.chevron}>›</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  const jobsCountText = error
    ? null
    : jobs.length === 0
    ? "No jobs scheduled for today."
    : jobs.length === 1
    ? "You have 1 job today."
    : `You have ${jobs.length} jobs today.`;

  const showLoader = loading && jobs.length === 0;

  return (
    <SafeAreaView style={styles.screen}>
      {showLoader ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={listColors.teal} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={renderJobItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadJobs();
              }}
              tintColor={listColors.teal}
            />
          }
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Today&apos;s jobs</Text>
              <Text style={styles.summaryDate}>{formattedDate}</Text>

              {error ? (
                <Text style={styles.errorText}>
                  Session expired. Please log in again.
                </Text>
              ) : jobsCountText ? (
                <Text style={styles.summarySubtitle}>{jobsCountText}</Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            !loading && !error ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>
                  No jobs for today. Enjoy your free time ✨
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: listColors.bg,
  },

  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 16,
    gap: 12,
  },

  // summary card
  summaryCard: {
    backgroundColor: listColors.summaryBg,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: listColors.summaryBorder,
  },
  summaryTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: listColors.text,
    marginBottom: 4,
  },
  summaryDate: {
    fontSize: 14,
    color: listColors.textMuted,
    marginBottom: 8,
  },
  summarySubtitle: {
    fontSize: 14,
    color: listColors.text,
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: "#B91C1C",
  },

  // empty state
  emptyWrap: {
    marginTop: 32,
    paddingHorizontal: 8,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    color: listColors.textMuted,
  },

  // job card
  jobCard: {
    flexDirection: "row",
    backgroundColor: listColors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: listColors.border,
    overflow: "hidden",

    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  jobStripe: {
    width: 4,
  },
  jobContentRow: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  jobMain: {
    flex: 1,
    paddingRight: 12,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: listColors.text,
    marginBottom: 4,
  },
  jobMeta: {
    fontSize: 14,
    color: listColors.textMuted,
  },

  jobRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPillText: {
    fontSize: 14,
    fontWeight: "600",
  },
  chevron: {
    fontSize: 18,
    color: "#CBD5E1", // менее контрастная стрелка
  },
});
