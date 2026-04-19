import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../src/auth/auth-store";
import { authClient } from "../src/lib/auth-client";
import { useRouter } from "expo-router";
import { User, LogOut, ChevronLeft, Settings, Shield, Bell, BookMarked, Camera, AlertCircle, ImageOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { colors } from "../src/theme/colors";
import * as ImagePicker from "expo-image-picker";
import api, { API_URL } from "../src/lib/api";
import { ThemedModal } from "../src/components/ui/ThemedModal";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<{ uri: string; mimeType: string } | null>(null);

  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);

  const showError = (title: string, message: string) =>
    setErrorModal({ title, message });

  const handleLogout = async () => {
    await authClient.logout();
    router.replace("/");
  };

  const handleAvatarPress = async () => {
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

    if (asset.fileSize && asset.fileSize > MAX_SIZE_BYTES) {
      showError("File Too Large", "Please choose an image under 2 MB.");
      return;
    }

    // Preview only — user must tap Save to upload
    setPendingAvatar({ uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" });
  };

  const uploadAvatar = async (uri: string, mimeType: string) => {
    setUploading(true);
    try {
      const filename = uri.split("/").pop() ?? "avatar.jpg";
      const token = useAuthStore.getState().token;
      const formData = new FormData();
      formData.append("file", { uri, name: filename, type: mimeType } as any);

      const res = await fetch(`${API_URL}/auth/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        let errMsg = "Upload failed. Please try again.";
        try {
          const errData = await res.json();
          if (errData?.message) errMsg = errData.message;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const responseData = await res.json();
      const avatarUrl: string = responseData.data.avatarUrl;
      setUser({ ...user!, avatarUrl });
      setPendingAvatar(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Upload failed. Please try again.";
      showError("Upload Failed", msg);
    } finally {
      setUploading(false);
    }
  };

  const avatarSource = pendingAvatar?.uri ?? user?.avatarUrl ?? user?.image;

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
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            disabled={uploading}
            activeOpacity={0.8}
          >
            {avatarSource ? (
              <Image source={{ uri: avatarSource }} style={styles.avatarImage} />
            ) : (
              <User color={colors.primary} size={48} />
            )}
            <View style={styles.cameraBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Camera size={14} color="#fff" />
              )}
            </View>
          </TouchableOpacity>

          {/* Save / Cancel pending avatar */}
          {pendingAvatar && (
            <View style={styles.pendingActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPendingAvatar(null)}
                disabled={uploading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => uploadAvatar(pendingAvatar.uri, pendingAvatar.mimeType)}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Photo</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.avatarHint}>
            Tap your photo to choose a new one. Changes are only applied after you save.
          </Text>

          <Text style={styles.username}>{user?.displayName || user?.username || "Guest User"}</Text>
          <Text style={styles.email}>{user?.email || "No email provided"}</Text>
          {user?.rating !== undefined && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>ELO: {user.rating}</Text>
            </View>
          )}
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/settings")}>
            <View style={styles.menuIconWrapper}>
              <Settings color={colors.textMuted} size={20} />
            </View>
            <Text style={styles.menuText}>Account Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/notifications")}>
            <View style={styles.menuIconWrapper}>
              <Bell color={colors.textMuted} size={20} />
            </View>
            <Text style={styles.menuText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/game/studies")}>
            <View style={styles.menuIconWrapper}>
              <BookMarked color={colors.textMuted} size={20} />
            </View>
            <Text style={styles.menuText}>{t("studies.title", "My Studies")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/support")}>
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

      {/* Error modal — replaces native Alert */}
      <ThemedModal
        visible={!!errorModal}
        onClose={() => setErrorModal(null)}
        label="Notice"
        title={errorModal?.title ?? ""}
        subtitle={errorModal?.message ?? ""}
        icon={errorModal?.title === "File Too Large" ? ImageOff : AlertCircle}
        iconBg={colors.dangerAlpha20}
        iconColor={colors.danger}
        actions={[
          {
            label: "Got it",
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
    overflow: "visible",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  pendingActions: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "700",
  },
  saveBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  saveBtnText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  avatarHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 16,
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
