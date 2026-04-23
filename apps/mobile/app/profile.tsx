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
import { User, LogOut, ChevronLeft, Settings as SettingsIcon, Shield, Bell, BookMarked, Camera, AlertCircle, ImageOff, Swords, Flame, Users } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { colors } from "../src/theme/colors";
import * as ImagePicker from "expo-image-picker";
import api, { API_URL } from "../src/lib/api";
import { ThemedModal } from "../src/components/ui/ThemedModal";
import { useSocial } from "../src/hooks/useSocial";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<{ uri: string; mimeType: string } | null>(null);

  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const { getStats, getFriends } = useSocial();
  const [socialStats, setSocialStats] = useState({ followersCount: 0, followingCount: 0, friendsCount: 0 });
  const [friends, setFriends] = useState<any[]>([]);

  React.useEffect(() => {
    getStats().then(setSocialStats);
    getFriends().then(setFriends);
  }, []);
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
        <TouchableOpacity onPress={() => router.push("/settings")} style={styles.settingsButton}>
          <SettingsIcon color={colors.textMuted} size={24} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.profileMainRow}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handleAvatarPress}
              disabled={uploading}
              activeOpacity={0.8}
            >
              {avatarSource ? (
                <Image source={{ uri: avatarSource }} style={styles.avatarImage} />
              ) : (
                <User color={colors.primary} size={40} />
              )}
              <View style={styles.cameraBadge}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Camera size={12} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.profileRightColumn}>
              <View style={styles.profileDetails}>
                <Text style={styles.displayName}>
                  {user?.displayName || "Guest"}{" "}
                  <Text style={styles.username}>@{user?.username || "guest"}</Text>
                </Text>
              </View>

              <View style={styles.statsContainer}>
                <TouchableOpacity style={styles.statItem} onPress={() => router.push("/community/friends")}>
                  <Text style={styles.statValue}>{socialStats.friendsCount}</Text>
                  <Text style={styles.statLabel}>Friends</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.statItem} onPress={() => router.push("/community/friends")}>
                  <Text style={styles.statValue}>{socialStats.followersCount}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.statItem} onPress={() => router.push("/community/friends")}>
                  <Text style={styles.statValue}>{socialStats.followingCount}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </TouchableOpacity>
              </View>

              {user?.rating !== undefined && (
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>Blitz ELO: {user.rating}</Text>
                </View>
              )}
            </View>
          </View>

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
        </View>

        <View style={styles.friendsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Friends</Text>
            <TouchableOpacity onPress={() => router.push("/community/friends")}>
              <Text style={styles.viewAllText}>Manage</Text>
            </TouchableOpacity>
          </View>
          
          {friends.length > 0 ? (
            friends.map((friend) => (
              <TouchableOpacity 
                key={friend.id} 
                style={styles.friendItem}
                onPress={() => router.push(`/game/lobby?challenge=${friend.username}` as any)}
              >
                <View style={styles.friendInfo}>
                  <View style={styles.friendAvatarWrapper}>
                    {friend.avatarUrl ? (
                      <Image source={{ uri: friend.avatarUrl }} style={styles.friendAvatar} />
                    ) : (
                      <View style={styles.friendAvatarPlaceholder}>
                        <User color={colors.textDisabled} size={20} />
                      </View>
                    )}
                    <View style={styles.onlineDot} />
                  </View>
                  <View>
                    <Text style={styles.friendName}>{friend.displayName}</Text>
                    <Text style={styles.friendHandle}>@{friend.username}</Text>
                  </View>
                </View>
                <View style={styles.friendActions}>
                  {friend.isRival && <Flame size={16} color={colors.primary} fill={colors.primary} />}
                  <Swords size={20} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyFriends}>
              <Users color={colors.textDisabled} size={48} strokeWidth={1} />
              <Text style={styles.emptyFriendsText}>Your social circle is quiet...</Text>
              <TouchableOpacity 
                style={styles.findBtn}
                onPress={() => router.push("/game/leaderboard")}
              >
                <Text style={styles.findBtnText}>Find Rivals</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
    marginBottom: 24,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  profileRightColumn: {
    flex: 1,
    marginLeft: 20,
  },
  avatarContainer: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.primaryAlpha10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primaryAlpha15,
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
  },
  statLabel: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  profileDetails: {
    marginTop: 0,
  },
  displayName: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "bold",
  },
  username: {
    color: colors.textSubtle,
    fontSize: 14,
  },
  ratingBadge: {
    backgroundColor: colors.primaryAlpha15,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
  },
  ratingText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  friendsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "bold",
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  friendAvatarWrapper: {
    position: "relative",
    marginRight: 12,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  friendAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  friendName: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "bold",
  },
  friendHandle: {
    color: colors.textSubtle,
    fontSize: 12,
  },
  friendActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyFriends: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  emptyFriendsText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  findBtn: {
    marginTop: 16,
    backgroundColor: colors.primaryAlpha15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  findBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  pendingActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "bold",
  },
  saveBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: colors.onPrimary,
    fontSize: 14,
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
  socialStatsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  socialStat: {
    flex: 1,
    alignItems: "center",
  },
  socialStatValue: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
  },
  socialStatLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },
  socialStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
});
