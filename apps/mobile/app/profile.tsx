import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../src/auth/auth-store";
import { authClient } from "../src/lib/auth-client";
import { useRouter } from "expo-router";
import { User, LogOut, ChevronLeft, Settings, Shield, Bell } from "lucide-react-native";
import { useTranslation } from "react-i18next";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.logout();
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#a3a3a3" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("nav.profile", "Profile")}</Text>
        <View style={{ width: 44 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <User color="#f59e0b" size={48} />
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
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconWrapper}>
              <Settings color="#9ca3af" size={20} />
            </View>
            <Text style={styles.menuText}>Account Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconWrapper}>
              <Bell color="#9ca3af" size={20} />
            </View>
            <Text style={styles.menuText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconWrapper}>
              <Shield color="#9ca3af" size={20} />
            </View>
            <Text style={styles.menuText}>Privacy & Security</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color="#ef4444" size={20} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 24,
  },
  profileCard: {
    alignItems: "center",
    marginBottom: 32,
    backgroundColor: "#111",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  username: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
  },
  email: {
    color: "#737373",
    fontSize: 14,
    marginBottom: 8,
  },
  ratingBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  ratingText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "bold",
  },
  menuSection: {
    backgroundColor: "#111",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    overflow: "hidden",
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  menuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuText: {
    color: "#d4d4d4",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    gap: 8,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "bold",
  },
});
