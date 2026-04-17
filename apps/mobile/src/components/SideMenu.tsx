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
import { X, LogOut, User, Home, Play, Trophy, Users, HelpCircle, Languages, History, Medal, ShieldCheck, FileText, ExternalLink, BookOpen, BookMarked } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../auth/auth-store";
import { authClient } from "../lib/auth-client";
import { useRouter } from "expo-router";
import { colors } from "../theme/colors";
import { LanguageSwitcher } from "./LanguageSwitcher";
import * as WebBrowser from "expo-web-browser";
import { SUPPORT_URLS } from "../lib/urls";

const { width } = Dimensions.get("window");

interface SideMenuProps {
  isVisible: boolean;
  onClose: () => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({ isVisible, onClose }) => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  
  const openWebPage = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        toolbarColor: colors.background,
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

  const handleLogout = async () => {
    await authClient.logout();
    onClose();
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
    onClose();
  };

  const NavItem = ({ icon: Icon, label, onPress }: any) => (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      <Icon color={colors.textMuted} size={20} />
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
              <X color={colors.primary} size={24} />
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
                    <User color={colors.primary} size={32} />
                  </View>
                  <View>
                    <Text style={styles.username}>{user?.displayName || user?.username || "User"}</Text>
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
                    <Text style={[styles.buttonText, { color: colors.primary }]}>
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
              <NavItem
                icon={FileText}
                label={t("learn.articles", "Articles")}
                onPress={() => openWebPage(`https://tzdraft.co.tz/${i18n.language}/learn`)}
              />
              <NavItem
                icon={BookOpen}
                label={t("learn.heading", "Learn")}
                onPress={() => navigateTo("/learn")}
              />
              {isAuthenticated && user?.accountType !== "GUEST" && (
                <NavItem
                  icon={BookMarked}
                  label={t("studies.title", "My Studies")}
                  onPress={() => navigateTo("/game/studies")}
                />
              )}

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
                  <Languages color={colors.textMuted} size={20} />
                  <Text style={styles.navText}>{t("nav.language", "Language")}</Text>
                </View>
                <LanguageSwitcher />
              </View>
            </View>
          </ScrollView>

          {isAuthenticated && user?.accountType !== "GUEST" && (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut color={colors.danger} size={20} />
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
    backgroundColor: colors.overlay,
  },
  menuContainer: {
    width: width * 0.75,
    backgroundColor: colors.background,
    height: "100%",
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.foreground,
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
    borderBottomColor: colors.border,
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
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  username: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "bold",
  },
  email: {
    color: colors.textMuted,
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
    backgroundColor: colors.primary,
  },
  signupButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonText: {
    color: colors.foreground,
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
    color: colors.textSecondary,
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
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
    borderTopColor: colors.border,
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
    borderTopColor: colors.border,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "bold",
  },
});
