import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  User,
  Trophy,
  Minus,
  X as XIcon,
  TrendingUp,
  Globe,
  ChevronRight,
  Cpu,
  Target,
  Swords,
  UserPlus,
  UserMinus,
  UserCheck,
} from "lucide-react-native";
import { useSocial } from "../../../src/hooks/useSocial";
import {
  historyService,
  PublicPlayerProfile,
  GameHistoryItem,
} from "../../../src/lib/history-service";
import { LoadingScreen } from "../../../src/components/ui/LoadingScreen";
import { colors } from "../../../src/theme/colors";

const PAGE_SIZE = 20;

export default function PlayerProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { follow, unfollow, loading: socialLoading } = useSocial();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [profile, setProfile] = useState<PublicPlayerProfile | null>(null);
  const [games, setGames] = useState<GameHistoryItem[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [page, setPage] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await historyService.getPlayerProfile(userId);
      setProfile(data);
      setIsFollowing(data.relationship?.isFollowing ?? false);
    } catch (e) {
      console.error("[PlayerProfile] profile fetch failed:", e);
    }
  }, [userId]);

  const handleFollowToggle = useCallback(async () => {
    if (!profile?.username) return;
    try {
      if (isFollowing) {
        await unfollow(profile.username);
        setIsFollowing(false);
      } else {
        await follow(profile.username);
        setIsFollowing(true);
      }
    } catch {
      // error already logged in hook
    }
  }, [profile, isFollowing, follow, unfollow]);

  const fetchGames = useCallback(
    async (pageNum = 0) => {
      if (!userId) return;
      try {
        const { items, total } = await historyService.getPlayerGames(
          userId,
          pageNum * PAGE_SIZE,
          PAGE_SIZE,
        );
        if (pageNum === 0) setGames(items);
        else setGames((prev) => [...prev, ...items]);
        setTotalGames(total);
      } catch (e) {
        console.error("[PlayerProfile] games fetch failed:", e);
      } finally {
        setLoadingMore(false);
      }
    },
    [userId],
  );

  const loadAll = useCallback(async () => {
    await Promise.all([fetchProfile(), fetchGames(0)]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchProfile, fetchGames]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    loadAll();
  };

  const onEndReached = () => {
    if (games.length < totalGames && !loadingMore) {
      setLoadingMore(true);
      const next = page + 1;
      setPage(next);
      fetchGames(next);
    }
  };

  const renderResultBadge = (result: "WIN" | "LOSS" | "DRAW") => {
    const configs = {
      WIN: { icon: Trophy, color: colors.win, label: "WON" },
      LOSS: { icon: XIcon, color: colors.danger, label: "LOST" },
      DRAW: { icon: Minus, color: colors.textSubtle, label: "DRAW" },
    };
    const config = configs[result];
    return (
      <View
        style={[
          styles.resultBadge,
          { backgroundColor: config.color + "15", borderColor: config.color + "30" },
        ]}
      >
        <config.icon size={12} color={config.color} />
        <Text style={[styles.resultText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  };

  const renderGameItem = ({ item }: { item: GameHistoryItem }) => (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() =>
        router.push({
          pathname: "/game/game-replay",
          params: {
            id: item.id,
            opponentName: item.opponent?.displayName ?? "AI",
            result: item.result,
          },
        })
      }
    >
      <View style={styles.gameCardLeft}>
        <View
          style={[
            styles.resultIndicator,
            {
              backgroundColor:
                item.result === "WIN"
                  ? colors.win
                  : item.result === "LOSS"
                    ? colors.danger
                    : colors.textSubtle,
            },
          ]}
        />
        <View style={styles.gameInfo}>
          <View style={styles.opponentRow}>
            <Text style={styles.opponentName}>
              {item.opponent ? item.opponent.displayName : "Mkaguzi AI"}
            </Text>
            {item.opponent?.elo && (
              <Text style={styles.opponentElo}>({item.opponent.elo})</Text>
            )}
          </View>
          <View style={styles.metaRow}>
            <View style={styles.modeBadge}>
              {item.gameType === "AI" ? (
                <Cpu size={10} color={colors.textSubtle} />
              ) : (
                <Target size={10} color={colors.textSubtle} />
              )}
              <Text style={styles.modeText}>{item.gameType}</Text>
            </View>
            <View style={styles.dot} />
            <Text style={styles.metaText}>{item.moveCount} moves</Text>
          </View>
        </View>
      </View>
      <View style={styles.gameCardRight}>
        {renderResultBadge(item.result)}
        <ChevronRight size={16} color={colors.textDisabled} />
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) return <LoadingScreen />;

  const winPct = profile ? Math.round(profile.winRate) : 0;

  return (
    <SafeAreaView style={styles.root} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {profile?.displayName ?? "Player"}
        </Text>
        {profile && (
          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followBtnActive]}
            onPress={handleFollowToggle}
            disabled={socialLoading}
          >
            {socialLoading ? (
              <ActivityIndicator size="small" color={isFollowing ? colors.primary : "#000"} />
            ) : isFollowing ? (
              <UserCheck size={18} color={colors.primary} />
            ) : (
              <UserPlus size={18} color="#000" />
            )}
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={games}
        renderItem={renderGameItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          profile ? (
            <>
              {/* Profile Card */}
              <View style={styles.profileCard}>
                <View style={styles.avatarWrap}>
                  {profile.avatarUrl ? (
                    <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <User size={40} color={colors.primary} />
                  )}
                </View>
                <Text style={styles.displayName}>{profile.displayName}</Text>
                <Text style={styles.usernameText}>@{profile.username}</Text>
                {(profile.country || profile.region) && (
                  <View style={styles.locationRow}>
                    <Globe size={12} color={colors.textDisabled} />
                    <Text style={styles.locationText}>
                      {[profile.region, profile.country].filter(Boolean).join(", ")}
                    </Text>
                  </View>
                )}
                <View style={styles.badgeRow}>
                  <View style={styles.ratingRow}>
                    <TrendingUp size={16} color={colors.win} />
                    <Text style={styles.ratingValue}>{profile.rating}</Text>
                    <Text style={styles.ratingLabel}>ELO</Text>
                  </View>
                  {profile.rank && profile.totalPlayers > 0 && (
                    <View style={styles.rankRow}>
                      <Text style={styles.rankValue}>#{profile.rank}</Text>
                      <Text style={styles.rankTotal}>/ {profile.totalPlayers}</Text>
                    </View>
                  )}
                </View>
                {profile.relationship?.isRival && (
                  <View style={styles.rivalBadge}>
                    <Swords size={12} color={colors.danger} />
                    <Text style={styles.rivalBadgeText}>Rival</Text>
                  </View>
                )}
                {!profile.relationship?.isRival && profile.relationship?.isFriend && (
                  <View style={styles.friendBadge}>
                    <UserCheck size={12} color={colors.win} />
                    <Text style={styles.friendBadgeText}>Friend</Text>
                  </View>
                )}
              </View>

              {/* Stats — same layout as history screen */}
              <View style={styles.statsContainer}>
                <View style={styles.mainStats}>
                  <View style={styles.winRateBox}>
                    <Text style={styles.winRateValue}>{winPct}%</Text>
                    <Text style={styles.winRateLabel}>WIN RATE</Text>
                  </View>
                  <View style={styles.statsGrid}>
                    <View style={styles.statMiniBox}>
                      <Text style={styles.statMiniValue}>{profile.gamesPlayed}</Text>
                      <Text style={styles.statMiniLabel}>TOTAL</Text>
                    </View>
                    <View style={styles.statMiniBox}>
                      <Text style={[styles.statMiniValue, { color: colors.win }]}>{profile.wins}</Text>
                      <Text style={styles.statMiniLabel}>WINS</Text>
                    </View>
                    <View style={styles.statMiniBox}>
                      <Text style={[styles.statMiniValue, { color: colors.danger }]}>{profile.losses}</Text>
                      <Text style={styles.statMiniLabel}>LOSSES</Text>
                    </View>
                    <View style={styles.statMiniBox}>
                      <Text style={[styles.statMiniValue, { color: colors.textSubtle }]}>{profile.draws}</Text>
                      <Text style={styles.statMiniLabel}>DRAWS</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Timeline</Text>
                <Text style={styles.listCount}>{totalGames} matches</Text>
              </View>
            </>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Swords size={48} color={colors.surfaceElevated} />
              <Text style={styles.emptyTitle}>No games yet</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : games.length > 0 ? (
            <View style={styles.footerLoader}>
              <Text style={styles.footerText}>End of history</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    height: 60,
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
  headerTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
    zIndex: -1,
  },
  listContent: { paddingBottom: 40 },
  profileCard: {
    alignItems: "center",
    padding: 28,
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.primaryAlpha30,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 16,
  },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  displayName: { color: colors.foreground, fontSize: 22, fontWeight: "900" },
  usernameText: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  locationText: { color: colors.textDisabled, fontSize: 12 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  ratingValue: { color: colors.win, fontSize: 20, fontWeight: "900" },
  ratingLabel: { color: colors.win, fontSize: 13, fontWeight: "bold" },
  rankRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    backgroundColor: colors.primaryAlpha10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
  },
  rankValue: { color: colors.primary, fontSize: 18, fontWeight: "900" },
  rankTotal: { color: colors.textMuted, fontSize: 12, fontWeight: "bold" },
  statsContainer: { padding: 20, paddingBottom: 0 },
  mainStats: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 20,
  },
  winRateBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  winRateValue: { color: colors.foreground, fontSize: 28, fontWeight: "900" },
  winRateLabel: { color: colors.primary, fontSize: 10, fontWeight: "bold", marginTop: 4 },
  statsGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statMiniBox: { width: "45%" },
  statMiniValue: { color: colors.foreground, fontSize: 18, fontWeight: "900" },
  statMiniLabel: {
    color: colors.textDisabled,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: 2,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  listTitle: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  listCount: { color: colors.textDisabled, fontSize: 11, fontWeight: "bold" },
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gameCardLeft: { flexDirection: "row", alignItems: "center", gap: 16, flex: 1 },
  resultIndicator: { width: 4, height: 40, borderRadius: 2 },
  gameInfo: { flex: 1, gap: 6 },
  opponentRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  opponentName: { color: colors.foreground, fontSize: 16, fontWeight: "bold" },
  opponentElo: { color: colors.textDisabled, fontSize: 12, fontWeight: "bold" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modeText: { color: colors.textSubtle, fontSize: 10, fontWeight: "900" },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.surfaceElevated },
  metaText: { color: colors.textDisabled, fontSize: 11, fontWeight: "bold" },
  gameCardRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  resultText: { fontSize: 10, fontWeight: "900" },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
  footerText: { color: colors.surfaceElevated, fontSize: 12, fontWeight: "bold" },
  emptyState: { padding: 60, alignItems: "center", justifyContent: "center", gap: 16, marginTop: 40 },
  emptyTitle: { color: colors.foreground, fontSize: 18, fontWeight: "bold" },
  followBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
  },
  rivalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(239,68,68,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    marginTop: 8,
  },
  rivalBadgeText: { color: colors.danger, fontSize: 12, fontWeight: "900" },
  friendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(16,185,129,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
    marginTop: 8,
  },
  friendBadgeText: { color: colors.win, fontSize: 12, fontWeight: "900" },
});
