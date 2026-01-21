// mobile-cleaner/src/components/job-details/ChecklistSection.tsx

import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import type { JobChecklistItem } from "../../api/client";

type ChecklistStateLite = {
  hasRequired: boolean;
  requiredCompleted: boolean;
  checklistOk: boolean;
};

type Props = {
  items: JobChecklistItem[];
  canEditChecklist: boolean;
  isInProgress: boolean;
  isOnline: boolean | null;

  checklistState: ChecklistStateLite;
  checklistError: string | null;
  isChecklistSaving: boolean;
  savingItemId: number | null;
  submitting: boolean;

  onToggleItem: (itemId: number, next: boolean) => void;
};

function ChecklistSection({
  items,
  canEditChecklist,
  isInProgress,
  isOnline,
  checklistState,
  checklistError,
  isChecklistSaving,
  savingItemId,
  submitting,
  onToggleItem,
}: Props) {
  const disabled = !canEditChecklist || !isInProgress || submitting;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Checklist</Text>
      <Text style={styles.helperText}>Tap an item to mark it completed.</Text>

      {items.map((item) => {
        const isSaving = isChecklistSaving && savingItemId === item.id;
        return (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemText}>{item.text}</Text>

            <View style={styles.itemRight}>
              {isSaving && (
                <ActivityIndicator size="small" style={styles.spinner} />
              )}
              <Text
                style={[
                  styles.statusText,
                  item.is_completed && styles.statusTextDone,
                ]}
                onPress={() => {
                  if (disabled) return;
                  onToggleItem(item.id, !item.is_completed);
                }}
              >
                {item.is_completed ? "Done" : "Pending"}
              </Text>
            </View>
          </View>
        );
      })}

      {checklistError && (
        <Text style={styles.errorText}>{checklistError}</Text>
      )}

      {!isOnline && (
        <Text style={styles.offlineText}>
          You are offline. Changes will sync when connection is restored.
        </Text>
      )}
    </View>
  );
}

export default ChecklistSection;

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
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
    marginBottom: 4,
    color: "#111827",
  },
  helperText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    marginRight: 8,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  spinner: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  statusTextDone: {
    color: "#059669",
    fontWeight: "500",
  },
  errorText: {
    marginTop: 6,
    fontSize: 13,
    color: "#B91C1C",
  },
  offlineText: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
  },
});
