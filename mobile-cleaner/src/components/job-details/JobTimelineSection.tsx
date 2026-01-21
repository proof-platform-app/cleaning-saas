// mobile-cleaner/src/components/job-details/JobTimelineSection.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

type TimelineEvent = {
  id: string;
  label: string;
  createdAt: string;
  userName?: string;
  distanceM?: number;
};

type Props = {
  events: TimelineEvent[];
};

export default function JobTimelineSection({ events }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>Timeline</Text>

      {events.length === 0 ? (
        <Text style={styles.placeholder}>No events yet.</Text>
      ) : (
        events.map((e) => (
          <View key={e.id} style={styles.row}>
            <Text style={styles.mainLine}>
              {e.label} — {formatTime(e.createdAt)}
            </Text>
            <Text style={styles.metaLine}>
              {e.userName ? e.userName : "Unknown user"}
              {typeof e.distanceM === "number" ? ` • ${e.distanceM} m` : ""}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function formatTime(iso: string) {
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : iso;
}

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111827",
  },
  row: {
    paddingVertical: 6,
  },
  mainLine: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  metaLine: {
    marginTop: 2,
    fontSize: 13,
    color: "#6B7280",
  },
  placeholder: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
