import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
  ShieldCheck,
  CheckCircle2,
  Globe2,
  Timer,
  Zap,
  BookOpen,
} from "lucide-react-native";
import {
  tournamentService,
  TournamentDetail,
  TournamentStatus,
  TournamentParticipant,
  TournamentMatch,
  TournamentRound,
} from "../../../src/lib/tournament-service";
import { LoadingScreen } from "../../../src/components/ui/LoadingScreen";
import { ThemedModal } from "../../../src/components/ui/ThemedModal";
import { GuestBarrierModal } from "../../../src/components/auth/GuestBarrierModal";
import { useAuthStore } from "../../../src/auth/auth-store";
import { useSocket } from "../../../src/hooks/useSocket";
import { colors } from "../../../src/theme/colors";

const { width } = Dimensions.get("window");

type TabType = "info" | "players" | "bracket";

// ── Helpers ────────────────────────────────────────────────────

function useCountdown(deadlineMs: number | null): number {
  const [remaining, setRemaining] = useState(
    deadlineMs ? Math.max(0, deadlineMs - Date.now()) : 0
  );
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!deadlineMs) { setRemaining(0); return; }
    const tick = () => setRemaining(Math.max(0, deadlineMs - Date.now()));
    tick();
    ref.current = setInterval(tick, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [deadlineMs]);

  return remaining;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getRoundName(roundNumber: number, totalRounds: number): string {
  const remaining = totalRounds - roundNumber + 1;
  if (remaining === 1) return "FINAL";
  if (remaining === 2) return "SEMIFINAL";
  if (remaining === 3) return "QUARTERFINAL";
  return `ROUND ${roundNumber}`;
}

// ── Main Screen ────────────────────────────────────────────────

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const locale = i18n.language;
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { socket } = useSocket();

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

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit("joinTournament", id);
    const refetch = () => fetchDetail();
    socket.on("tournamentMatchGameReady", refetch);
    socket.on("tournamentMatchCompleted", refetch);
    socket.on("tournamentRoundAdvanced", refetch);
    socket.on("tournamentCompleted", refetch);
    return () => {
      socket.off("tournamentMatchGameReady", refetch);
      socket.off("tournamentMatchCompleted", refetch);
      socket.off("tournamentRoundAdvanced", refetch);
      socket.off("tournamentCompleted", refetch);
    };
  }, [socket, id, fetchDetail]);

  const onRefresh = () => { setRefreshing(true); fetchDetail(); };

  const handleRegister = async () => {
    if (!id) return;
    if (!user) { setGuestBarrierVisible(true); return; }
    setActionLoading(true);
    try {
      await tournamentService.register(id);
      await fetchDetail();
    } catch (err: any) {
      const raw = err?.response?.data?.message ?? "Registration failed. Please try again.";
      Alert.alert("Registration Failed", Array.isArray(raw) ? raw.join("\n") : raw);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawConfirm = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await tournamentService.withdraw(id);
      setWithdrawModalVisible(false);
      await fetchDetail();
    } catch (err: any) {
      const raw = err?.response?.data?.message ?? "Withdrawal failed.";
      setWithdrawModalVisible(false);
      Alert.alert("Withdrawal Failed", Array.isArray(raw) ? raw.join("\n") : raw);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat(locale === "sw" ? "sw-TZ" : "en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "numeric",
    }).format(new Date(date));

  const getStatusLabel = (status: TournamentStatus) => {
    const labels: Record<string, { en: string; sw: string }> = {
      REGISTRATION: { en: "Registration Open", sw: "Usajili Wazi" },
      ACTIVE: { en: "Live Now", sw: "Inaendelea" },
      COMPLETED: { en: "Completed", sw: "Imekamilika" },
      CANCELLED: { en: "Cancelled", sw: "Imefutwa" },
      DRAFT: { en: "Draft", sw: "Rasimu" },
    };
    return labels[status]?.[locale as "en" | "sw"] ?? status;
  };

  // Derived state — computed before early returns so hook call order is stable
  const activeRound = detail ? (detail.rounds.find((r) => r.status === "ACTIVE") ?? null) : null;
  const roundDeadlineMs = activeRound?.startedAt && detail
    ? new Date(activeRound.startedAt).getTime() + detail.tournament.roundDurationMinutes * 60_000
    : null;
  // useCountdown must always be called (not conditionally) — keep above early returns
  const matchTimeRemaining = useCountdown(roundDeadlineMs);

  if (loading && !refreshing) return <LoadingScreen />;
  if (!detail) return null;

  const { tournament, participants, rounds, matches } = detail;
  const isRegistered = user ? participants.some((p) => p.userId === user.id) : false;
  const isElimination =
    tournament.format === "SINGLE_ELIMINATION" ||
    tournament.format === "DOUBLE_ELIMINATION";

  const myMatch = activeRound && user
    ? matches.find(
        (m) =>
          m.roundId === activeRound.id &&
          (m.player1Id === user.id || m.player2Id === user.id) &&
          m.status !== "COMPLETED" &&
          m.status !== "BYE"
      ) ?? null
    : null;

  // ── Renders ──────────────────────────────────────────────────

  const renderInfoTab = () => {
    const desc = locale === "sw" ? tournament.descriptionSw : tournament.descriptionEn;
    const rules = locale === "sw" ? tournament.rulesSw : tournament.rulesEn;

    return (
      <View style={styles.tabContent}>
        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.infoText}>{desc}</Text>
        </View>

        {/* Overview Grid */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Event Overview</Text>
          <View style={styles.overviewGrid}>
            {[
              { icon: Trophy, color: colors.primary, label: "Format", value: tournament.format.replace(/_/g, " ") },
              { icon: Clock3, color: "#38bdf8", label: "Time Control", value: tournament.style },
              { icon: Users, color: "#10b981", label: "Players", value: `${participants.length} / ${tournament.maxPlayers}` },
              { icon: Globe2, color: "#818cf8", label: "Scope", value: tournament.scope },
            ].map(({ icon: Icon, color, label, value }) => (
              <View key={label} style={styles.overviewItem}>
                <View style={[styles.overviewIconWrap, { backgroundColor: color + "18" }]}>
                  <Icon size={16} color={color} />
                </View>
                <View>
                  <Text style={styles.overviewLabel}>{label}</Text>
                  <Text style={styles.overviewValue}>{value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Rules */}
        {!!rules && (
          <View style={styles.card}>
            <View style={styles.sectionLabelRow}>
              <BookOpen size={14} color={colors.primary} />
              <Text style={styles.sectionLabel}>Tournament Rules</Text>
            </View>
            <Text style={styles.infoText}>{rules}</Text>
          </View>
        )}

        {/* Prizes */}
        {tournament.prizes && tournament.prizes.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Prize Pool</Text>
            {tournament.prizes.map((prize, idx) => (
              <View key={idx} style={styles.prizeItem}>
                <View style={[styles.prizeBadge, idx === 0 && styles.goldBadge]}>
                  <Award size={16} color={idx === 0 ? colors.onPrimary : colors.primary} />
                </View>
                <View style={styles.prizeContent}>
                  <Text style={styles.prizePlacement}>
                    {prize.placement === 1 ? "1st Place" : prize.placement === 2 ? "2nd Place" : `${prize.placement}th Place`}
                  </Text>
                  <Text style={styles.prizeAmount}>
                    {prize.amount.toLocaleString()} {prize.currency}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ── Round Robin / Swiss — Standings Table ──────────────────

  const renderStandingsTab = () => {
    const sorted = [...participants].sort((a, b) => {
      if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
      return b.totalGamePoints - a.totalGamePoints;
    });

    return (
      <View style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Standings</Text>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.rankCell, styles.tableHeaderText]}>#</Text>
            <Text style={[styles.tableCell, styles.nameCell, styles.tableHeaderText]}>Player</Text>
            <Text style={[styles.tableCell, styles.statCell, styles.tableHeaderText]}>W</Text>
            <Text style={[styles.tableCell, styles.statCell, styles.tableHeaderText]}>L</Text>
            <Text style={[styles.tableCell, styles.statCell, styles.tableHeaderText]}>Pts</Text>
          </View>
          <View style={styles.tableDivider} />
          {sorted.map((p, idx) => {
            const isMe = p.userId === user?.id;
            return (
              <View key={p.id} style={[styles.tableRow, isMe && styles.tableRowMe]}>
                <Text style={[styles.tableCell, styles.rankCell, styles.rankText, idx < 3 && { color: ["#f59e0b", "#94a3b8", "#b45309"][idx] }]}>
                  {idx + 1}
                </Text>
                <View style={[styles.tableCell, styles.nameCell]}>
                  <Text style={[styles.playerNameText, isMe && { color: colors.primary }]} numberOfLines={1}>
                    {p.displayName || p.username}
                  </Text>
                  {isMe && <View style={styles.youChip}><Text style={styles.youChipText}>YOU</Text></View>}
                </View>
                <Text style={[styles.tableCell, styles.statCell, styles.statText, { color: "#10b981" }]}>{p.matchWins}</Text>
                <Text style={[styles.tableCell, styles.statCell, styles.statText, { color: colors.danger }]}>{p.matchLosses}</Text>
                <Text style={[styles.tableCell, styles.statCell, styles.statText, { color: colors.primary }]}>{p.totalGamePoints}</Text>
              </View>
            );
          })}
        </View>

        {/* Match Schedule for RR/Swiss */}
        {rounds.map((round) => {
          const roundMatches = matches.filter((m) => m.roundId === round.id);
          return (
            <View key={round.id} style={styles.card}>
              <View style={styles.roundHeaderRow}>
                <Text style={styles.sectionLabel}>Round {round.roundNumber}</Text>
                <View style={[styles.roundStatusChip, round.status === "COMPLETED" && styles.roundChipDone, round.status === "ACTIVE" && styles.roundChipActive]}>
                  <Text style={styles.roundStatusText}>{round.status}</Text>
                </View>
              </View>
              {roundMatches.map((match) => renderMatchRow(match, participants))}
            </View>
          );
        })}
      </View>
    );
  };

  // ── Elimination Bracket ────────────────────────────────────

  const renderBracketTab = () => {
    if (rounds.length === 0) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.emptyResults}>
            <Swords size={48} color={colors.surfaceElevated} />
            <Text style={styles.emptyResultsTitle}>No Bracket Yet</Text>
            <Text style={styles.emptyResultsText}>
              The bracket will appear here once the tournament starts.
            </Text>
          </View>
        </View>
      );
    }

    if (!isElimination) {
      return renderStandingsTab();
    }

    return (
      <View style={styles.tabContent}>
        {rounds.map((round) => {
          const roundMatches = matches.filter((m) => m.roundId === round.id);
          const name = getRoundName(round.roundNumber, rounds.length);
          return (
            <View key={round.id} style={styles.bracketRound}>
              <View style={styles.roundHeaderRow}>
                <Text style={styles.bracketRoundName}>{name}</Text>
                <View style={[styles.roundStatusChip, round.status === "COMPLETED" && styles.roundChipDone, round.status === "ACTIVE" && styles.roundChipActive]}>
                  <Text style={styles.roundStatusText}>{round.status}</Text>
                </View>
              </View>
              <View style={styles.bracketMatchList}>
                {roundMatches.map((match) =>
                  renderBracketMatch(match, participants, round)
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // ── Players Tab ────────────────────────────────────────────

  const renderPlayersTab = () => {
    if (!isElimination) return renderStandingsTab();

    return (
      <View style={styles.tabContent}>
        <View style={styles.card}>
          <View style={styles.roundHeaderRow}>
            <Text style={styles.sectionLabel}>{participants.length} Registered</Text>
            <Text style={styles.limitLabel}>Max: {tournament.maxPlayers}</Text>
          </View>
          {participants.map((p, idx) => (
            <View key={p.id} style={styles.participantRow}>
              <View style={styles.participantLeft}>
                <View style={styles.seedBadge}>
                  <Text style={styles.seedText}>{p.seed ?? idx + 1}</Text>
                </View>
                <Text style={styles.participantName} numberOfLines={1}>
                  {p.displayName || p.username}
                </Text>
                {p.userId === user?.id && (
                  <View style={styles.youChip}><Text style={styles.youChipText}>YOU</Text></View>
                )}
              </View>
              <Text style={styles.eloText}>{p.eloAtSignup} ELO</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ── Shared Match Renderers ─────────────────────────────────

  const renderMatchRow = (match: TournamentMatch, allParticipants: TournamentParticipant[]) => {
    const p1 = allParticipants.find((p) => p.userId === match.player1Id);
    const p2 = allParticipants.find((p) => p.userId === match.player2Id);
    const isMe = match.player1Id === user?.id || match.player2Id === user?.id;

    return (
      <View key={match.id} style={[styles.matchRow, isMe && styles.matchRowMe]}>
        <View style={styles.matchRowPlayer}>
          <Text style={[styles.matchPlayerName, match.result === "PLAYER1_WIN" && styles.winnerText]} numberOfLines={1}>
            {p1 ? (p1.displayName || p1.username) : "BYE"}
          </Text>
          <Text style={[styles.matchScore, match.result === "PLAYER1_WIN" && styles.winnerScore]}>
            {match.player1Wins}
          </Text>
        </View>
        <Text style={styles.matchVs}>vs</Text>
        <View style={[styles.matchRowPlayer, styles.matchRowPlayerRight]}>
          <Text style={[styles.matchScore, match.result === "PLAYER2_WIN" && styles.winnerScore]}>
            {match.player2Wins}
          </Text>
          <Text style={[styles.matchPlayerName, styles.matchPlayerRight, match.result === "PLAYER2_WIN" && styles.winnerText]} numberOfLines={1}>
            {p2 ? (p2.displayName || p2.username) : "BYE"}
          </Text>
        </View>
        {match.status === "ACTIVE" && (
          <View style={styles.liveChip}>
            <Text style={styles.liveChipText}>LIVE</Text>
          </View>
        )}
      </View>
    );
  };

  const renderBracketMatch = (
    match: TournamentMatch,
    allParticipants: TournamentParticipant[],
    round: TournamentRound
  ) => {
    const p1 = allParticipants.find((p) => p.userId === match.player1Id);
    const p2 = allParticipants.find((p) => p.userId === match.player2Id);
    const isMyMatch = match.player1Id === user?.id || match.player2Id === user?.id;
    const p1Win = match.result === "PLAYER1_WIN";
    const p2Win = match.result === "PLAYER2_WIN";
    const canEnter = isMyMatch && match.status === "ACTIVE" && !!match.currentGameId;

    return (
      <TouchableOpacity
        key={match.id}
        activeOpacity={canEnter ? 0.7 : 1}
        style={[styles.bracketCard, isMyMatch && styles.bracketCardMe]}
        onPress={canEnter ? () => router.push({ pathname: "/game/online-game", params: { gameId: match.currentGameId!, isHost: "false", source: "tournament" } }) : undefined}
      >
        {/* Player 1 */}
        <View style={[styles.bracketRow, p1Win && styles.bracketRowWinner]}>
          <View style={styles.bracketSeedWrap}>
            <Text style={styles.bracketSeed}>{p1?.seed ?? "–"}</Text>
          </View>
          <Text style={[styles.bracketName, p1Win && styles.bracketWinnerName]} numberOfLines={1}>
            {p1 ? (p1.displayName || p1.username) : (match.status === "BYE" ? "BYE" : "TBD")}
          </Text>
          <Text style={[styles.bracketScore, p1Win && styles.bracketWinnerScore]}>{match.player1Wins}</Text>
        </View>

        <View style={styles.bracketDivider} />

        {/* Player 2 */}
        <View style={[styles.bracketRow, p2Win && styles.bracketRowWinner]}>
          <View style={styles.bracketSeedWrap}>
            <Text style={styles.bracketSeed}>{p2?.seed ?? "–"}</Text>
          </View>
          <Text style={[styles.bracketName, p2Win && styles.bracketWinnerName]} numberOfLines={1}>
            {p2 ? (p2.displayName || p2.username) : (match.status === "BYE" ? "BYE" : "TBD")}
          </Text>
          <Text style={[styles.bracketScore, p2Win && styles.bracketWinnerScore]}>{match.player2Wins}</Text>
        </View>

        {/* Status badges */}
        <View style={styles.bracketFooter}>
          {match.status === "ACTIVE" && (
            <View style={styles.liveChip}><Text style={styles.liveChipText}>LIVE</Text></View>
          )}
          {match.status === "COMPLETED" && (
            <View style={styles.doneChip}><Text style={styles.doneChipText}>DONE</Text></View>
          )}
          {match.status === "BYE" && (
            <View style={styles.byeChip}><Text style={styles.byeChipText}>BYE</Text></View>
          )}
          {canEnter && (
            <View style={styles.enterChip}>
              <Zap size={10} color="#000" />
              <Text style={styles.enterChipText}>ENTER MATCH</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── My Match Card (sticky between hero and tabs) ───────────

  const renderMyMatchCard = () => {
    if (!myMatch || !activeRound) return null;

    const opponent = participants.find(
      (p) => p.userId === (myMatch.player1Id === user?.id ? myMatch.player2Id : myMatch.player1Id)
    );
    const amPlayer1 = myMatch.player1Id === user?.id;
    const myScore = amPlayer1 ? myMatch.player1Wins : myMatch.player2Wins;
    const oppScore = amPlayer1 ? myMatch.player2Wins : myMatch.player1Wins;
    const canEnter = myMatch.status === "ACTIVE" && !!myMatch.currentGameId;

    return (
      <View style={styles.myMatchCard}>
        <View style={styles.myMatchTop}>
          <View style={styles.myMatchLeft}>
            <Text style={styles.myMatchLabel}>YOUR MATCH · ROUND {activeRound.roundNumber}</Text>
            <Text style={styles.myMatchOpponent} numberOfLines={1}>
              vs {opponent ? (opponent.displayName || opponent.username) : "Opponent"}
            </Text>
            <Text style={styles.myMatchScore}>{myScore} – {oppScore}</Text>
          </View>
          <View style={styles.myMatchRight}>
            <View style={styles.myMatchCountdownBox}>
              <Timer size={12} color={matchTimeRemaining < 3_600_000 ? colors.danger : colors.primary} />
              <Text style={[styles.myMatchCountdown, matchTimeRemaining < 3_600_000 && { color: colors.danger }]}>
                {formatCountdown(matchTimeRemaining)}
              </Text>
            </View>
            <Text style={styles.myMatchCountdownLabel}>round expires</Text>
          </View>
        </View>
        {canEnter && (
          <TouchableOpacity
            style={styles.enterMatchButton}
            onPress={() =>
              router.push({
                pathname: "/game/online-game",
                params: { gameId: myMatch.currentGameId!, isHost: "false", source: "tournament" },
              })
            }
          >
            <Zap size={16} color="#000" />
            <Text style={styles.enterMatchButtonText}>ENTER MATCH</Text>
          </TouchableOpacity>
        )}
        {!canEnter && myMatch.status === "PENDING" && (
          <View style={styles.pendingMatchRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.pendingMatchText}>Waiting for match to start…</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{tournament.name}</Text>
          <View style={styles.headerStatusRow}>
            <View style={[styles.statusDot, { backgroundColor: tournament.status === "ACTIVE" ? "#38bdf8" : colors.primary }]} />
            <Text style={styles.statusLabel}>{getStatusLabel(tournament.status)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Share2 color={colors.foreground} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroMeta}>
              <CalendarDays size={15} color={colors.primary} />
              <Text style={styles.heroMetaText}>{formatDate(tournament.scheduledStartAt)}</Text>
            </View>
            {isRegistered && (
              <View style={styles.joinedBadge}>
                <ShieldCheck size={13} color={colors.win} />
                <Text style={styles.joinedText}>JOINED</Text>
              </View>
            )}
          </View>
        </View>

        {/* My Match Card */}
        {renderMyMatchCard()}

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(["info", "players", "bracket"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === "info" ? "INFO" : tab === "players" ? "PLAYERS" : "BRACKET"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "info" && renderInfoTab()}
        {activeTab === "players" && renderPlayersTab()}
        {activeTab === "bracket" && renderBracketTab()}
      </ScrollView>

      {/* Footer CTA */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <View style={styles.controlsRow}>
          {/* Format Control (Locked) */}
          <View style={[styles.controlItem, styles.controlItemLocked]}>
            <Trophy color={colors.primary} size={18} />
            <Text style={styles.controlLabel} numberOfLines={1}>
              {tournament.format.replace(/_/g, " ")}
            </Text>
            <Lock color={colors.primary} size={12} />
          </View>
 
          {/* Style Control (Locked) */}
          <View style={[styles.controlItem, styles.controlItemLocked]}>
            <Clock3 color={colors.primary} size={18} />
            <Text style={styles.controlLabel} numberOfLines={1}>
              {tournament.style}
            </Text>
            <Lock color={colors.primary} size={12} />
          </View>
        </View>
 
        {tournament.status === "REGISTRATION" ? (
          isRegistered ? (
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.surface, borderColor: colors.winAlpha20, borderWidth: 1 }]}
              onPress={() => setWithdrawModalVisible(true)}
              disabled={actionLoading}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={20} color={colors.win} />
                <Text style={[styles.startButtonText, { color: colors.win }]}>
                  {t("tournament.registered", "JOINED")} — {t("tournament.withdraw", "WITHDRAW")}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.startButton, actionLoading && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator size="small" color={colors.onPrimary} />
                : <Text style={styles.startButtonText}>{t("tournament.registerNow", "REGISTER NOW")}</Text>}
            </TouchableOpacity>
          )
        ) : (
          <View style={[styles.startButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, opacity: 0.7 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={20} color={colors.textSubtle} />
              <Text style={[styles.startButtonText, { color: colors.textSubtle }]}>
                {t("tournament.closed", "CLOSED")}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Guest barrier — shown when unauthenticated user taps Register */}
      <GuestBarrierModal
        visible={guestBarrierVisible}
        onClose={() => setGuestBarrierVisible(false)}
        title="Sign in to register"
        subtitle="Create a free account to join tournaments, track your record, and compete for prizes."
      />

      {/* Withdraw Confirm Modal */}
      <ThemedModal
        visible={withdrawModalVisible}
        onClose={() => !actionLoading && setWithdrawModalVisible(false)}
        dismissable={!actionLoading}
        label="Withdraw"
        title="Leave this tournament?"
        subtitle="You will lose your registration spot. You may not be able to re-register if the tournament fills up."
        icon={AlertTriangle}
        iconBg="rgba(239,68,68,0.1)"
        iconColor={colors.danger}
        actions={[
          { label: "Cancel", onPress: () => setWithdrawModalVisible(false), type: "secondary" },
          { label: "Withdraw", onPress: handleWithdrawConfirm, type: "destructive", loading: actionLoading },
        ]}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  // Header
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, height: 60, gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1 },
  headerTitle: { color: colors.foreground, fontSize: 17, fontWeight: "900" },
  headerStatusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { color: colors.textSubtle, fontSize: 11, fontWeight: "bold", textTransform: "uppercase" },

  // Hero
  hero: { padding: 20, backgroundColor: colors.primaryAlpha05, borderBottomWidth: 1, borderBottomColor: colors.border },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroMetaText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  joinedBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(16,185,129,0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "rgba(16,185,129,0.2)", gap: 4 },
  joinedText: { color: colors.win, fontSize: 10, fontWeight: "900" },

  // My Match Card
  myMatchCard: { margin: 16, marginBottom: 0, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.primaryAlpha15, padding: 16, gap: 12 },
  myMatchTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  myMatchLeft: { flex: 1, gap: 4 },
  myMatchLabel: { color: colors.primary, fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  myMatchOpponent: { color: colors.foreground, fontSize: 18, fontWeight: "900" },
  myMatchScore: { color: colors.textSecondary, fontSize: 14, fontWeight: "bold" },
  myMatchRight: { alignItems: "flex-end", gap: 4 },
  myMatchCountdownBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceElevated, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  myMatchCountdown: { color: colors.primary, fontSize: 15, fontWeight: "900", fontVariant: ["tabular-nums"] },
  myMatchCountdownLabel: { color: colors.textDisabled, fontSize: 10, fontWeight: "bold", textTransform: "uppercase" },
  enterMatchButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, borderRadius: 14, height: 48, gap: 8 },
  enterMatchButtonText: { color: "#000", fontSize: 15, fontWeight: "900", letterSpacing: 1 },
  pendingMatchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 4 },
  pendingMatchText: { color: colors.textSubtle, fontSize: 13, fontWeight: "bold" },

  // Tabs
  tabBar: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  tab: { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 3, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { color: colors.textDisabled, fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  tabTextActive: { color: colors.primary },

  // Tab content
  scrollContent: { paddingBottom: 100 },
  tabContent: { padding: 16, gap: 16 },

  // Card
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 0 },
  sectionLabel: { color: colors.textSubtle, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  infoText: { color: colors.textSecondary, fontSize: 15, lineHeight: 24 },

  // Overview grid
  overviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  overviewItem: { width: (width - 96) / 2, flexDirection: "row", alignItems: "center", gap: 12 },
  overviewIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  overviewLabel: { color: colors.textDisabled, fontSize: 10, fontWeight: "bold", textTransform: "uppercase" },
  overviewValue: { color: colors.foreground, fontSize: 14, fontWeight: "bold", marginTop: 2 },

  // Prizes
  prizeItem: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 12 },
  prizeBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryAlpha10, alignItems: "center", justifyContent: "center" },
  goldBadge: { backgroundColor: colors.primary },
  prizeContent: { flex: 1 },
  prizePlacement: { color: colors.textSubtle, fontSize: 12, fontWeight: "bold" },
  prizeAmount: { color: colors.foreground, fontSize: 18, fontWeight: "900" },

  // Participants (elimination)
  participantRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surfaceElevated, padding: 12, borderRadius: 14, marginTop: 8 },
  participantLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  participantName: { color: colors.foreground, fontSize: 14, fontWeight: "bold", flex: 1 },
  seedBadge: { width: 24, height: 24, borderRadius: 6, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  seedText: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  eloText: { color: colors.textDisabled, fontSize: 12, fontWeight: "900" },
  youChip: { backgroundColor: colors.win, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  youChipText: { color: colors.onPrimary, fontSize: 8, fontWeight: "900" },
  limitLabel: { color: colors.textDisabled, fontSize: 12, fontWeight: "bold" },

  // Standings table
  tableHeader: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  tableHeaderText: { color: colors.textDisabled, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  tableDivider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderRadius: 10 },
  tableRowMe: { backgroundColor: colors.primaryAlpha05 },
  tableCell: { flexDirection: "row", alignItems: "center" },
  rankCell: { width: 32 },
  nameCell: { flex: 1, gap: 6 },
  statCell: { width: 40, justifyContent: "center" },
  rankText: { color: colors.textSubtle, fontSize: 14, fontWeight: "900" },
  playerNameText: { color: colors.foreground, fontSize: 14, fontWeight: "bold" },
  statText: { fontSize: 14, fontWeight: "900", textAlign: "center" },

  // Round header shared
  roundHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  roundStatusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.primaryAlpha10 },
  roundStatusText: { color: colors.primary, fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  roundChipDone: { backgroundColor: "rgba(16,185,129,0.1)" },
  roundChipActive: { backgroundColor: "rgba(56,189,248,0.1)" },

  // Match row (RR/Swiss)
  matchRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  matchRowMe: { backgroundColor: colors.primaryAlpha05, borderRadius: 10, paddingHorizontal: 8 },
  matchRowPlayer: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  matchRowPlayerRight: { flexDirection: "row-reverse" },
  matchPlayerName: { flex: 1, color: colors.textSubtle, fontSize: 13, fontWeight: "bold" },
  matchPlayerRight: { textAlign: "right" },
  matchVs: { color: colors.textDisabled, fontSize: 11, fontWeight: "900", paddingHorizontal: 8 },
  matchScore: { color: colors.textDisabled, fontSize: 16, fontWeight: "900", minWidth: 20, textAlign: "center" },
  winnerText: { color: colors.foreground },
  winnerScore: { color: colors.primary },

  // Bracket
  bracketRound: { marginBottom: 24 },
  bracketRoundName: { color: colors.foreground, fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },
  bracketMatchList: { gap: 12 },
  bracketCard: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  bracketCardMe: { borderColor: colors.primary, borderWidth: 1.5 },
  bracketRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  bracketRowWinner: { backgroundColor: colors.primaryAlpha05 },
  bracketSeedWrap: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  bracketSeed: { color: colors.textDisabled, fontSize: 11, fontWeight: "900" },
  bracketName: { flex: 1, color: colors.textSubtle, fontSize: 14, fontWeight: "bold" },
  bracketWinnerName: { color: colors.foreground },
  bracketScore: { color: colors.textDisabled, fontSize: 18, fontWeight: "900", minWidth: 24, textAlign: "center" },
  bracketWinnerScore: { color: colors.primary },
  bracketDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 14 },
  bracketFooter: { flexDirection: "row", gap: 8, padding: 10, paddingTop: 8, alignItems: "center" },
  // ... (header, hero, match card, tabs, card, grid, prizes, participants, standings, round, match row, bracket, status chips)

  // Status chips
  liveChip: { backgroundColor: "rgba(56,189,248,0.15)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(56,189,248,0.3)" },
  liveChipText: { color: "#38bdf8", fontSize: 9, fontWeight: "900" },
  doneChip: { backgroundColor: "rgba(16,185,129,0.1)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  doneChipText: { color: colors.win, fontSize: 9, fontWeight: "900" },
  byeChip: { backgroundColor: colors.surfaceElevated, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  byeChipText: { color: colors.textDisabled, fontSize: 9, fontWeight: "900" },
  enterChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  enterChipText: { color: "#000", fontSize: 9, fontWeight: "900" },

  // Empty state
  emptyResults: { padding: 60, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyResultsTitle: { color: colors.foreground, fontSize: 18, fontWeight: "bold" },
  emptyResultsText: { color: colors.textSubtle, fontSize: 14, textAlign: "center", lineHeight: 20 },

  // Footer CTA
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 16,
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
  controlItem: {
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
  controlItemLocked: {
    borderColor: colors.primaryAlpha30,
    backgroundColor: colors.primaryAlpha05,
  },
  controlLabel: {
    flex: 1,
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "bold",
    textTransform: "capitalize",
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
});
