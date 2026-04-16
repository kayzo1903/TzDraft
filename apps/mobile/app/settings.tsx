import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../src/auth/auth-store";
import { authClient } from "../src/lib/auth-client";
import { useRouter } from "expo-router";
import {
  User,
  LogOut,
  ChevronLeft,
  Globe,
  ShieldCheck,
  ShieldAlert,
  Key,
  Info,
  ChevronRight,
  FileText,
  HelpCircle,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../src/i18n";
import { colors } from "../src/theme/colors";

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const router = useRouter();
  const [isNameModalVisible, setIsNameModalVisible] = React.useState(false);
  const [newName, setNewName] = React.useState(user?.displayName || "");
  const [isUpdating, setIsUpdating] = React.useState(false);

  React.useEffect(() => {
    if (user?.displayName) {
      setNewName(user.displayName);
    }
  }, [user?.displayName]);

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    setIsUpdating(true);
    try {
      await authClient.updateProfile({ displayName: newName.trim() });
      setIsNameModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update display name. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const currentLanguage = i18n.language;
  const isSwahili = currentLanguage === "sw";

  const handleLanguageToggle = async () => {
    const nextLang = isSwahili ? "en" : "sw";
    await changeLanguage(nextLang);
  };

  const handleLogout = async () => {
    await authClient.logout();
    router.replace("/");
  };

  const hasVerifiedPhone = Boolean(
    user?.phoneNumber &&
    user.phoneNumber.startsWith("+255") &&
    user.accountType !== "GUEST"
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  const SettingItem = ({
    icon: Icon,
    label,
    value,
    onPress,
    showChevron = true,
    valueColor = colors.textSecondary,
  }: {
    icon: any;
    label: string;
    value?: string;
    onPress?: () => void;
    showChevron?: boolean;
    valueColor?: string;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <View style={styles.iconWrapper}>
          <Icon color={colors.textMuted} size={18} />
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={[styles.settingValue, { color: valueColor }]}>{value}</Text>}
        {showChevron && <ChevronRight color={colors.textDisabled} size={18} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={colors.textMuted} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("settings.title", "Settings")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title={t("settings.sections.preferences", "Preferences")}>
          <SettingItem
            icon={Globe}
            label={t("settings.language.title", "Language")}
            value={isSwahili ? "Kiswahili" : "English"}
            onPress={handleLanguageToggle}
          />
        </Section>

        <Section title={t("settings.sections.security", "Security")}>
          <SettingItem
            icon={Key}
            label={t("settings.security.password.title", "Password")}
            value={t("settings.security.password.action", "Reset")}
            onPress={() => {}}
          />
          <SettingItem
            icon={hasVerifiedPhone ? ShieldCheck : ShieldAlert}
            label={t("settings.security.status.title", "Account Status")}
            value={hasVerifiedPhone ? t("settings.security.status.verified", "Verified") : t("settings.security.status.notVerified", "Not Verified")}
            valueColor={hasVerifiedPhone ? "#4ade80" : colors.warning}
            showChevron={false}
          />
        </Section>

        <Section title={t("settings.sections.account", "Account")}>
          <SettingItem
            icon={User}
            label={t("settings.account.name", "Game Name")}
            value={user?.displayName || t("settings.account.noName", "Set game name")}
            onPress={() => setIsNameModalVisible(true)}
          />
          <SettingItem
            icon={User}
            label={t("settings.account.username", "Username")}
            value={user?.username || "—"}
            showChevron={false}
          />
          <SettingItem
            icon={Info}
            label={t("settings.account.phone", "Phone")}
            value={user?.phoneNumber || "—"}
            showChevron={false}
          />
          <SettingItem
            icon={Info}
            label={t("settings.account.email", "Email")}
            value={user?.email || "—"}
            showChevron={false}
          />
        </Section>

        <Section title={t("settings.sections.legal", "Legal")}>
          <SettingItem
            icon={FileText}
            label={t("settings.legal.policy", "Privacy Policy")}
            onPress={() => {}}
          />
          <SettingItem
            icon={HelpCircle}
            label={t("settings.legal.rules", "Game Rules")}
            onPress={() => {}}
          />
        </Section>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color={colors.danger} size={20} />
          <Text style={styles.logoutText}>{t("settings.actions.signOut", "Sign Out")}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>TzDraft Mobile v1.0.0</Text>
      </ScrollView>

      <Modal
        visible={isNameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isUpdating && setIsNameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("settings.account.editName", "Edit Game Name")}</Text>
            <Text style={styles.modalSub}>{t("settings.account.editNameDesc", "This name will be visible to other players.")}</Text>

            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder={t("settings.account.namePlaceholder", "Enter your game name")}
              placeholderTextColor={colors.textSubtle}
              autoFocus={true}
              maxLength={50}
              editable={!isUpdating}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsNameModalVisible(false)}
                disabled={isUpdating}
              >
                <Text style={styles.cancelButtonText}>{t("common.cancel", "Cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, !newName.trim() && styles.disabledButton]}
                onPress={handleUpdateName}
                disabled={isUpdating || !newName.trim()}
              >
                {isUpdating ? (
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>{t("common.save", "Save")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingValue: {
    fontSize: 14,
    marginRight: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.15)",
    marginTop: 12,
    gap: 8,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "bold",
  },
  versionText: {
    color: colors.textDisabled,
    fontSize: 12,
    textAlign: "center",
    marginTop: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  modalSub: {
    color: colors.textSubtle,
    fontSize: 14,
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    color: colors.foreground,
    fontSize: 16,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: colors.surfaceElevated,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "bold",
  },
  saveButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: "bold",
  },
});
