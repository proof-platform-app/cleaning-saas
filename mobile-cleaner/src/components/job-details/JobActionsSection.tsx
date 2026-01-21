// mobile-cleaner/src/components/job-details/JobActionsSection.tsx

import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";

type ChecklistStateLite = {
  hasRequired: boolean;
  requiredCompleted: boolean;
};

type Props = {
  isOnline: boolean;
  isScheduled: boolean;
  isInProgress: boolean;
  isCompleted: boolean;

  canCheckInVisible: boolean;
  canCheckIn: boolean; // контролируем из родителя

  canCheckOutVisible: boolean;
  canCheckOut: boolean; // контролируем из родителя

  submitting: boolean;

  beforePhoto: any | null;
  afterPhoto: any | null;
  checklistState: ChecklistStateLite;

  onCheckIn: () => void;
  onCheckOut: () => void;
  onSharePdf: () => void;
};

export default function JobActionsSection({
  isOnline,
  isScheduled,
  isInProgress,
  isCompleted,
  canCheckInVisible,
  canCheckIn,
  canCheckOutVisible,
  canCheckOut,
  submitting,
  beforePhoto,
  afterPhoto,
  checklistState,
  onCheckIn,
  onCheckOut,
  onSharePdf,
}: Props) {
  // что нужно для логического check-out (используем только для подсказок)
  const hasAllForCheckOut =
    isInProgress &&
    !!beforePhoto &&
    !!afterPhoto &&
    (!checklistState.hasRequired || checklistState.requiredCompleted);

  // Кнопки включены/выключены по canCheckIn / canCheckOut из родителя
  const checkInDisabled = submitting || !canCheckIn;
  const checkOutDisabled = submitting || !canCheckOut;

  return (
    <>
      {/* Check in */}
      {canCheckInVisible && (
        <View style={styles.buttonWrapper}>
          <Button
            title="Check in"
            onPress={onCheckIn}
            disabled={checkInDisabled}
          />
          {!isOnline && (
            <Text style={styles.helperText}>Go online to check in.</Text>
          )}
        </View>
      )}

      {/* Check out */}
      {canCheckOutVisible && (
        <View style={styles.buttonWrapper}>
          <Button
            title="Check out"
            onPress={onCheckOut}
            disabled={checkOutDisabled}
          />
          {!isOnline && (
            <Text style={styles.helperText}>
              Go online to finish the job.
            </Text>
          )}
        </View>
      )}

      {/* Подсказки, почему нельзя сделать check-out прямо сейчас */}
      {isInProgress && !hasAllForCheckOut && (
        <View style={styles.bulletsWrapper}>
          {!isOnline && (
            <Text style={styles.placeholder}>• You are offline.</Text>
          )}
          {!beforePhoto && (
            <Text style={styles.placeholder}>• Take the before photo.</Text>
          )}
          {!afterPhoto && (
            <Text style={styles.placeholder}>• Take the after photo.</Text>
          )}
          {checklistState.hasRequired &&
            !checklistState.requiredCompleted && (
              <Text style={styles.placeholder}>
                • Complete all required checklist items (*).
              </Text>
            )}
        </View>
      )}

      {/* Дублирующий блок “что сделать” под чек-аут */}
      {canCheckOutVisible && !hasAllForCheckOut && (
        <View style={styles.bulletsWrapper}>
          <Text style={styles.placeholder}>
            To check out, finish these steps:
          </Text>
          {!beforePhoto && (
            <Text style={styles.placeholder}>
              • Upload the before photo.
            </Text>
          )}
          {!afterPhoto && (
            <Text style={styles.placeholder}>
              • Upload the after photo.
            </Text>
          )}
          {checklistState.hasRequired &&
            !checklistState.requiredCompleted && (
              <Text style={styles.placeholder}>
                • Complete all required checklist items (*).
              </Text>
            )}
        </View>
      )}

      {/* PDF */}
      <View style={styles.buttonWrapper}>
        <Button
          title="Share PDF report"
          onPress={onSharePdf}
          disabled={submitting || !isCompleted || !isOnline}
        />
      </View>

      {!isCompleted && (
        <Text style={styles.placeholder}>
          Report will be available after check-out.
        </Text>
      )}

      {isCompleted && !isOnline && (
        <Text style={styles.placeholder}>
          Go online to generate and share the report.
        </Text>
      )}

      {/* Общий оффлайн-месседж */}
      {!isOnline && (
        <View style={styles.offlineActionsWrapper}>
          <Text style={styles.offlineActionsTitle}>
            Internet connection is required.
          </Text>

          {isScheduled && (
            <Text style={styles.offlineActionsText}>
              Go online to check in and start this job.
            </Text>
          )}

          {isInProgress && (
            <Text style={styles.offlineActionsText}>
              Go online to check out and sync photos and checklist.
            </Text>
          )}

          {isCompleted && (
            <Text style={styles.offlineActionsText}>
              Go online to share the PDF report.
            </Text>
          )}
        </View>
      )}

      {isCompleted && (
        <Text style={styles.placeholder}>
          Job is completed. No more actions available.
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  buttonWrapper: {
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  placeholder: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  bulletsWrapper: {
    marginTop: 6,
  },
  offlineActionsWrapper: {
    marginTop: 8,
  },
  offlineActionsTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  offlineActionsText: {
    marginTop: 2,
    fontSize: 13,
    color: "#6B7280",
  },
});
