import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  ArrowLeft, 
  Globe, 
  Smartphone, 
  Users, 
  Clock3, 
  Shuffle, 
  Check,
  ChevronDown,
  Wifi,
  Monitor,
  QrCode,
  Copy
} from "lucide-react-native";
import { useAuthStore } from "../../src/auth/auth-store";
import { colors } from "../../src/theme/colors";

const TIME_OPTIONS = [0, 3, 5, 10, 30] as const;
type TimeOption = (typeof TIME_OPTIONS)[number];

type SetupTab = "online" | "local";

export default function SetupFriendScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<SetupTab>("online");
  const [selectedColor, setSelectedColor] = useState<"WHITE" | "BLACK" | "RANDOM">("RANDOM");
  const [selectedTime, setSelectedTime] = useState<TimeOption>(10);
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [passDevice, setPassDevice] = useState(true);

  // Time Option Label Helper
  const getTimeLabel = (time: number) => {
    if (time === 0) return t("setupAi.time.noTime", "No time");
    return t("setupAi.time.minutes", { minutes: time });
  };

  const renderColorPicker = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {activeTab === "online" 
          ? t("setupFriend.online.yourColor", "Your color") 
          : t("setupFriend.local.playerOneColor", "Player 1 plays as")}
      </Text>
      <View style={styles.colorGrid}>
        {(["WHITE", "RANDOM", "BLACK"] as const).map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorCard,
              selectedColor === color && styles.colorCardSelected
            ]}
            onPress={() => setSelectedColor(color)}
          >
            <View style={[
              styles.colorIconContainer,
              selectedColor === color ? styles.colorIconContainerActive : styles.colorIconContainerInactive
            ]}>
              {color === "WHITE" && <View style={styles.whiteIcon} />}
              {color === "BLACK" && <View style={styles.blackIcon} />}
              {color === "RANDOM" && <Shuffle size={18} color={selectedColor === color ? colors.foreground : colors.textSubtle} />}
            </View>
            <Text style={[
              styles.colorLabel,
              selectedColor === color && styles.colorLabelActive
            ]}>
              {t(`setupFriend.colors.${color.toLowerCase()}`)}
            </Text>
            {selectedColor === color && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTimePicker = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t("setupFriend.timeControl", "Time control")}</Text>
      <TouchableOpacity 
        style={styles.timeSelector}
        onPress={() => setTimeMenuOpen(true)}
      >
        <View style={styles.timeSelectorLeft}>
          <View style={styles.timeIconContainer}>
            <Clock3 size={20} color={colors.primary} />
          </View>
          <Text style={styles.timeValue}>{getTimeLabel(selectedTime)}</Text>
        </View>
        <ChevronDown size={20} color="#737373" />
      </TouchableOpacity>
    </View>
  );

  const renderOnlineTab = () => (
    <View style={styles.tabContent}>
      {/* Banner */}
      <View style={styles.bannerCard}>
        <View style={styles.bannerIconContainer}>
          <Wifi size={24} color="#38bdf8" />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>{t("setupFriend.online.bannerTitle", "Online PvP")}</Text>
          <Text style={styles.bannerDesc}>{t("setupFriend.online.bannerDesc", "create a game and share the invite link with your friend.")}</Text>
        </View>
      </View>

      {renderColorPicker()}
      {renderTimePicker()}

      <View style={styles.actionSection}>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            {t("setupFriend.online.createGame", "Create Game")}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t("auth.or", "OR")}</Text>
          <View style={styles.dividerLine} />
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
          <TouchableOpacity 
            style={[styles.secondaryButton, !joinCode && styles.buttonDisabled]}
            disabled={!joinCode}
          >
            <Text style={styles.secondaryButtonText}>
              {t("setupFriend.online.joinGame", "Join Game")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderLocalTab = () => (
    <View style={styles.tabContent}>
      {/* Banner */}
      <View style={styles.bannerCard}>
        <View style={[styles.bannerIconContainer, { backgroundColor: colors.primaryAlpha10 }]}>
          <Monitor size={24} color={colors.primary} />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>{t("setupFriend.local.bannerTitle", "Pass-and-play")}</Text>
          <Text style={styles.bannerDesc}>{t("setupFriend.local.bannerDesc", "two players share the same device, taking turns on the same board.")}</Text>
        </View>
      </View>

      {renderColorPicker()}
      {renderTimePicker()}

      {/* Pass Device Toggle */}
      <TouchableOpacity 
        style={styles.toggleCard}
        onPress={() => setPassDevice(!passDevice)}
      >
        <View style={styles.toggleText}>
          <Text style={styles.toggleTitle}>{t("setupFriend.local.passDeviceTitle", "Pass-device screen")}</Text>
          <Text style={styles.toggleDesc}>{t("setupFriend.local.passDeviceDesc", "Show a handoff screen between turns")}</Text>
        </View>
        <View style={[styles.switch, passDevice && styles.switchOn]}>
          <View style={[styles.switchHandle, passDevice && styles.switchHandleOn]} />
        </View>
      </TouchableOpacity>

      <View style={styles.actionSection}>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            {t("setupFriend.local.playNow", "Play Now")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["left", "right", "bottom"]}>
      {/* Header */}
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
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

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
              <Globe size={18} color={activeTab === "online" ? colors.foreground : colors.textSubtle} />
              <Text style={[styles.tabLabel, activeTab === "online" && styles.tabLabelActive]}>
                {t("setupFriend.tabs.online", "Online")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === "local" && styles.tabActive]}
              onPress={() => setActiveTab("local")}
            >
              <Smartphone size={18} color={activeTab === "local" ? colors.foreground : colors.textSubtle} />
              <Text style={[styles.tabLabel, activeTab === "local" && styles.tabLabelActive]}>
                {t("setupFriend.tabs.local", "Local")}
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "online" ? renderOnlineTab() : renderLocalTab()}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Time Selection Bottom Sheet Mock */}
      {timeMenuOpen && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            onPress={() => setTimeMenuOpen(false)} 
          />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{t("setupAi.selectTime")}</Text>
            </View>
            <View style={styles.sheetContent}>
              {TIME_OPTIONS.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeOption,
                    selectedTime === time && styles.timeOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedTime(time);
                    setTimeMenuOpen(false);
                  }}
                >
                  <View style={[
                    styles.timeOptionIcon,
                    selectedTime === time && styles.timeOptionIconActive
                  ]}>
                    <Clock3 size={20} color={selectedTime === time ? colors.primary : colors.textSubtle} />
                  </View>
                  <Text style={[
                    styles.timeOptionLabel,
                    selectedTime === time && styles.timeOptionLabelActive
                  ]}>
                    {getTimeLabel(time)}
                  </Text>
                  {selectedTime === time && <Check size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
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
  hero: {
    padding: 24,
    paddingTop: 16,
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryAlpha10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryAlpha15,
    marginBottom: 16,
    gap: 6,
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: colors.foreground,
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
  },
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
    zIndex: 10,
  },
  tabSwitcher: {
    flexDirection: "row",
    marginHorizontal: 24,
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    color: colors.textSubtle,
    fontSize: 14,
    fontWeight: "bold",
  },
  tabLabelActive: {
    color: colors.foreground,
  },
  tabContent: {
    paddingHorizontal: 24,
    gap: 24,
  },
  bannerCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 16,
  },
  bannerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
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
  },
  bannerDesc: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.textDisabled,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  colorGrid: {
    flexDirection: "row",
    gap: 12,
  },
  colorCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
    overflow: "hidden",
  },
  colorCardSelected: {
    backgroundColor: colors.primaryAlpha05,
    borderColor: colors.primaryAlpha30,
  },
  colorIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
  },
  colorIconContainerInactive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
  },
  colorIconContainerActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
  },
  whiteIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.pieceWhite,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  blackIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.pieceBlack,
    borderWidth: 1,
    borderColor: colors.surfaceElevated,
  },
  colorLabel: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "900",
  },
  colorLabelActive: {
    color: colors.foreground,
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: "25%",
    right: "25%",
    height: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  timeSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryAlpha10,
    alignItems: "center",
    justifyContent: "center",
  },
  timeValue: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "bold",
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "900",
  },
  toggleDesc: {
    color: colors.textSubtle,
    fontSize: 12,
    marginTop: 2,
  },
  switch: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceElevated,
    padding: 2,
  },
  switchOn: {
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
    transform: [{ translateX: 22 }],
  },
  actionSection: {
    gap: 16,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.5,
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
    fontSize: 12,
    fontWeight: "bold",
  },
  joinSection: {
    gap: 12,
  },
  codeInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 4,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sheetHeader: {
    alignItems: "center",
    paddingVertical: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
    marginBottom: 16,
  },
  sheetTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
  sheetContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  timeOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 16,
    backgroundColor: colors.surface,
  },
  timeOptionSelected: {
    backgroundColor: colors.primaryAlpha10,
  },
  timeOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  timeOptionIconActive: {
    backgroundColor: colors.primaryAlpha10,
  },
  timeOptionLabel: {
    flex: 1,
    color: colors.textSubtle,
    fontSize: 16,
    fontWeight: "bold",
  },
  timeOptionLabelActive: {
    color: colors.foreground,
  },
});
