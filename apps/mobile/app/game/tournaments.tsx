import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  CalendarDays, 
  Globe2, 
  ChevronRight,
  Clock3,
  BarChart3,
  Award
} from "lucide-react-native";
import { tournamentService, Tournament, TournamentStatus } from "../../src/lib/tournament-service";
import { LoadingScreen } from "../../src/components/ui/LoadingScreen";
import { colors } from "../../src/theme/colors";

const { width } = Dimensions.get("window");

export default function TournamentsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const locale = i18n.language;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const fetchTournaments = useCallback(async () => {
    try {
      const data = await tournamentService.list();
      setTournaments(data);
    } catch (error) {
      console.error("[Tournaments] Fetch failed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTournaments();
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat(locale === "sw" ? "sw-TZ" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const getStatusLabel = (status: TournamentStatus) => {
    const labels: Record<string, { en: string; sw: string }> = {
      REGISTRATION: { en: "Registration Open", sw: "Usajili Wazi" },
      ACTIVE: { en: "Live Now", sw: "Inaendelea" },
      COMPLETED: { en: "Completed", sw: "Imekamilika" },
      CANCELLED: { en: "Cancelled", sw: "Imefutwa" },
      DRAFT: { en: "Draft", sw: "Rasimu" },
    };
    return labels[status]?.[locale as "en" | "sw"] || status;
  };

  const getStatusColor = (status: TournamentStatus) => {
    const statusColors: Record<string, string> = {
      REGISTRATION: "#10b981", // Emerald
      ACTIVE: "#38bdf8",       // Sky
      COMPLETED: colors.textSubtle,
      CANCELLED: colors.danger,
      DRAFT: colors.primary,
    };
    return statusColors[status] || colors.textSubtle;
  };

  // Sections
  const live = tournaments.filter(t => t.status === "ACTIVE");
  const open = tournaments.filter(t => t.status === "REGISTRATION");
  const completed = tournaments.filter(t => t.status === "COMPLETED");

  const featured = open.length > 0 ? open[0] : (live.length > 0 ? live[0] : (tournaments.length > 0 ? tournaments[0] : null));

  if (loading && !refreshing) {
    return <LoadingScreen />;
  }

  const renderTournamentCard = (item: Tournament, isFeatured = false) => (
    <TouchableOpacity 
      key={item.id}
      style={[styles.card, isFeatured && styles.featuredCard]}
      onPress={() => router.push(`/game/tournament/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.statusChip, { borderColor: getStatusColor(item.status) + "40", backgroundColor: getStatusColor(item.status) + "10" }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
        <ChevronRight size={20} color={colors.textDisabled} />
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {locale === "sw" ? item.descriptionSw : item.descriptionEn}
      </Text>

      <View style={styles.cardFooter}>
         <View style={styles.metaBadge}>
            <Clock3 size={14} color="#a3a3a3" />
            <Text style={styles.metaText}>{formatDate(item.scheduledStartAt)}</Text>
         </View>
         <View style={styles.metaBadge}>
            <Users size={14} color="#a3a3a3" />
            <Text style={styles.metaText}>{item.maxPlayers} players</Text>
         </View>
         <View style={styles.metaBadge}>
            <Award size={14} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.primary }]}>{item.style}</Text>
         </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("home.tournaments", "Tournaments")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          {[
            { icon: Trophy, label: t("setupFriend.online.bannerTitle", "Live"), count: live.length, color: "#38bdf8" },
            { icon: CalendarDays, label: t("setupFriend.tabs.online", "Open"), count: open.length, color: "#10b981" },
            { icon: Globe2, label: t("setupFriend.archive", "Archive"), count: completed.length, color: "#737373" }
          ].map((stat, i) => (
            <View key={i} style={styles.statBox}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + "15" }]}>
                <stat.icon size={18} color={stat.color} />
              </View>
              <Text style={styles.statCount}>{stat.count.toString().padStart(2, '0')}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Featured Section */}
        {featured && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <BarChart3 size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Featured Tournament</Text>
            </View>
            {renderTournamentCard(featured, true)}
          </View>
        )}

        {/* Active Section */}
        {live.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Trophy size={16} color="#38bdf8" />
              <Text style={styles.sectionTitle}>{t("setupFriend.online.bannerTitle", "Live Now")}</Text>
            </View>
            {live.map(t => renderTournamentCard(t))}
          </View>
        )}

        {/* Registration Section */}
        {open.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CalendarDays size={16} color="#10b981" />
              <Text style={styles.sectionTitle}>{t("setupFriend.online.bannerTitle", "Open Registration")}</Text>
            </View>
            {open.map(t => renderTournamentCard(t))}
          </View>
        )}

        {/* Completed Section */}
        {completed.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Award size={16} color="#737373" />
              <Text style={styles.sectionTitle}>{t("setupFriend.archive", "Recently Completed")}</Text>
            </View>
            {completed.map(t => renderTournamentCard(t))}
          </View>
        )}

        {tournaments.length === 0 && (
          <View style={styles.emptyState}>
             <Trophy size={48} color={colors.surfaceElevated} />
             <Text style={styles.emptyTitle}>Looking for competitions?</Text>
             <Text style={styles.emptySubtitle}>There are no tournaments available right now. Check back soon for the next wave of Drafti battles!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
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
  container: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statCount: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  featuredCard: {
    backgroundColor: colors.primaryAlpha05,
    borderColor: colors.primaryAlpha15,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardHeaderLeft: {
    flex: 1,
    gap: 6,
  },
  cardName: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
  },
  statusChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 40,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  emptySubtitle: {
    color: colors.textSubtle,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  }
});
