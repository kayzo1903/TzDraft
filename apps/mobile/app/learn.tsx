import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { BookOpen, Sparkles, Target, ChevronRight } from "lucide-react-native";
import { colors } from "../src/theme/colors";
import { fetchTactics, SanityArticle, SanityTactic } from "../src/services/sanity.service";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";

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

  const [articles, setArticles] = useState<SanityArticle[]>([]);
  const [tactics, setTactics] = useState<SanityTactic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const tacData = await fetchTactics();
      setTactics(tacData);
    } catch (error) {
      console.error("[LearnScreen] Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderArticle = (article: SanityArticle) => {
    const title = article.title?.[locale as "en" | "sw"] || article.title?.en || "Article";
    const desc = article.description?.[locale as "en" | "sw"] || article.description?.en || "";

    return (
      <TouchableOpacity key={article.slug} style={styles.articleCard} activeOpacity={0.8}>
        <Image 
          source={article.coverImageUrl ? { uri: article.coverImageUrl } : require("../assets/icon.png")} 
          style={styles.articleImage} 
        />
        <View style={styles.articleContent}>
          <InProgressBadge />
          <Text style={styles.articleTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.articleDesc} numberOfLines={2}>{desc}</Text>
        </View>
      </TouchableOpacity>
    );
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
           <View style={[styles.diffBadge, styles[`diff_${tactic.difficulty}` as keyof typeof styles]]}>
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
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.iconBox}>
              <BookOpen size={24} color={colors.primary} />
            </View>
            <Text style={styles.title}>{t("learn.heading", "Learn & Master")}</Text>
          </View>
          <Text style={styles.subtitle}>{t("learn.subheading", "Study tactics, rules, and gamebooks to improve your game.")}</Text>
        </View>

        {/* Tactics Playbook */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t("learn.tactics", "Tactics Playbook")}</Text>
          </View>
          <View style={styles.tacticsList}>
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
          <View style={styles.gamebookList}>
            {gamebooks.map((book) => (
              <TouchableOpacity key={book.id} style={styles.gamebookItem} activeOpacity={0.7}>
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
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  loader: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryAlpha10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  webArticleCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  webArticleGradient: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  webArticleInfo: {
    flex: 1,
    marginRight: 16,
  },
  webArticleTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
  webArticleSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
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
  tacticsList: {
    gap: 12,
  },
  tacticCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
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
  gamebookList: {
    gap: 10,
  },
  gamebookItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  gamebookContent: {
    flex: 1,
  },
  gamebookTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "bold",
  },
  gamebookSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  infoBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
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
  },
  footerSpacer: {
    height: 60,
  },
});
