// mobile-cleaner/src/screens/JobsScreen.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchCleanerTodayJobs, CleanerJobSummary } from "../api/client";

// Маршруты стека (минимальный контракт для навигации)
type RootStackParamList = {
  Login: undefined;
  Jobs: undefined;
  JobDetails: { jobId: number };
};

type JobsScreenNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "Jobs"
>;

export default function JobsScreen() {
  const navigation = useNavigation<JobsScreenNavigation>();

  const [jobs, setJobs] = useState<CleanerJobSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchCleanerTodayJobs();
        if (!cancelled) setJobs(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load jobs";
        Alert.alert("Error", msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today Jobs</Text>

      {jobs.length === 0 ? (
        <Text>No jobs for today.</Text>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate("JobDetails", { jobId: item.id })
              }
            >
              <Text style={styles.loc}>
                {item.location__name ?? "Unknown location"}
              </Text>

              {item.scheduled_date ? (
                <Text style={styles.meta}>Date: {item.scheduled_date}</Text>
              ) : null}

              <Text style={styles.status}>Status: {item.status}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    backgroundColor: "#fff",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  loc: { fontSize: 16, fontWeight: "600" },
  meta: { marginTop: 6, color: "#666" },
  status: { marginTop: 8 },
});
