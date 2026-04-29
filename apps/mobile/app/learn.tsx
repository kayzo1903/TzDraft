import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { BookOpen, ChevronLeft, ArrowRight, Target } from "lucide-react-native";
import { colors } from "../src/theme/colors";
import { fetchTactics, SanityTactic } from "../src/services/sanity.service";
import { puzzleService, Puzzle } from "../src/services/puzzle.service";
import { LinearGradient } from "expo-linear-gradient";
import { LoadingScreen } from "../src/components/ui/LoadingScreen";

const { width } = Dimensions.get("window");

const InProgressBadge = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{t("learn.onProgress", "In Progress")}</Text>
    </View>
  );
};

export default function LearnScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const locale = i18n.language;

  const [tactics, setTactics] = useState<SanityTactic[]>([]);
  const [dailyPuzzle, setDailyPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tacData, daily] = await Promise.all([
        fetchTactics(),
        puzzleService.getDaily(),
      ]);
      setTactics(tacData);
      setDailyPuzzle(daily);
    } catch (error) {
      console.error("[LearnScreen] Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderTactic = (tactic: SanityTactic) => {
    const desc = tactic.description?.[locale as "en" | "sw"] || tactic.description?.en || "";
    
    return (
      <TouchableOpacity key={tactic.slug} style={styles.tacticCard} activeOpacity={0.7}>
        <View style={styles.tacticInfo}>
           <View style={styles.tacticHeader}>
              <Text style={styles.tacticTitle}>{tactic.title}</Text>
              <InProgressBadge />
           </View>
           <Text style={styles.tacticDesc} numberOfLines={2}>{desc}</Text>
           <View style={[styles.diffBadge, styles[`diff_${tactic.difficulty}` as keyof typeof styles] as ViewStyle]}>
             <Text style={styles.diffText}>{tactic.difficulty}</Text>
           </View>
        </View>
      </TouchableOpacity>
    );
  };

  const gamebooks = [
    { id: "1", title: locale === "sw" ? "Mbinu za Katikati (Kopi)" : "Midgame Tactics", sub: locale === "sw" ? "Jukumu la mfalme" : "The role of the king" },
    { id: "2", title: locale === "sw" ? "Mianzo ya Bingwa (Kopi)" : "Championship Openings", sub: locale === "sw" ? "Mitego ya haraka" : "Rapid traps" },
    { id: "3", title: locale === "sw" ? "Ufungaji wa Bodi (Kopi)" : "Board Closures", sub: locale === "sw" ? "Kumaliza mechi" : "Finishing matches" }
  ];

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={colors.textMuted} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("learn.heading", "Learn & Master")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Daily Puzzle Hero */}
        {dailyPuzzle && (
          <TouchableOpacity 
            style={styles.dailyCard}
            onPress={() => router.push(`/game/puzzle-player?id=${dailyPuzzle.id}` as any)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.primary, "#ea580c"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dailyGradient}
            >
              <View style={styles.dailyHeader}>
                <View style={styles.dailyBadge}>
                  <Text style={styles.dailyBadgeText}>{t("learn.dailyChallenge", "DAILY CHALLENGE")}</Text>
                </View>
                <Text style={styles.dailyAttempts}>{dailyPuzzle._count.attempts} {t("learn.attempts", "attempts")}</Text>
              </View>
              <Text style={styles.dailyTitle}>{dailyPuzzle.title || t("learn.dailyPuzzleTitle", "Today's Tactical Moment")}</Text>
              <View style={styles.dailyFooter}>
                <View style={styles.puzzleMeta}>
                  <Text style={styles.puzzleTheme}>{dailyPuzzle.theme.replace("-", " ")}</Text>
                  <Text style={styles.puzzleDiff}>{"★".repeat(dailyPuzzle.difficulty)}</Text>
                </View>
                <View style={styles.solveBtn}>
                  <Text style={styles.solveBtnText}>{t("learn.solveNow", "Solve Now")}</Text>
                  <ArrowRight size={14} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}


        {/* Tactics Playbook (Sanity) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t("learn.tactics", "Tactics Playbook")}</Text>
          </View>
          <View style={styles.card}>
            {tactics.map(renderTactic)}
            {tactics.length === 0 && (
              <Text style={styles.emptyText}>No tactics yet.</Text>
            )}
          </View>
        </View>

        {/* Gamebooks (Kopi) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BookOpen size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t("learn.gamebooks", "Gamebook (kopi)")}</Text>
          </View>
          <View style={styles.card}>
            {gamebooks.map((book, index) => (
              <TouchableOpacity 
                key={book.id} 
                style={[
                  styles.gamebookItem, 
                  index === gamebooks.length - 1 && { borderBottomWidth: 0 }
                ]} 
                activeOpacity={0.7}
              >
                <View style={styles.gamebookContent}>
                  <Text style={styles.gamebookTitle}>{book.title}</Text>
                  <Text style={styles.gamebookSub}>{book.sub}</Text>
                </View>
                <InProgressBadge />
              </TouchableOpacity>
            ))}
          </View>
          
          <LinearGradient
            colors={["rgba(249, 115, 22, 0.1)", "rgba(234, 88, 12, 0.05)"]}
            style={styles.infoBox}
          >
            <Text style={styles.infoText}>
              {locale === "sw" 
                ? "Tunatafsiri 'gamebook' zaidi kuwaletea kopi maarufu za mabingwa wa Tanzania. Kaa mkao wa kula!"
                : "We are translating more gamebooks to bring you the famous 'copies' of Tanzanian champions. Stay tuned!"}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>
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
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  badge: {
    backgroundColor: colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  tacticCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tacticInfo: {
    gap: 8,
  },
  tacticHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tacticTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
  tacticDesc: {
    color: colors.textSubtle,
    fontSize: 12,
    lineHeight: 18,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  diffText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  diff_beginner: { borderColor: "rgba(34, 197, 94, 0.3)", backgroundColor: "rgba(34, 197, 94, 0.1)" },
  diff_intermediate: { borderColor: colors.primaryAlpha30, backgroundColor: colors.primaryAlpha10 },
  diff_pro: { borderColor: "rgba(239, 68, 68, 0.3)", backgroundColor: "rgba(239, 68, 68, 0.1)" },
  gamebookItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gamebookContent: {
    flex: 1,
    marginRight: 12,
  },
  gamebookTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "bold",
  },
  gamebookSub: {
    color: colors.textSubtle,
    fontSize: 12,
    marginTop: 2,
  },
  infoBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.1)",
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 18,
  },
  emptyText: {
    color: colors.textDisabled,
    fontStyle: "italic",
    fontSize: 13,
    padding: 24,
    textAlign: "center",
  },
  footerSpacer: {
    height: 60,
  },
  dailyCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  dailyGradient: {
    padding: 20,
    minHeight: 160,
    justifyContent: "space-between",
  },
  dailyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dailyBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dailyBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  dailyAttempts: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  dailyTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginVertical: 12,
  },
  dailyFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  puzzleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  puzzleTheme: {
    color: "#fff",
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "bold",
    opacity: 0.9,
  },
  puzzleDiff: {
    color: "#fbbf24",
    fontSize: 12,
  },
  solveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  solveBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  puzzleItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  puzzleInfo: {
    flex: 1,
  },
  puzzleTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },
  puzzleSub: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  puzzleThemeTag: {
    color: colors.primary,
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  puzzleDiffText: {
    color: "#fbbf24",
    fontSize: 11,
  },
});
