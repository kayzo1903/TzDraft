import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../src/auth/auth-store";
import { authClient } from "../src/lib/auth-client";
import { useRouter } from "expo-router";
import { User, LogOut, ChevronLeft, Settings, Shield, Bell, BookMarked } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { colors } from "../src/theme/colors";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.logout();
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={colors.textMuted} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("nav.profile", "Profile")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <User color={colors.primary} size={48} />
          </View>
          <Text style={styles.username}>{user?.displayName || user?.username || "Guest User"}</Text>
          <Text style={styles.email}>{user?.email || "No email provided"}</Text>
          {user?.rating !== undefined && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>ELO: {user.rating}</Text>
            </View>
          )}
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/settings")}
          >
            <View style={styles.menuIconWrapper}>
              <Settings color={colors.textMuted} size={20} />
            </View>
            <Text style={styles.menuText}>Account Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push("/notifications")}
          >
            <View style={styles.menuIconWrapper}>
              <Bell color={colors.textMuted} size={20} />
            </View>
            <Text style={styles.menuText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/game/studies")}
          >
            <View style={styles.menuIconWrapper}>
              <BookMarked color={colors.textMuted} size={20} />
            </View>
            <Text style={styles.menuText}>{t("studies.title", "My Studies")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/support")}
          >
            <View style={styles.menuIconWrapper}>
              <Shield color={colors.textMuted} size={20} />
            </View>
            <Text style={styles.menuText}>Privacy &amp; Security</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color={colors.danger} size={20} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 12,
  },
  profileCard: {
    alignItems: "center",
    marginBottom: 32,
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryAlpha10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.primaryAlpha15,
  },
  username: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
  },
  email: {
    color: colors.textSubtle,
    fontSize: 14,
    marginBottom: 8,
  },
  ratingBadge: {
    backgroundColor: colors.primaryAlpha15,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
  },
  ratingText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  menuSection: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: colors.dangerAlpha20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    gap: 8,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "bold",
  },
});
