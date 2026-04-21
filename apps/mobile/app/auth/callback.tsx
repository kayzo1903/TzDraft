import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { colors } from "../../src/theme/colors";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react-native";
import { useAuthStore } from "../../src/auth/auth-store";

/**
 * Deep-link landing screen for the web-based OAuth flow.
 * The backend redirects to `tzdraft-mobile://auth/callback?accessToken=…&refreshToken=…`
 * after a successful Google sign-in via the browser.
 *
 * The native flow (GoogleSignin.signIn) never visits this screen — it resolves
 * the token exchange entirely inside auth-client.ts.
 */
export default function AuthCallback() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }>();

  useEffect(() => {
    const handleCallback = async () => {
      const { accessToken, refreshToken, error } = params;

      if (error || !accessToken) {
        console.warn("[AuthCallback] OAuth redirect contained an error or missing token:", error);
        router.replace("/welcome");
        return;
      }

      try {
        const store = useAuthStore.getState();
        store.setToken(accessToken);
        if (refreshToken) {
          await SecureStore.setItemAsync("refreshToken", refreshToken);
        }
        // Root guard reacts to status change and redirects to home.
        store.setStatus("authenticated");
      } catch (err) {
        console.error("[AuthCallback] Failed to persist OAuth tokens:", err);
        router.replace("/welcome");
      }
    };

    handleCallback();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <ShieldCheck size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>
          {t("auth.callback.title", "Authenticating...")}
        </Text>
        <Text style={styles.subtitle}>
          {t("auth.callback.subtitle", "Completing your secure sign-in experience")}
        </Text>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryAlpha10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  loader: {
    marginTop: 20,
  },
});
