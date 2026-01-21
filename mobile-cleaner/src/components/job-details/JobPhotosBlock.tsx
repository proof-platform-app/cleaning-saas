// mobile-cleaner/src/components/job-details/JobPhotosBlock.tsx

import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";

const COLORS = {
  cardBg: "#FFFFFF",
  textMain: "#111827",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  cardBgSoft: "#F9FAFB",
  primary: "#0F766E",
};

export type JobPhotosBlockProps = {
  isInProgress: boolean;
  beforeUrl: string | null;
  afterUrl: string | null;
  hasBeforePhoto: boolean;
  hasAfterPhoto: boolean;
  canTakeBeforePhoto: boolean;
  canTakeAfterPhoto: boolean;
  isUploadingBefore: boolean;
  isUploadingAfter: boolean;
  submitting: boolean;
  onTakeBefore: () => void;
  onTakeAfter: () => void;
};

export const JobPhotosBlock: React.FC<JobPhotosBlockProps> = ({
  beforeUrl,
  afterUrl,
  hasBeforePhoto,
  hasAfterPhoto,
  canTakeBeforePhoto,
  canTakeAfterPhoto,
  isUploadingBefore,
  isUploadingAfter,
  submitting,
  onTakeBefore,
  onTakeAfter,
}) => {
  const beforeDisabled =
    !canTakeBeforePhoto || submitting || isUploadingBefore || isUploadingAfter;
  const afterDisabled =
    !canTakeAfterPhoto || submitting || isUploadingBefore || isUploadingAfter;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Photos</Text>

      <View style={styles.photoRow}>
        {/* BEFORE */}
        <View style={styles.photoSlot}>
          <Text style={styles.photoLabel}>Before</Text>

          <Pressable
            disabled={beforeDisabled}
            onPress={onTakeBefore}
            style={({ pressed }) => [
              styles.photoCard,
              beforeUrl && styles.photoCardWithImage,
              !beforeUrl && styles.photoCardEmpty,
              pressed && !beforeDisabled && styles.photoCardPressed,
            ]}
          >
            {beforeUrl ? (
              <Image
                source={{ uri: beforeUrl }}
                style={styles.photoPreview}
                resizeMode="cover"
              />
            ) : (
              <>
                <Text
                  style={[
                    styles.photoPlaceholderTitle,
                    !beforeDisabled && styles.photoPlaceholderTitleActive,
                  ]}
                >
                  No before photo
                </Text>
                <Text
                  style={[
                    styles.photoPlaceholderText,
                    !beforeDisabled && styles.photoPlaceholderTextActive,
                  ]}
                >
                  Tap to take it
                </Text>
              </>
            )}
          </Pressable>

          {isUploadingBefore && (
            <Text style={styles.photoUploadingText}>
              Uploading photo, please wait…
            </Text>
          )}
        </View>

        {/* AFTER */}
        <View style={styles.photoSlot}>
          <Text style={styles.photoLabel}>After</Text>

          <Pressable
            disabled={afterDisabled}
            onPress={onTakeAfter}
            style={({ pressed }) => [
              styles.photoCard,
              afterUrl && styles.photoCardWithImage,
              !afterUrl && styles.photoCardEmpty,
              pressed && !afterDisabled && styles.photoCardPressed,
            ]}
          >
            {afterUrl ? (
              <Image
                source={{ uri: afterUrl }}
                style={styles.photoPreview}
                resizeMode="cover"
              />
            ) : (
              <>
                <Text
                  style={[
                    styles.photoPlaceholderTitle,
                    !afterDisabled && styles.photoPlaceholderTitleActive,
                  ]}
                >
                  No after photo
                </Text>
                <Text
                  style={[
                    styles.photoPlaceholderText,
                    !afterDisabled && styles.photoPlaceholderTextActive,
                  ]}
                >
                  Finish proof before check-out
                </Text>
              </>
            )}
          </Pressable>

          {isUploadingAfter && (
            <Text style={styles.photoUploadingText}>
              Uploading photo, please wait…
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
    backgroundColor: COLORS.cardBg,
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
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: COLORS.textMain,
  },
  photoRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  photoSlot: {
    flex: 1,
  },
  photoLabel: {
    fontWeight: "500",
    marginBottom: 8,
    fontSize: 14,
    color: COLORS.textMain,
  },
  photoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBgSoft,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  photoCardWithImage: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: "hidden",
  },
  photoCardEmpty: {},
  photoCardPressed: {
    opacity: 0.9,
    borderColor: COLORS.primary,
  },
  photoPreview: {
    width: "100%",
    height: 120,
  },
  photoPlaceholderTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 4,
    textAlign: "center",
  },
  photoPlaceholderTitleActive: {
    color: COLORS.textMain,
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  photoPlaceholderTextActive: {
    color: COLORS.primary,
  },
  photoUploadingText: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.textMuted,
  },
});

export default JobPhotosBlock;
