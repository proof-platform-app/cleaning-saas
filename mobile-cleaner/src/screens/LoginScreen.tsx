import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { loginCleaner } from "../api/client";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

const colors = {
  bg: "#F6F8FB",
  card: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  teal: "#0F766E",
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = React.useState("cleaner@test.com");
  const [password, setPassword] = React.useState("Test1234!");
  const [submitting, setSubmitting] = React.useState(false);

  const handleLogin = async () => {
    try {
      setSubmitting(true);
      await loginCleaner(email.trim(), password);

      // после успешного логина — на Today Jobs
      navigation.reset({
        index: 0,
        routes: [{ name: "Jobs" }],
      });
    } catch (e: any) {
      Alert.alert(
        "Login failed",
        e?.message || "Login failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || !email.trim() || !password;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>CP</Text>
        </View>
        <Text style={styles.brandName}>CleanProof</Text>
      </View>

      <View style={styles.centerWrap}>
        <View style={styles.card}>
          <Text style={styles.h1}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to manage your cleaning jobs
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="cleaner@test.com"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={disabled}
            style={({ pressed }) => [
              styles.primaryBtn,
              disabled && styles.primaryBtnDisabled,
              pressed && !disabled && styles.primaryBtnPressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.primaryBtnText}>Sign in</Text>
            )}
          </Pressable>

          <Text style={styles.footerNote}>
            Trusted by cleaning professionals across the UAE
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
  },

  brandRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  brandName: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },

  centerWrap: {
    flex: 1,
    justifyContent: "flex-start",
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 70,

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  h1: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 18,
  },

  field: {
    marginTop: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: "#F1F7FF",
    color: colors.text,
  },

  primaryBtn: {
    marginTop: 18,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: "white",
    fontSize: 17,
    fontWeight: "800",
  },

  footerNote: {
    marginTop: 18,
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 13,
  },
});
