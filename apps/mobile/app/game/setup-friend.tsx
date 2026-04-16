import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Globe,
  Smartphone,
  Users,
  Shuffle,
  ChevronDown,
  Wifi,
  Monitor,
  Clock,
  UserPlus,
} from "lucide-react-native";
import { useAuthStore } from "../../src/auth/auth-store";
import { colors } from "../../src/theme/colors";
import { GuestBarrierModal } from "../../src/components/auth/GuestBarrierModal";

const TIME_OPTIONS = [0, 3, 5, 10, 30] as const;
type TimeOption = (typeof TIME_OPTIONS)[number];

type SetupTab = "online" | "local";

export default function SetupFriendScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const isGuest = user?.accountType === "GUEST";

  const [activeTab, setActiveTab] = useState<SetupTab>(isGuest ? "local" : "online");
  const [selectedColor, setSelectedColor] = useState<"WHITE" | "BLACK" | "RANDOM">("RANDOM");
  const [selectedTime, setSelectedTime] = useState<TimeOption>(10);
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [passDevice, setPassDevice] = useState(true);
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Online PvP Restriction: Always ensure time is selected
  useEffect(() => {
    if (activeTab === "online" && selectedTime === 0) {
      setSelectedTime(10);
    }
  }, [activeTab, selectedTime]);

  const handleCreateGame = () => {
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }
    console.log("Create Online Game");
  };

  const handleJoinGame = () => {
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }
    if (!joinCode) return;
    console.log("Join Online Game", joinCode);
  };

  const handlePlayLocal = () => {
    console.log("Start Local Game");
  };

  const getTimeLabel = (time: number) => {
    if (time === 0) return t("setupAi.time.noTime", "No time");
    return `${time} min`;
  };

  const renderOnlineTab = () => (
    <View style={styles.tabContent}>
      {isGuest && (
        <View style={[styles.bannerCard, { borderColor: colors.primaryAlpha30, backgroundColor: colors.primaryAlpha05 }]}>
          <View style={[styles.bannerIconContainer, { backgroundColor: colors.primaryAlpha10, borderColor: colors.primaryAlpha30 }]}>
            <UserPlus size={24} color={colors.primary} />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>{t("auth.guestPopup.label", "Registration Required")}</Text>
            <Text style={styles.bannerDesc}>{t("auth.onlineLoginDesc", "Create an account to play online matches, track ratings, and join tournaments.")}</Text>
          </View>
        </View>
      )}

      <View style={styles.bannerCard}>
        <View style={[styles.bannerIconContainer, { backgroundColor: "rgba(56,189,248,0.10)", borderColor: "rgba(56,189,248,0.20)" }]}>
          <Wifi size={24} color="#38bdf8" />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>{t("setupFriend.online.bannerTitle", "Online PvP")}</Text>
          <Text style={styles.bannerDesc}>{t("setupFriend.online.bannerDesc", "Create a game and share the invite link with your friend.")}</Text>
        </View>
      </View>

      <View style={styles.joinSection}>
        <Text style={styles.sectionTitle}>{t("setupFriend.online.enterInviteCode", "Enter invite code")}</Text>
        <TextInput
          style={styles.codeInput}
          value={joinCode}
          onChangeText={(val) => setJoinCode(val.toUpperCase())}
          placeholder="ABC12345"
          placeholderTextColor="#404040"
          autoCapitalize="characters"
          maxLength={8}
        />
        {joinCode.length > 0 && (
          <Text style={styles.joinHint}>
            {t("setupFriend.online.joinHint", "Primary button below will now join this match.")}
          </Text>
        )}
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t("auth.or", "OR")}</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("setupFriend.online.creationTitle", "Host a new game")}</Text>
        <Text style={styles.sectionDesc}>
          {t("setupFriend.online.creationDesc", "Configure the match rules at the bottom and tap Create Game.")}
        </Text>
      </View>
    </View>
  );

  const renderLocalTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.bannerCard}>
        <View style={[styles.bannerIconContainer, { backgroundColor: colors.primaryAlpha10, borderColor: colors.primaryAlpha30 }]}>
          <Monitor size={24} color={colors.primary} />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>{t("setupFriend.local.bannerTitle", "Pass-and-play")}</Text>
          <Text style={styles.bannerDesc}>{t("setupFriend.local.bannerDesc", "Two players share the same device, taking turns on the same board.")}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.toggleCard}
        onPress={() => setPassDevice(!passDevice)}
      >
        <View style={styles.toggleText}>
          <Text style={styles.toggleTitle}>{t("setupFriend.local.passDeviceTitle", "Pass-device screen")}</Text>
          <Text style={styles.toggleDesc}>{t("setupFriend.local.passDeviceDesc", "Show a handoff screen between turns")}</Text>
        </View>
        <View style={[styles.switchTrack, passDevice && styles.switchTrackOn]}>
          <View style={[styles.switchHandle, passDevice && styles.switchHandleOn]} />
        </View>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("setupFriend.local.rulesTitle", "Local rules")}</Text>
        <Text style={styles.sectionDesc}>
          {t("setupFriend.local.rulesDesc", "Set your preferences below and tap Play Now.")}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("setupFriend.title", "Play with a Friend")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.hero}>
            <View style={styles.badge}>
              <Users size={14} color={colors.primary} />
              <Text style={styles.badgeText}>{t("setupFriend.subtitle", "Challenge a friend locally or online")}</Text>
            </View>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "online" && styles.tabActive]}
              onPress={() => setActiveTab("online")}
            >
              <Globe size={18} color={activeTab === "online" ? colors.onPrimary : colors.textSubtle} />
              <Text style={[styles.tabLabel, activeTab === "online" && styles.tabLabelActive]}>
                {t("setupFriend.tabs.online", "Online")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "local" && styles.tabActive]}
              onPress={() => setActiveTab("local")}
            >
              <Smartphone size={18} color={activeTab === "local" ? colors.onPrimary : colors.textSubtle} />
              <Text style={[styles.tabLabel, activeTab === "local" && styles.tabLabelActive]}>
                {t("setupFriend.tabs.local", "Local")}
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "online" ? renderOnlineTab() : renderLocalTab()}

          <View style={{ height: 180 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Footer */}
      <View style={styles.footer}>
        <View style={styles.controlsRow}>
          {/* Time Selector */}
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setTimeMenuOpen(true)}
            activeOpacity={0.8}
          >
            <Clock color={colors.textMuted} size={20} />
            <Text style={styles.controlLabel}>{getTimeLabel(selectedTime)}</Text>
            <ChevronDown color={colors.textDisabled} size={16} />
          </TouchableOpacity>

          {/* Color Selector */}
          <View style={styles.colorSelector}>
            <TouchableOpacity
              style={[styles.colorIcon, selectedColor === "WHITE" && styles.activeColor]}
              onPress={() => setSelectedColor("WHITE")}
            >
              <View style={[styles.colorCircle, { backgroundColor: "#fff" }]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.colorIcon, selectedColor === "RANDOM" && styles.activeColor]}
              onPress={() => setSelectedColor("RANDOM")}
            >
              <Shuffle color={selectedColor === "RANDOM" ? colors.primary : colors.textSubtle} size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.colorIcon, selectedColor === "BLACK" && styles.activeColor]}
              onPress={() => setSelectedColor("BLACK")}
            >
              <View style={[styles.colorCircle, { backgroundColor: "#000", borderWidth: 1, borderColor: "#333" }]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => {
            if (activeTab === "online") {
              if (joinCode.length > 0) handleJoinGame();
              else handleCreateGame();
            } else {
              handlePlayLocal();
            }
          }}
        >
          <Text style={styles.startButtonText}>
            {activeTab === "local"
              ? t("setupFriend.local.playNow", "Play Now")
              : joinCode.length > 0
              ? t("setupFriend.online.joinGame", "Join Game")
              : t("setupFriend.online.createGame", "Create Game")}
          </Text>
        </TouchableOpacity>
      </View>

      <GuestBarrierModal
        visible={showGuestModal}
        onClose={() => setShowGuestModal(false)}
      />

      {/* Time Selection Bottom Sheet */}
      <Modal
        visible={timeMenuOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTimeMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTimeMenuOpen(false)}
        >
          <View style={styles.drawUpContent}>
            <View style={styles.drawUpHandle} />
            <Text style={styles.drawUpTitle}>{t("setupAi.selectTime", "Match Time")}</Text>

            <Text style={styles.timeGroupLabel}>{t("setupFriend.online.timeGroupLabel", "MATCH TIME")}</Text>
            <View style={styles.timeGrid}>
              {TIME_OPTIONS.filter((t) => t > 0).map((time) => {
                const active = selectedTime === time;
                return (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeOption, active && styles.activeTimeOption]}
                    onPress={() => {
                      setSelectedTime(time);
                      setTimeMenuOpen(false);
                    }}
                  >
                    <Clock color={active ? colors.primary : colors.textMuted} size={24} />
                    <Text style={[styles.timeOptionText, active && styles.activeTimeOptionText]}>
                      {time} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {activeTab === "local" && (
              <TouchableOpacity
                style={[styles.noTimeOption, selectedTime === 0 && styles.activeTimeOption]}
                onPress={() => {
                  setSelectedTime(0);
                  setTimeMenuOpen(false);
                }}
              >
                <Text style={[styles.timeOptionText, selectedTime === 0 && styles.activeTimeOptionText]}>
                  {t("setupAi.time.noTime", "No time")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    height: 60,
  },
  headerTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
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
  // ── Hero / Badge ─────────────────────────────────────────────────────────────
  hero: {
    padding: 24,
    paddingTop: 16,
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryAlpha10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.primaryAlpha15,
    marginBottom: 8,
    gap: 8,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  // ── Tab Switcher ─────────────────────────────────────────────────────────────
  tabSwitcher: {
    flexDirection: "row",
    marginHorizontal: 24,
    backgroundColor: colors.surface,
    padding: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    gap: 8,
    borderRadius: 18,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    color: colors.textSubtle,
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: colors.onPrimary,
  },
  // ── Tab Content ──────────────────────────────────────────────────────────────
  tabContent: {
    paddingHorizontal: 24,
    gap: 24,
  },
  bannerCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 16,
  },
  bannerIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bannerDesc: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionDesc: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  // ── Online Tab ───────────────────────────────────────────────────────────────
  joinSection: {
    gap: 12,
  },
  codeInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    height: 72,
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 8,
  },
  joinHint: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textDisabled,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  // ── Local Tab ────────────────────────────────────────────────────────────────
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  toggleDesc: {
    color: colors.textSubtle,
    fontSize: 12,
    marginTop: 4,
  },
  switchTrack: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    padding: 3,
  },
  switchTrackOn: {
    backgroundColor: colors.primary,
  },
  switchHandle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.foreground,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchHandleOn: {
    transform: [{ translateX: 24 }],
  },
  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  timeButton: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlLabel: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "bold",
  },
  colorSelector: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  activeColor: {
    backgroundColor: colors.primaryAlpha15,
  },
  colorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  startButton: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  // ── Time Bottom Sheet ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  drawUpContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: 300,
    borderWidth: 1,
    borderColor: colors.border,
  },
  drawUpHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  drawUpTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
  },
  timeGroupLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 10,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  timeOption: {
    flex: 1,
    minWidth: "45%",
    height: 100,
    backgroundColor: colors.background,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTimeOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha05,
  },
  timeOptionText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: "bold",
  },
  activeTimeOptionText: {
    color: colors.foreground,
  },
  noTimeOption: {
    marginTop: 16,
    height: 56,
    backgroundColor: colors.background,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
