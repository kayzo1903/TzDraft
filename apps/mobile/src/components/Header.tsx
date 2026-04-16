import { View, StyleSheet, TouchableOpacity, Image, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { User, Menu } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../auth/auth-store";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface HeaderProps {
  onMenuPress: () => void;
}


export const Header: React.FC<HeaderProps> = ({ onMenuPress }) => {
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
              <Text style={styles.textButtonLabel}>Login</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleAccountPress} style={styles.accountButton}>
              <User color="#f59e0b" size={28} />
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
          <LanguageSwitcher />
          {isGuest && (
            <TouchableOpacity 
              onPress={() => router.push("/(auth)/signup")} 
              style={[styles.textButton, styles.signupButton]}
            >
              <Text style={[styles.textButtonLabel, { color: "#000" }]}>Join</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <Menu color="#f59e0b" size={28} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#0a0a0a",
  },
  container: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
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
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: -1, // Ensure it doesn't block touches to side buttons
  },
  logo: {
    width: 140,
    height: 40,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  textButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  signupButton: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  textButtonLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});
