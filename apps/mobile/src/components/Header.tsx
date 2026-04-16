import { View, StyleSheet, TouchableOpacity, Image, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { User, Menu, Bell } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../auth/auth-store";
import { colors } from "../theme/colors";
import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";

interface HeaderProps {
  onMenuPress: () => void;
}


export const Header: React.FC<HeaderProps> = ({ onMenuPress }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, user, status } = useAuthStore();
  const isGuest = user?.accountType === "GUEST";
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await api.get<{ count: number }>("/notifications/unread-count");
      setUnreadCount(res.data.count ?? 0);
    } catch {
      // silently fail — badge is non-critical
    }
  }, [status]);

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 60 seconds to keep badge roughly fresh
    const interval = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleAccountPress = () => {
    if (isAuthenticated) {
      router.push("/profile");
    } else {
      router.push("/(auth)/login");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Left Action */}
        <View style={styles.leftActions}>
          {isGuest ? (
            <TouchableOpacity
              onPress={() => router.push("/(auth)/login")}
              style={styles.textButton}
            >
              <Text style={styles.textButtonLabel}>{t("nav.login", "Login")}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleAccountPress} style={styles.accountButton}>
              <User color={colors.primary} size={28} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center Branding */}
        <View style={styles.logoContainer} pointerEvents="none">
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Right Actions */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => {
              setUnreadCount(0); // optimistic clear before fetch on return
              router.push("/notifications");
            }}
          >
            <Bell color={colors.primary} size={24} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                {unreadCount <= 9 ? (
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                ) : (
                  <Text style={styles.badgeText}>9+</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <Menu color={colors.primary} size={28} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
  },
  container: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  leftActions: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  rightActions: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  accountButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: -1,
  },
  logo: {
    width: 140,
    height: 40,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  textButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  signupButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 13,
  },
  textButtonLabel: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "bold",
  },
});
