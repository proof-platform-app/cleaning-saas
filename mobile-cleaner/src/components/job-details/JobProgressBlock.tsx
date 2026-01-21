// mobile-cleaner/src/components/job-details/JobProgressBlock.tsx

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../ui/theme";

export type JobProgressBlockProps = {
  /**
   * Статус job из backend:
   * "scheduled" | "in_progress" | "completed" | ...
   */
  status?: string;

  /**
   * Флаги доказательств работы.
   * Можно маппить из proof / photos / checklist на экране Job Details.
   */
  hasBeforePhoto?: boolean;
  hasAfterPhoto?: boolean;
  checklistCompleted?: boolean;
};

/**
 * Крупный визуальный прогресс по этапам job.
 *
 * Важно:
 * - НЕ рисуем второй заголовок "Progress" внутри компонента.
 * - Никакой новой логики — только визуализация по флагам.
 */
export const JobProgressBlock: React.FC<JobProgressBlockProps> = ({
  status,
  hasBeforePhoto = false,
  hasAfterPhoto = false,
  checklistCompleted = false,
}) => {
  const normalizedStatus = (status || "").toLowerCase();

  const scheduledDone = true;
  const checkInDone =
    normalizedStatus === "in_progress" || normalizedStatus === "completed";
  const beforeDone = !!hasBeforePhoto;
  const checklistDone = !!checklistCompleted;
  const afterDone = !!hasAfterPhoto;
  const checkOutDone = normalizedStatus === "completed";

  const steps: Array<{ key: string; label: string; completed: boolean }> = [
    { key: "scheduled", label: "Scheduled", completed: scheduledDone },
    { key: "check_in", label: "Check-in", completed: checkInDone },
    { key: "before", label: "Before photo", completed: beforeDone },
    { key: "checklist", label: "Checklist", completed: checklistDone },
    { key: "after", label: "After photo", completed: afterDone },
    { key: "check_out", label: "Check-out", completed: checkOutDone },
  ];

  return (
    <View style={styles.card}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isDone = step.completed;

        return (
          <View key={step.key} style={styles.stepRow}>
            <View
              style={[
                styles.stepCircle,
                isDone && styles.stepCircleDone,
              ]}
            >
              {isDone ? (
                <Text style={styles.stepCheckIcon}>✓</Text>
              ) : (
                <Text style={styles.stepNumber}>{stepNumber}</Text>
              )}
            </View>

            <View style={styles.stepTextContainer}>
              <Text style={styles.stepTextMain}>{step.label}</Text>
              <Text
                style={[
                  styles.stepTextStatus,
                  isDone && styles.stepTextStatusDone,
                ]}
              >
                {isDone ? "Done" : "Pending"}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const COLORS = {
  textMain: "#111827",
  textMuted: "#6B7280",
  circleDoneBg: "#DCFCE7",
  circleDoneBorder: "#22C55E",
  circleDoneIcon: "#15803D",
  circlePendingBorder: "#E5E7EB",
  circlePendingBg: "#F9FAFB",
  stepDoneLabel: "#0F766E",
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,

    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.circlePendingBorder,
    backgroundColor: COLORS.circlePendingBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  stepCircleDone: {
    borderColor: COLORS.circleDoneBorder,
    backgroundColor: COLORS.circleDoneBg,
  },

  stepNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textMuted,
  },

  stepCheckIcon: {
    fontSize: 18,
    color: COLORS.circleDoneIcon,
  },

  stepTextContainer: {
    flex: 1,
    paddingRight: 4,
  },

  stepTextMain: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textMain,
  },

  stepTextStatus: {
    fontSize: 13,
    marginTop: 2,
    color: COLORS.textMuted,
  },

  stepTextStatusDone: {
    color: COLORS.stepDoneLabel,
  },
});

export default JobProgressBlock;
