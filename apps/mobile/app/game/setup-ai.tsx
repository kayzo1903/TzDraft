import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  Modal,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Clock,
  Shuffle,
  Lock,
  CheckCircle2,
  Swords,
  Shield,
  Zap,
  Flame,
  Skull,
  ChevronDown,
} from "lucide-react-native";
import { BOTS, TIERS, BOT_IMAGES, getTierForLevel } from "../../src/lib/game/bots";
import type { TimeControl } from "../../src/hooks/useAiGame";
import { useAuthStore } from "../../src/auth/auth-store";
import { colors } from "../../src/theme/colors";
import { aiChallengeService } from "../../src/services/ai-challenge.service";
import { getLocalBotProgressSnapshot, getCachedMaxUnlockedLevel } from "../../src/lib/game/bot-progression";

const { width } = Dimensions.get("window");

// ─── Time control options ─────────────────────────────────────────────────────
type TimeControlOption = { tc: TimeControl; label: string; sub: string };

const TOTAL_OPTIONS: TimeControlOption[] = [
  { tc: { type: "total",    seconds: 180 }, label: "3 min",  sub: "Per player" },
  { tc: { type: "total",    seconds: 300 }, label: "5 min",  sub: "Per player" },
];

const PER_MOVE_OPTIONS: TimeControlOption[] = [
  { tc: { type: "per_move", seconds: 30  }, label: "30s",    sub: "Per move" },
  { tc: { type: "per_move", seconds: 15  }, label: "15s",    sub: "Per move" },
  { tc: { type: "per_move", seconds: 5   }, label: "5s",     sub: "Per move" },
];

const NO_TIME_OPTION: TimeControlOption =
  { tc: { type: "none" }, label: "No time", sub: "Untimed" };

function tcEqual(a: TimeControl, b: TimeControl): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "none") return true;
  return (a as any).seconds === (b as any).seconds;
}

function getTimeControlLabel(tc: TimeControl): string {
  if (tc.type === "none") return "No time";
  if (tc.type === "total") return tc.seconds === 180 ? "3 min" : "5 min";
  const s = (tc as { type: "per_move"; seconds: number }).seconds;
  return `${s}s / move`;
}

export default function SetupAiScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [selectedBot, setSelectedBot] = useState(BOTS[0]);
  const [selectedColor, setSelectedColor] = useState<"WHITE" | "BLACK" | "RANDOM">("RANDOM");
  const [selectedTC, setSelectedTC] = useState<TimeControl>({ type: "none" });
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  // getCachedMaxUnlockedLevel() is synchronous — returns the value from the
  // last AsyncStorage read (or the last server response) so the screen renders
  // with the correct unlock state on the first frame, no flash.
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(getCachedMaxUnlockedLevel);

  const isRegistered = user?.accountType === "REGISTERED";

  // For registered users: getProgression() returns the in-memory cache on
  // every open after the first — no network call, no delay.
  // For guests: AsyncStorage read is fast and also backed by _cachedMax.
  useEffect(() => {
    if (isRegistered) {
      aiChallengeService.getProgression()
        .then((p) => setMaxUnlockedLevel(p.highestUnlockedAiLevel))
        .catch(() => {
          getLocalBotProgressSnapshot()
            .then((s) => setMaxUnlockedLevel(s.maxUnlockedAiLevel))
            .catch(() => {});
        });
    } else {
      getLocalBotProgressSnapshot()
        .then((s) => setMaxUnlockedLevel(s.maxUnlockedAiLevel))
        .catch(() => {});
    }
  }, [isRegistered]);

  const handleStartGame = () => {
    const timeSeconds = selectedTC.type === "none" ? 0 : (selectedTC as any).seconds;
    router.replace(
      `/game/vs-ai?botLevel=${selectedBot.level}&playerColor=${selectedColor}&timeControlType=${selectedTC.type}&timeSeconds=${timeSeconds}` as any,
    );
  };

  const renderTierHeader = (tier: any) => {
    const Icon = tier.label === "Beginner" ? Shield : 
                 tier.label === "Casual" ? Zap : 
                 tier.label === "Competitive" ? Swords : 
                 tier.label === "Expert" ? Flame : Skull;
    
    return (
      <View key={tier.label} style={[styles.tierHeader, { borderBottomColor: tier.color }]}>
        <View style={styles.tierTitleRow}>
          <Icon color={tier.color} size={14} />
          <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.label.toUpperCase()}</Text>
        </View>
        <Text style={styles.tierRange}>{tier.range[0]}-{tier.range[1]}</Text>
      </View>
    );
  };

  const renderBotCard = (bot: any) => {
    const isSelected = selectedBot.level === bot.level;
    const isLocked = bot.level > maxUnlockedLevel;
    const tier = getTierForLevel(bot.level);

    return (
      <TouchableOpacity 
        key={bot.level}
        style={[
          styles.botCard,
          isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryAlpha05 },
          isLocked && styles.lockedCard
        ]}
        onPress={() => !isLocked && setSelectedBot(bot)}
        activeOpacity={0.7}
      >
        <View style={styles.botImageContainer}>
          <Image 
            source={BOT_IMAGES[bot.imageKey]} 
            style={[styles.botAvatar, isLocked && { opacity: 0.3 }]}
          />
          {isLocked && (
            <View style={styles.lockOverlay}>
              <Lock color={colors.textSubtle} size={20} />
            </View>
          )}
          {isSelected && (
            <View style={styles.selectedBadge}>
              <CheckCircle2 color="#fff" size={14} />
            </View>
          )}
        </View>
        <View style={styles.botInfo}>
          <Text style={styles.botName} numberOfLines={1}>{bot.name}</Text>
          <Text style={styles.botElo}>{bot.elo}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <TouchableOpacity 
        style={styles.floatingBackButton} 
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <ArrowLeft color={colors.foreground} size={24} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.selectedBotHero}>
             <Image source={BOT_IMAGES[selectedBot.imageKey]} style={styles.heroAvatar} />
             <View style={styles.heroOverlay}>
                <Text style={styles.heroTierLabel}>{getTierForLevel(selectedBot.level).label}</Text>
                <Text style={styles.heroBotName}>{selectedBot.name}</Text>
                <Text style={styles.heroDescription}>{selectedBot.description}</Text>
             </View>
          </View>
        </View>

        {TIERS.map(tier => (
          <View key={tier.label} style={styles.tierSection}>
            {renderTierHeader(tier)}
            <View style={styles.botGrid}>
              {BOTS.filter(b => b.level >= tier.range[0] && b.level <= tier.range[1]).map(renderBotCard)}
            </View>
          </View>
        ))}
        
        <View style={{ height: 180 }} />
      </ScrollView>

      {/* Sticky Bottom Footer */}
      <View style={styles.footer}>
        {/* Controls Row */}
        <View style={styles.controlsRow}>
          {/* Time Selector */}
          <TouchableOpacity 
            style={styles.timeButton} 
            onPress={() => setTimeMenuOpen(true)}
            activeOpacity={0.8}
          >
            <Clock color={colors.textMuted} size={20} />
            <Text style={styles.controlLabel}>{getTimeControlLabel(selectedTC)}</Text>
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

        {/* Start Button */}
        <TouchableOpacity 
          style={styles.startButton}
          onPress={handleStartGame}
        >
          <Text style={styles.startButtonText}>
            {`${t("setupAi.start.cta", "Start Game")} — ${selectedBot.name}`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Time Selection Draw-up (Bottom Sheet) */}
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

            {/* ── Group: Game Time ── */}
            <Text style={styles.timeGroupLabel}>GAME TIME</Text>
            <View style={styles.timeGrid}>
              {TOTAL_OPTIONS.map((opt) => {
                const active = tcEqual(selectedTC, opt.tc);
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.timeOption, active && styles.activeTimeOption]}
                    onPress={() => { setSelectedTC(opt.tc); setTimeMenuOpen(false); }}
                  >
                    <Clock color={active ? colors.primary : colors.textMuted} size={24} />
                    <Text style={[styles.timeOptionText, active && styles.activeTimeOptionText]}>{opt.label}</Text>
                    <Text style={styles.timeOptionSub}>{opt.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Group: Per Move ── */}
            <Text style={[styles.timeGroupLabel, { marginTop: 20 }]}>PER MOVE</Text>
            <View style={styles.timeGrid}>
              {PER_MOVE_OPTIONS.map((opt) => {
                const active = tcEqual(selectedTC, opt.tc);
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.timeOption, active && styles.activeTimeOption]}
                    onPress={() => { setSelectedTC(opt.tc); setTimeMenuOpen(false); }}
                  >
                    <Clock color={active ? colors.primary : colors.textMuted} size={24} />
                    <Text style={[styles.timeOptionText, active && styles.activeTimeOptionText]}>{opt.label}</Text>
                    <Text style={styles.timeOptionSub}>{opt.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── No time ── */}
            <TouchableOpacity
              style={[styles.noTimeOption, tcEqual(selectedTC, NO_TIME_OPTION.tc) && styles.activeTimeOption]}
              onPress={() => { setSelectedTC(NO_TIME_OPTION.tc); setTimeMenuOpen(false); }}
            >
              <Text style={[styles.timeOptionText, tcEqual(selectedTC, NO_TIME_OPTION.tc) && styles.activeTimeOptionText]}>
                No time
              </Text>
              <Text style={styles.timeOptionSub}>Untimed</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  floatingBackButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 10 : 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollContent: {
    padding: 16,
  },
  heroSection: {
    marginBottom: 24,
  },
  selectedBotHero: {
    height: 200,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroAvatar: {
    width: "100%",
    height: "100%",
    position: "absolute",
    opacity: 0.6,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  heroTierLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroBotName: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "900",
  },
  heroDescription: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  tierSection: {
    marginBottom: 24,
  },
  tierHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  tierTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  tierRange: {
    color: colors.textDisabled,
    fontSize: 10,
    fontWeight: "900",
  },
  botGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  botCard: {
    width: (width - 32 - 20) / 3,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    alignItems: "center",
  },
  lockedCard: {
    opacity: 0.6,
  },
  botImageContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.background,
    marginBottom: 8,
    position: "relative",
  },
  botAvatar: {
    width: "100%",
    height: "100%",
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  botInfo: {
    alignItems: "center",
  },
  botName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "bold",
  },
  botElo: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2,
  },
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
  timeOptionSub: {
    color: colors.textDisabled,
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 2,
  },
  timeGroupLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 10,
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
