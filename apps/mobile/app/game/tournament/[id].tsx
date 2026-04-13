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
  FlatList,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  CalendarDays, 
  Clock3, 
  Share2, 
  Swords, 
  Award, 
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  Globe2
} from "lucide-react-native";
import { tournamentService, Tournament, TournamentStatus } from "../../../src/lib/tournament-service";
import { LoadingScreen } from "../../../src/components/ui/LoadingScreen";
import { useAuthStore } from "../../../src/auth/auth-store";
import { colors } from "../../../src/theme/colors";

const { width } = Dimensions.get("window");

type TabType = "info" | "participants" | "results";

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const locale = i18n.language;
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [detail, setDetail] = useState<any>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      const data = await tournamentService.get(id);
      setDetail(data);
    } catch (error) {
      console.error("[TournamentDetail] Fetch failed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetail();
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat(locale === "sw" ? "sw-TZ" : "en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "numeric"
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

  if (loading && !refreshing) return <LoadingScreen />;
  if (!detail) return null;

  const { tournament, participants, rounds, matches } = detail;
  const isRegistered = user ? participants.some((p: any) => p.userId === user.id) : false;

  const renderInfoTab = () => (
    <View style={styles.tabContent}>
      {/* Description */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("footer.rules", "Description & Rules")}</Text>
        <Text style={styles.infoText}>
          {locale === "sw" ? tournament.descriptionSw : tournament.descriptionEn}
        </Text>
        {(tournament.rulesEn || tournament.rulesSw) && (
          <View style={styles.divider} />
        )}
        <Text style={styles.infoText}>
          {locale === "sw" ? tournament.rulesSw : tournament.rulesEn}
        </Text>
      </View>

      {/* Overview Grid */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("support.quickHelp.gameplayTitle", "Event Overview")}</Text>
        <View style={styles.overviewGrid}>
          <View style={styles.overviewItem}>
            <Trophy size={16} color={colors.primary} />
            <View>
              <Text style={styles.overviewLabel}>Format</Text>
              <Text style={styles.overviewValue}>{tournament.format.replace(/_/g, " ")}</Text>
            </View>
          </View>
          <View style={styles.overviewItem}>
            <Clock3 size={16} color="#38bdf8" />
            <View>
              <Text style={styles.overviewLabel}>Control</Text>
              <Text style={styles.overviewValue}>{tournament.style}</Text>
            </View>
          </View>
          <View style={styles.overviewItem}>
            <Users size={16} color="#10b981" />
            <View>
              <Text style={styles.overviewLabel}>Min Players</Text>
              <Text style={styles.overviewValue}>{tournament.minPlayers}</Text>
            </View>
          </View>
          <View style={styles.overviewItem}>
            <Globe2 size={16} color="#818cf8" />
            <View>
              <Text style={styles.overviewLabel}>Scope</Text>
              <Text style={styles.overviewValue}>{tournament.scope}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Prizes */}
      {tournament.prizes && tournament.prizes.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Prize Pool</Text>
          {tournament.prizes.map((prize: any, idx: number) => (
            <View key={idx} style={styles.prizeItem}>
              <View style={[styles.prizeBadge, idx === 0 && styles.goldBadge]}>
                <Award size={16} color={idx === 0 ? colors.onPrimary : colors.primary} />
              </View>
              <View style={styles.prizeContent}>
                <Text style={styles.prizePlacement}>{prize.placement === 1 ? "1st Place" : prize.placement === 2 ? "2nd Place" : `${prize.placement}th Place`}</Text>
                <Text style={styles.prizeAmount}>{prize.amount.toLocaleString()} {prize.currency}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderParticipantsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <View style={styles.participantHeader}>
          <Text style={styles.sectionTitle}>{participants.length} Participants Joined</Text>
          <Text style={styles.limitText}>Limit: {tournament.maxPlayers}</Text>
        </View>
        <View style={styles.participantList}>
          {participants.map((p: any, idx: number) => (
            <View key={p.id} style={styles.participantRow}>
              <View style={styles.participantInfo}>
                <View style={styles.seedBadge}>
                  <Text style={styles.seedText}>{p.seed || idx + 1}</Text>
                </View>
                <Text style={styles.participantName}>{p.displayName || p.username}</Text>
                {p.userId === user?.id && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youText}>YOU</Text>
                  </View>
                )}
              </View>
              <Text style={styles.participantElo}>{p.eloAtSignup} ELO</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderResultsTab = () => (
    <View style={styles.tabContent}>
      {rounds.length === 0 ? (
        <View style={styles.emptyResults}>
          <Swords size={48} color={colors.surfaceElevated} />
          <Text style={styles.emptyResultsTitle}>No Bracket Yet</Text>
          <Text style={styles.emptyResultsText}>The tournament matches will appear here once the event starts.</Text>
        </View>
      ) : (
        rounds.map((round: any) => {
          const roundMatches = matches.filter((m: any) => m.roundId === round.id);
          return (
            <View key={round.id} style={styles.roundSection}>
              <View style={styles.roundHeader}>
                <Text style={styles.roundTitle}>Round {round.roundNumber}</Text>
                <View style={[styles.roundChip, round.status === "COMPLETED" && styles.roundChipDone]}>
                  <Text style={styles.roundChipText}>{round.status}</Text>
                </View>
              </View>
              <View style={styles.matchList}>
                {roundMatches.map((match: any) => {
                  const p1 = participants.find((p: any) => p.userId === match.player1Id);
                  const p2 = participants.find((p: any) => p.userId === match.player2Id);
                  
                  return (
                    <View key={match.id} style={styles.matchCard}>
                      <View style={styles.playerRow}>
                        <Text style={[styles.playerName, match.result === "PLAYER1_WIN" && styles.winnerName]}>
                          {p1 ? (p1.displayName || p1.username) : "BYE"}
                        </Text>
                        <Text style={[styles.score, match.result === "PLAYER1_WIN" && styles.winnerScore]}>
                           {match.player1Wins}
                        </Text>
                      </View>
                      <View style={styles.matchDivider} />
                      <View style={styles.playerRow}>
                        <Text style={[styles.playerName, match.result === "PLAYER2_WIN" && styles.winnerName]}>
                          {p2 ? (p2.displayName || p2.username) : "BYE"}
                        </Text>
                        <Text style={[styles.score, match.result === "PLAYER2_WIN" && styles.winnerScore]}>
                           {match.player2Wins}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{tournament.name}</Text>
          <View style={styles.headerStatus}>
            <View style={[styles.statusDot, { backgroundColor: tournament.status === "ACTIVE" ? "#38bdf8" : colors.primary }]} />
            <Text style={styles.statusLabelText}>{getStatusLabel(tournament.status)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.backButton}>
          <Share2 color={colors.foreground} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Banner Area */}
        <View style={styles.heroBanner}>
          <View style={styles.bannerRow}>
             <View style={styles.bannerMeta}>
                <CalendarDays size={16} color={colors.primary} />
                <Text style={styles.bannerMetaText}>{formatDate(tournament.scheduledStartAt)}</Text>
             </View>
             {isRegistered && (
               <View style={styles.joinedBadge}>
                 <ShieldCheck size={14} color={colors.win} />
                 <Text style={styles.joinedText}>JOINED</Text>
               </View>
             )}
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
           {(["info", "participants", "results"] as const).map((tab) => (
             <TouchableOpacity 
               key={tab} 
               style={[styles.tab, activeTab === tab && styles.tabActive]}
               onPress={() => setActiveTab(tab)}
             >
               <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                 {tab === "info" ? "INFO" : tab === "participants" ? "PLAYERS" : "BRACKET"}
               </Text>
             </TouchableOpacity>
           ))}
        </View>

        {/* Dynamic Content */}
        {activeTab === "info" && renderInfoTab()}
        {activeTab === "participants" && renderParticipantsTab()}
        {activeTab === "results" && renderResultsTab()}
      </ScrollView>

      {/* Bottom Action Area (Stub) */}
      <View style={styles.footer}>
        {tournament.status === "REGISTRATION" ? (
          isRegistered ? (
            <View style={styles.registeredButton}>
               <CheckCircle2 size={20} color={colors.win} />
               <Text style={styles.registeredButtonText}>YOU ARE REGISTERED</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>REGISTER NOW</Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.closedButton}>
             <AlertTriangle size={20} color={colors.textSubtle} />
             <Text style={styles.closedButtonText}>REGISTRATION CLOSED</Text>
          </View>
        )}
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
  },
  headerStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabelText: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroBanner: {
    padding: 20,
    backgroundColor: colors.primaryAlpha05,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bannerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bannerMetaText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  joinedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    gap: 4,
  },
  joinedText: {
    color: colors.win,
    fontSize: 10,
    fontWeight: "900",
  },
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: colors.background,
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    color: colors.textDisabled,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabContent: {
    padding: 20,
    gap: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  overviewItem: {
    width: (width - 100) / 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  overviewLabel: {
    color: colors.textDisabled,
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  overviewValue: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 2,
  },
  prizeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  prizeBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryAlpha10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primaryAlpha10,
  },
  goldBadge: {
    backgroundColor: colors.primary,
  },
  prizeContent: {
    flex: 1,
  },
  prizePlacement: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "bold",
  },
  prizeAmount: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
  },
  participantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  limitText: {
    color: colors.textDisabled,
    fontSize: 12,
    fontWeight: "bold",
  },
  participantList: {
    gap: 12,
  },
  participantRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    padding: 12,
    borderRadius: 16,
  },
  participantInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  seedBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  seedText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  participantName: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "bold",
  },
  youBadge: {
    backgroundColor: colors.win,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youText: {
    color: colors.onPrimary,
    fontSize: 8,
    fontWeight: "900",
  },
  participantElo: {
    color: colors.textDisabled,
    fontSize: 12,
    fontWeight: "900",
  },
  emptyResults: {
    padding: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyResultsTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
  emptyResultsText: {
    color: colors.textSubtle,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  roundSection: {
    marginBottom: 32,
  },
  roundHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  roundTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "900",
  },
  roundChip: {
    backgroundColor: colors.primaryAlpha10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roundChipDone: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  roundChipText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  matchList: {
    gap: 12,
  },
  matchCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  playerName: {
    color: colors.textSubtle,
    fontSize: 15,
    fontWeight: "bold",
  },
  winnerName: {
    color: colors.foreground,
  },
  score: {
    color: colors.textDisabled,
    fontSize: 16,
    fontWeight: "900",
  },
  winnerScore: {
    color: colors.primary,
  },
  matchDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  registeredButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    height: 56,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  registeredButtonText: {
    color: colors.win,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
  closedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    height: 56,
    borderRadius: 16,
    gap: 12,
  },
  closedButtonText: {
    color: colors.textSubtle,
    fontSize: 14,
    fontWeight: "bold",
  }
});
