import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Dimensions,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { X, LogOut, User, Home, Play, Trophy, Users, HelpCircle, Languages, History, Medal, ShieldCheck, FileText, ExternalLink } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../auth/auth-store";
import { useRouter } from "expo-router";
import { LanguageSwitcher } from "./LanguageSwitcher";
import * as WebBrowser from "expo-web-browser";
import { SUPPORT_URLS } from "../lib/urls";

const { width, height } = Dimensions.get("window");

interface SideMenuProps {
  isVisible: boolean;
  onClose: () => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({ isVisible, onClose }) => {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  
  const openWebPage = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        toolbarColor: "#030307",
      });
      onClose();
    } catch (error) {
      console.error("Failed to open browser:", error);
    }
  };

  const [shouldRender, setShouldRender] = useState(isVisible);
  const slideAnim = useRef(new Animated.Value(width)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: width,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setShouldRender(false));
    }
  }, [isVisible]);

  const handleLogout = () => {
    logout();
    onClose();
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
    onClose();
  };

  const NavItem = ({ icon: Icon, label, onPress }: any) => (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      <Icon color="#9ca3af" size={20} />
      <Text style={styles.navText}>{label}</Text>
    </TouchableOpacity>
  );

  if (!shouldRender && !isVisible) return null;

  return (
    <Modal
      transparent={true}
      visible={shouldRender}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.backdrop, 
            { opacity: opacityAnim }
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Animated.View 
          style={[
            styles.menuContainer, 
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("nav.home", "Menu")}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color="#f59e0b" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.userSection}>
              {isAuthenticated && user?.accountType !== "GUEST" ? (
                <TouchableOpacity 
                  style={styles.profileInfo}
                  onPress={() => navigateTo("/profile")}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarPlaceholder}>
                    <User color="#f59e0b" size={32} />
                  </View>
                  <View>
                    <Text style={styles.username}>{user?.username || user?.displayName || "User"}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.authButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.loginButton]}
                    onPress={() => navigateTo("/(auth)/login")}
                  >
                    <Text style={styles.buttonText}>{t("nav.login", "Login")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.signupButton]}
                    onPress={() => navigateTo("/(auth)/signup")}
                  >
                    <Text style={[styles.buttonText, { color: "#f59e0b" }]}>
                      {t("nav.signup", "Sign Up")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.navSection}>
              <NavItem
                icon={Home}
                label={t("nav.home", "Home")}
                onPress={() => navigateTo("/")}
              />
              <NavItem
                icon={Play}
                label={t("nav.play", "Play Online")}
                onPress={() => navigateTo("/game/lobby")}
              />
              <NavItem
                icon={History}
                label={t("nav.history", "Game History")}
                onPress={() => navigateTo("/game/history")}
              />
              <NavItem
                icon={Medal}
                label={t("nav.leaderboard", "Leaderboard")}
                onPress={() => navigateTo("/game/leaderboard")}
              />
              <NavItem
                icon={Trophy}
                label={t("nav.tournaments", "Tournaments")}
                onPress={() => navigateTo("/game/tournaments")}
              />
              <NavItem
                icon={Users}
                label={t("nav.community", "Community")}
                onPress={() => navigateTo("/community")}
              />
              <NavItem
                icon={HelpCircle}
                label={t("nav.support", "Support")}
                onPress={() => navigateTo("/support")}
              />

              <View style={styles.divider} />

              <NavItem
                icon={FileText}
                label={t("nav.rules", "Game Rules")}
                onPress={() => openWebPage(SUPPORT_URLS.rules)}
              />
              <NavItem
                icon={ShieldCheck}
                label={t("nav.privacy", "Privacy Policy")}
                onPress={() => openWebPage(SUPPORT_URLS.privacy)}
              />
              <NavItem
                icon={ExternalLink}
                label={t("nav.website", "Visit Website")}
                onPress={() => openWebPage(SUPPORT_URLS.website)}
              />
              
              <View style={styles.languageSection}>
                <View style={styles.languageLabelRow}>
                  <Languages color="#9ca3af" size={20} />
                  <Text style={styles.navText}>{t("nav.language", "Language")}</Text>
                </View>
                <LanguageSwitcher />
              </View>
            </View>
          </ScrollView>

          {isAuthenticated && (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut color="#ef4444" size={20} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  menuContainer: {
    width: width * 0.75,
    backgroundColor: "#0a0a0a",
    height: "100%",
    borderLeftWidth: 1,
    borderLeftColor: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  userSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  username: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  email: {
    color: "#9ca3af",
    fontSize: 12,
  },
  authButtons: {
    gap: 12,
  },
  button: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButton: {
    backgroundColor: "#f59e0b",
  },
  signupButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  navSection: {
    padding: 10,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    gap: 12,
  },
  navText: {
    color: "#d1d5db",
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#1a1a1a",
    marginVertical: 10,
    marginHorizontal: 15,
  },
  languageSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  languageLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "bold",
  },
});
