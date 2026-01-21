// src/components/job-details/LocationBlock.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = {
  address: string;
  canNavigate: boolean;
  onNavigate?: () => void | Promise<void>;
};

export default function LocationBlock({
  address,
  canNavigate,
  onNavigate,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Address</Text>

      <Text style={styles.address}>{address}</Text>

      {canNavigate && onNavigate ? (
        <TouchableOpacity
          onPress={onNavigate}
          activeOpacity={0.8}
          style={styles.navigateWrapper}
        >
          <Text style={styles.navigateText}>📍 Navigate</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.navigateDisabled}>Navigate (no location)</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#161617",
    marginBottom: 6,
  },

  address: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 10,
  },

  navigateWrapper: {
    marginTop: 2,
  },

  navigateText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#0F766E",
  },

  navigateDisabled: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "500",
    color: "#9CA3AF",
  },
});
