import { View, StyleSheet, TouchableOpacity, Image, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { User, Menu, Bell } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../auth/auth-store";
import { colors } from "../theme/colors";

interface HeaderProps {
  onMenuPress: () => void;
}


export const Header: React.FC<HeaderProps> = ({ onMenuPress }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const isGuest = user?.accountType === "GUEST";

  const handleAccountPress = () => {
    if (isAuthenticated) {
      router.push("/profile");
    } else {
      router.push("/(auth)/login");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
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
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Right Actions */}
        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell color={colors.primary} size={24} />
            <View style={styles.notificationBadge} />
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
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  textButtonLabel: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "bold",
  },
});
