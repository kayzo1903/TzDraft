import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Tv,
  Users,
  Clock,
  Search,
  ChevronRight,
  Eye,
  Radio,
  Gamepad2,
} from "lucide-react-native";
import { Image } from "expo-image";
import { colors } from "../../src/theme/colors";
import { matchService, LiveGameEntry } from "../../src/lib/match-service";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const formatTimeControl = (ms: number): string => {
  const mins = Math.round(ms / 60000);
  return mins >= 60 ? `${Math.floor(mins / 60)}h` : `${mins}m`;
};

const formatElapsed = (startedAt: string | null, moveCount: number): string => {
  if (!startedAt || moveCount === 0) return "Just started";
  const mins = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (mins < 1) return "Just started";
  if (mins < 60) return `${mins}m in`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m in`;
};

/* ─── Game Card ─────────────────────────────────────────────────────────── */

function GameCard({ item, onPress }: { item: LiveGameEntry; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.gameCard, item.isFollowing && styles.gameCardFollowing]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Top row: LIVE badge + move count */}
      <View style={styles.cardTop}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={styles.metaRight}>
          {item.isFollowing && (
            <View style={styles.followingBadge}>
              <Users size={10} color={colors.primary} />
              <Text style={styles.followingBadgeText}>Following</Text>
            </View>
          )}
          <View style={styles.movesChip}>
            <Gamepad2 size={11} color={colors.textMuted} />
            <Text style={styles.movesText}>{item.moveCount} moves</Text>
          </View>
        </View>
      </View>

      {/* Players row */}
      <View style={styles.playersRow}>
        <PlayerSlot
          name={item.whiteName}
          rating={item.whiteRating}
          avatarUrl={item.whiteAvatarUrl}
          pieceColor="white"
        />
        <View style={styles.vsWrap}>
          <Text style={styles.vsText}>VS</Text>
          <Text style={styles.elapsedText}>{formatElapsed(item.startedAt, item.moveCount)}</Text>
        </View>
        <PlayerSlot
          name={item.blackName}
          rating={item.blackRating}
          avatarUrl={item.blackAvatarUrl}
          pieceColor="black"
        />
      </View>

      {/* Footer: time control + watch button */}
      <View style={styles.cardFooter}>
        <View style={styles.timeChip}>
          <Clock size={12} color={colors.primary} />
          <Text style={styles.timeText}>{formatTimeControl(item.initialTimeMs)}</Text>
        </View>
        <View style={styles.watchBtn}>
          <Eye size={15} color={colors.onPrimary} />
          <Text style={styles.watchBtnText}>Watch</Text>
          <ChevronRight size={15} color={colors.onPrimary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PlayerSlot({
  name,
  rating,
  avatarUrl,
  pieceColor,
}: {
  name: string;
  rating: number;
  avatarUrl: string | null;
  pieceColor: "white" | "black";
}) {
  return (
    <View style={styles.playerSlot}>
      <View style={styles.avatarWrap}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Users size={18} color={colors.textDisabled} />
          </View>
        )}
        <View
          style={[
            styles.pieceIndicator,
            { backgroundColor: pieceColor === "white" ? "#fafaf9" : "#141210" },
          ]}
        />
      </View>
      <Text style={styles.playerName} numberOfLines={1}>{name}</Text>
      <Text style={styles.playerRating}>{rating}</Text>
    </View>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────────────── */

function Skeleton() {
  return (
    <View style={[styles.gameCard, { opacity: 0.5 }]}>
      <View style={styles.cardTop}>
        <View style={[styles.skeletonBox, { width: 56, height: 22, borderRadius: 8 }]} />
        <View style={[styles.skeletonBox, { width: 72, height: 18, borderRadius: 8 }]} />
      </View>
      <View style={styles.playersRow}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.playerSlot}>
            <View style={[styles.skeletonBox, { width: 56, height: 56, borderRadius: 28 }]} />
            <View style={[styles.skeletonBox, { width: 64, height: 13, borderRadius: 4, marginTop: 8 }]} />
            <View style={[styles.skeletonBox, { width: 36, height: 11, borderRadius: 4, marginTop: 4 }]} />
          </View>
        ))}
        <View style={styles.vsWrap} />
      </View>
      <View style={styles.cardFooter}>
        <View style={[styles.skeletonBox, { width: 48, height: 28, borderRadius: 12 }]} />
        <View style={[styles.skeletonBox, { width: 96, height: 36, borderRadius: 14 }]} />
      </View>
    </View>
  );
}

/* ─── Section Header ────────────────────────────────────────────────────── */

function SectionHeader({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionHeaderText}>{label}</Text>
    </View>
  );
}

/* ─── Empty State ───────────────────────────────────────────────────────── */

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyBoxText}>{message}</Text>
    </View>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function WatchLobby() {
  const { t } = useTranslation();
  const router = useRouter();
  const [games, setGames] = useState<LiveGameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGames = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await matchService.getLiveGames();
      setGames(data);
    } catch {
      // keep stale data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
    const id = setInterval(() => fetchGames(true), 30_000);
    return () => clearInterval(id);
  }, [fetchGames]);

  const handleWatch = (gameId: string) => {
    router.push({
      pathname: "/game/watch/[gameId]",
      params: { gameId },
    } as any);
  };

  const followingGames = games.filter((g) => g.isFollowing);
  const otherGames = games.filter((g) => !g.isFollowing);

  const listData: Array<
    | { type: "hero" }
    | { type: "sectionFollowing" }
    | { type: "game"; item: LiveGameEntry }
    | { type: "emptyFollowing" }
    | { type: "sectionAll" }
    | { type: "emptyAll" }
    | { type: "skeletons" }
  > = [];

  if (loading) {
    listData.push({ type: "hero" }, { type: "skeletons" });
  } else {
    listData.push({ type: "hero" });
    listData.push({ type: "sectionFollowing" });
    if (followingGames.length === 0) {
      listData.push({ type: "emptyFollowing" });
    } else {
      for (const g of followingGames) listData.push({ type: "game", item: g });
    }
    listData.push({ type: "sectionAll" });
    if (otherGames.length === 0) {
      listData.push({ type: "emptyAll" });
    } else {
      for (const g of otherGames) listData.push({ type: "game", item: g });
    }
  }

  const renderItem = ({ item: row }: { item: (typeof listData)[number] }) => {
    if (row.type === "hero") {
      return (
        <View style={styles.hero}>
          <View style={styles.heroTitleRow}>
            <Tv size={30} color={colors.primary} />
            <Text style={styles.heroTitle}>{t("nav.watch", "Watch Live")}</Text>
          </View>
          <Text style={styles.heroSub}>
            Spectate ongoing matches from the community — following players shown first.
          </Text>
        </View>
      );
    }
    if (row.type === "skeletons") {
      return (
        <>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </>
      );
    }
    if (row.type === "sectionFollowing") {
      return (
        <SectionHeader
          label="Following"
          icon={<Users size={14} color={colors.primary} />}
        />
      );
    }
    if (row.type === "sectionAll") {
      return (
        <SectionHeader
          label="All Live Games"
          icon={<Radio size={14} color={colors.win} />}
        />
      );
    }
    if (row.type === "emptyFollowing") {
      return (
        <EmptyState message="Players you follow aren't live right now." />
      );
    }
    if (row.type === "emptyAll") {
      return (
        <View style={styles.bigEmpty}>
          <View style={styles.bigEmptyIcon}>
            <Search size={44} color={colors.textDisabled} />
          </View>
          <Text style={styles.bigEmptyTitle}>No Live Games</Text>
          <Text style={styles.bigEmptySub}>No matches in progress. Check back soon!</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchGames()}>
            <Text style={styles.retryBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (row.type === "game") {
      return <GameCard item={row.item} onPress={() => handleWatch(row.item.id)} />;
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t("nav.watch", "Watch")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchGames(true)}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    height: 56,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topBarTitle: {
    color: colors.foreground,
    fontSize: 17,
    fontWeight: "bold",
  },

  list: { paddingHorizontal: 14, paddingBottom: 48 },

  hero: { marginTop: 8, marginBottom: 24 },
  heroTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroTitle: {
    color: colors.foreground,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroSub: {
    color: colors.textSubtle,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  sectionHeaderText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  gameCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  gameCardFollowing: {
    borderColor: "rgba(249,115,22,0.5)",
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(239,68,68,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444",
  },
  liveText: { color: "#ef4444", fontSize: 10, fontWeight: "900" },

  metaRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  followingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  followingBadgeText: { color: colors.primary, fontSize: 10, fontWeight: "800" },

  movesChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  movesText: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },

  playersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  playerSlot: { flex: 1, alignItems: "center", gap: 4 },
  avatarWrap: { position: "relative", marginBottom: 4 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.surfaceElevated },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  pieceIndicator: {
    position: "absolute",
    bottom: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: colors.surface,
  },
  playerName: { color: colors.foreground, fontSize: 13, fontWeight: "700", textAlign: "center" },
  playerRating: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },

  vsWrap: { paddingHorizontal: 8, alignItems: "center", gap: 4 },
  vsText: { color: colors.textDisabled, fontSize: 11, fontWeight: "900", fontStyle: "italic" },
  elapsedText: { color: colors.textSubtle, fontSize: 10 },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timeText: { color: colors.foreground, fontSize: 13, fontWeight: "bold" },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    gap: 5,
  },
  watchBtnText: { color: colors.onPrimary, fontSize: 14, fontWeight: "900" },

  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 14,
    alignItems: "center",
  },
  emptyBoxText: { color: colors.textSubtle, fontSize: 13, textAlign: "center" },

  bigEmpty: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  bigEmptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  bigEmptyTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  bigEmptySub: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 24,
    paddingVertical: 11,
  },
  retryBtnText: { color: colors.foreground, fontSize: 14, fontWeight: "bold" },

  skeletonBox: { backgroundColor: colors.surfaceElevated },
});
