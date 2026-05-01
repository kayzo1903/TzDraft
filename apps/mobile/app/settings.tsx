import React from "react";
import Constants from "expo-constants";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Linking, Image } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as ImagePicker from "expo-image-picker";
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
  Camera,
  AlertCircle,
  ImageOff,
  Trash2,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../src/i18n";
import { colors } from "../src/theme/colors";
import { SUPPORT_URLS } from "../src/lib/urls";
import api from "../src/lib/api";
import { ThemedModal } from "../src/components/ui/ThemedModal";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const [isNameModalVisible, setIsNameModalVisible] = React.useState(false);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = React.useState(false);
  const [newName, setNewName] = React.useState(user?.displayName || "");
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [pendingAvatar, setPendingAvatar] = React.useState<{ uri: string; mimeType: string } | null>(null);
  const [errorModal, setErrorModal] = React.useState<{ title: string; message: string } | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = React.useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);

  const openWebPage = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        toolbarColor: colors.background,
      });
    } catch (error) {
      console.error("Failed to open browser:", error);
      Linking.openURL(url);
    }
  };

  React.useEffect(() => {
    if (user?.displayName) {
      setNewName(user.displayName);
    }
  }, [user?.displayName]);

  const showError = (title: string, message: string) => {
    setErrorModal({ title, message });
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    setIsUpdating(true);
    try {
      await authClient.updateProfile({ displayName: newName.trim() });
      setIsNameModalVisible(false);
    } catch (error) {
      showError("Update Failed", "Failed to update display name. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const closeAvatarModal = () => {
    if (isUploadingAvatar) return;
    setPendingAvatar(null);
    setIsAvatarModalVisible(false);
  };

  const handleChooseAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showError("Permission Required", "Allow access to your photo library to change your avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_AVATAR_SIZE_BYTES) {
      showError("File Too Large", "Please choose an image under 2 MB.");
      return;
    }

    setPendingAvatar({ uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" });
  };

  const handleSaveAvatar = async () => {
    if (!pendingAvatar || !user) return;

    setIsUploadingAvatar(true);
    try {
      const filename = pendingAvatar.uri.split("/").pop() ?? "avatar.jpg";
      const formData = new FormData();
      formData.append("file", {
        uri: pendingAvatar.uri,
        name: filename,
        type: pendingAvatar.mimeType,
      } as any);

      const response = await api.post("/auth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const avatarUrl: string = response.data.data.avatarUrl;
      setUser({ ...user, avatarUrl });
      setPendingAvatar(null);
      setIsAvatarModalVisible(false);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Upload failed. Please try again.";
      showError("Upload Failed", message);
    } finally {
      setIsUploadingAvatar(false);
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

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await authClient.deleteAccount();
      router.replace("/");
    } catch (error: any) {
      setIsDeleteModalVisible(false);
      showError(
        t("settings.deleteAccount.errorTitle", "Delete Failed"),
        error?.response?.data?.message ?? t("settings.deleteAccount.errorMessage", "Failed to delete account. Please try again.")
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const hasVerifiedPhone = Boolean(
    user?.phoneNumber &&
    user.phoneNumber.startsWith("+255") &&
    user.accountType !== "GUEST"
  );
  const avatarSource = pendingAvatar?.uri ?? user?.avatarUrl ?? user?.image;
  const avatarSettingValue = pendingAvatar
    ? t("settings.account.photoPending", "Unsaved")
    : avatarSource
      ? t("settings.account.photoChange", "Change")
      : t("settings.account.photoAdd", "Add");
  const avatarModalActions = [
    {
      label: t("common.cancel", "Cancel"),
      onPress: closeAvatarModal,
      type: "secondary" as const,
    },
    ...(pendingAvatar
      ? [
          {
            label: t("common.save", "Save"),
            onPress: handleSaveAvatar,
            type: "primary" as const,
            loading: isUploadingAvatar,
          },
        ]
      : []),
  ];

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
    showPreview = false,
    previewUri,
  }: {
    icon: any;
    label: string;
    value?: string;
    onPress?: () => void;
    showChevron?: boolean;
    valueColor?: string;
    showPreview?: boolean;
    previewUri?: string;
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
        {showPreview &&
          (previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.settingAvatar} />
          ) : (
            <View style={styles.settingAvatarPlaceholder}>
              <User color={colors.primary} size={14} />
            </View>
          ))}
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
            icon={Camera}
            label={t("settings.account.photo", "Profile Photo")}
            value={avatarSettingValue}
            valueColor={pendingAvatar ? colors.primary : colors.textSecondary}
            onPress={() => setIsAvatarModalVisible(true)}
            showPreview={true}
            previewUri={avatarSource}
          />
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
            onPress={() => openWebPage(SUPPORT_URLS.privacy)}
          />
          <SettingItem
            icon={HelpCircle}
            label={t("settings.legal.rules", "Game Rules")}
            onPress={() => openWebPage(SUPPORT_URLS.rules)}
          />
        </Section>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color={colors.danger} size={20} />
          <Text style={styles.logoutText}>{t("settings.actions.signOut", "Sign Out")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountButton} onPress={() => setIsDeleteModalVisible(true)}>
          <Trash2 color={colors.textDisabled} size={16} />
          <Text style={styles.deleteAccountText}>{t("settings.actions.deleteAccount", "Delete Account")}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>TzDraft Mobile v{Constants.expoConfig?.version || "1.4.2"}</Text>
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

      <ThemedModal
        visible={isAvatarModalVisible}
        onClose={closeAvatarModal}
        dismissable={!isUploadingAvatar}
        label={t("settings.account.photo", "Profile Photo")}
        title={t("settings.account.photoTitle", "Update profile photo")}
        subtitle={
          pendingAvatar
            ? t("settings.account.photoSubtitlePending", "Preview your new photo, then save to apply it.")
            : t("settings.account.photoSubtitle", "Choose a square image under 2 MB for the best result.")
        }
        icon={Camera}
        iconBg={colors.primaryAlpha10}
        iconColor={colors.primary}
        actions={avatarModalActions}
      >
        <View style={styles.avatarModalBody}>
          <View style={styles.avatarPreview}>
            {avatarSource ? (
              <Image source={{ uri: avatarSource }} style={styles.avatarPreviewImage} />
            ) : (
              <User color={colors.primary} size={42} />
            )}
          </View>
          <Text style={styles.avatarModalHint}>
            {pendingAvatar
              ? t("settings.account.photoHelperPending", "Your new photo is ready. Tap Save to update your account.")
              : t("settings.account.photoHelper", "You can pick a new image now and only publish it after you save.")}
          </Text>
          <TouchableOpacity
            style={styles.avatarPickerButton}
            onPress={handleChooseAvatar}
            disabled={isUploadingAvatar}
            activeOpacity={0.85}
          >
            <Text style={styles.avatarPickerButtonText}>
              {pendingAvatar
                ? t("settings.account.photoReplace", "Choose another photo")
                : t("settings.account.photoChoose", "Choose photo")}
            </Text>
          </TouchableOpacity>
        </View>
      </ThemedModal>

      <ThemedModal
        visible={isDeleteModalVisible}
        onClose={() => !isDeletingAccount && setIsDeleteModalVisible(false)}
        dismissable={!isDeletingAccount}
        label={t("settings.deleteAccount.label", "Danger Zone")}
        title={t("settings.deleteAccount.title", "Delete your account?")}
        subtitle={t(
          "settings.deleteAccount.subtitle",
          "Your account will be scheduled for deletion. You have 30 days to sign back in and recover it. After that, it's gone permanently."
        )}
        icon={Trash2}
        iconBg={colors.dangerAlpha20}
        iconColor={colors.danger}
        actions={[
          {
            label: t("common.cancel", "Cancel"),
            onPress: () => setIsDeleteModalVisible(false),
            type: "secondary",
          },
          {
            label: t("settings.deleteAccount.confirm", "Yes, Delete"),
            onPress: handleDeleteAccount,
            type: "primary",
            loading: isDeletingAccount,
          },
        ]}
      />

      <ThemedModal
        visible={!!errorModal}
        onClose={() => setErrorModal(null)}
        label={t("common.error", "Error")}
        title={errorModal?.title ?? ""}
        subtitle={errorModal?.message ?? ""}
        icon={errorModal?.title === "File Too Large" ? ImageOff : AlertCircle}
        iconBg={colors.dangerAlpha20}
        iconColor={colors.danger}
        actions={[
          {
            label: t("common.done", "Done"),
            onPress: () => setErrorModal(null),
            type: "primary",
          },
        ]}
      />
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
  settingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  settingAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    alignItems: "center",
    justifyContent: "center",
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
  deleteAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginTop: 8,
    gap: 6,
  },
  deleteAccountText: {
    color: colors.textDisabled,
    fontSize: 13,
  },
  versionText: {
    color: colors.textDisabled,
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
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
  avatarModalBody: {
    alignItems: "center",
  },
  avatarPreview: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 16,
  },
  avatarPreviewImage: {
    width: "100%",
    height: "100%",
  },
  avatarModalHint: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  avatarPickerButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarPickerButtonText: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "700",
  },
});
