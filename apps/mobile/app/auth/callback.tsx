import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../src/theme/colors";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react-native";

export default function AuthCallback() {
  const { t } = useTranslation();

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
