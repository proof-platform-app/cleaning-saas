import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = {
  address: string;
  onNavigate: () => void;
};

export default function LocationBlock({ address, onNavigate }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Address</Text>

      <Text style={styles.address}>{address}</Text>

      <TouchableOpacity onPress={onNavigate} activeOpacity={0.8}>
        <Text style={styles.navigate}>Navigate</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },

  address: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 10,
  },

  navigate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F766E", // брендовый акцент
  },
});
