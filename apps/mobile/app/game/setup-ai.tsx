import React, { useState, useMemo } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  SafeAreaView, 
  Dimensions,
  Modal,
  Platform
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { 
  X, 
  ArrowLeft,
  Clock, 
  Shuffle, 
  ChevronRight, 
  Lock, 
  CheckCircle2, 
  Trophy,
  Swords,
  Shield,
  Zap,
  Flame,
  Skull,
  ChevronDown,
  Circle
} from "lucide-react-native";
import { BOTS, TIERS, BOT_IMAGES, getTierForLevel } from "../../src/lib/game/bots";
import { useAuthStore } from "../../src/auth/auth-store";

const { width, height } = Dimensions.get("window");

const TIME_OPTIONS = [0, 3, 5, 10, 30] as const;
type TimeOption = (typeof TIME_OPTIONS)[number];

export default function SetupAiScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [selectedBot, setSelectedBot] = useState(BOTS[0]);
  const [selectedColor, setSelectedColor] = useState<"WHITE" | "BLACK" | "RANDOM">("RANDOM");
  const [selectedTime, setSelectedTime] = useState<TimeOption>(0);
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // For now, assume levels 1-5 are unlocked for guests, more for registered
  const maxUnlockedLevel = user?.accountType === "REGISTERED" ? 19 : 5;

  const handleStartGame = () => {
    setLoading(true);
    // In a real app, this would navigate to the game screen with params
    console.log("Starting match vs", selectedBot.name, selectedColor, selectedTime);
    setTimeout(() => setLoading(false), 1000);
  };

  const getTimeLabel = (time: number) => {
    if (time === 0) return t("setupAi.time.noTime", "No time");
    return t("setupAi.time.minutes", { minutes: time });
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
          isSelected && { borderColor: "#f59e0b", backgroundColor: "rgba(245, 158, 11, 0.05)" },
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
              <Lock color="#737373" size={20} />
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
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.floatingBackButton} 
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <ArrowLeft color="#fff" size={24} />
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
            <Clock color="#a3a3a3" size={20} />
            <Text style={styles.controlLabel}>{getTimeLabel(selectedTime)}</Text>
            <ChevronDown color="#525252" size={16} />
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
              <Shuffle color={selectedColor === "RANDOM" ? "#f59e0b" : "#737373"} size={20} />
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
          disabled={loading}
        >
          <Text style={styles.startButtonText}>
            {loading ? t("setupAi.start.loading", "Starting...") : `${t("setupAi.start.cta", "Start Game")} — ${selectedBot.name}`}
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
            <View style={styles.timeGrid}>
               {TIME_OPTIONS.map((time) => (
                 <TouchableOpacity 
                   key={time}
                   style={[styles.timeOption, selectedTime === time && styles.activeTimeOption]}
                   onPress={() => {
                     setSelectedTime(time);
                     setTimeMenuOpen(false);
                   }}
                 >
                   <Clock color={selectedTime === time ? "#f59e0b" : "#a3a3a3"} size={24} />
                   <Text style={[styles.timeOptionText, selectedTime === time && styles.activeTimeOptionText]}>
                     {getTimeLabel(time)}
                   </Text>
                 </TouchableOpacity>
               ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030307",
  },
  floatingBackButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 10 : 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(17, 17, 17, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    borderWidth: 1,
    borderColor: "#1a1a1a",
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
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
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
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroBotName: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
  },
  heroDescription: {
    color: "#a3a3a3",
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
    color: "#525252",
    fontSize: 10,
    fontWeight: "900",
  },
  botGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  botCard: {
    width: (width - 32 - 20) / 3, // 3 columns
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1a1a1a",
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
    backgroundColor: "#0a0a0a",
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
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#111",
  },
  botInfo: {
    alignItems: "center",
  },
  botName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  botElo: {
    color: "#737373",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(3, 3, 7, 0.95)",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
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
    backgroundColor: "#111",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  controlLabel: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  colorSelector: {
    flexDirection: "row",
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  colorIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  activeColor: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  colorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  startButton: {
    height: 56,
    backgroundColor: "#f59e0b",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  drawUpContent: {
    backgroundColor: "#111",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: 300,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  drawUpHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  drawUpTitle: {
    color: "#fff",
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
    backgroundColor: "#0a0a0a",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  activeTimeOption: {
    borderColor: "#f59e0b",
    backgroundColor: "rgba(245, 158, 11, 0.05)",
  },
  timeOptionText: {
    color: "#a3a3a3",
    fontSize: 16,
    fontWeight: "bold",
  },
  activeTimeOptionText: {
    color: "#fff",
  },
});
