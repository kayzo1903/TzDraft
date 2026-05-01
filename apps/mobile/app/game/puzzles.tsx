import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, ArrowRight, Puzzle as PuzzleIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../src/theme/colors";
import { puzzleService, Puzzle } from "../../src/services/puzzle.service";

const THEMES     = ["sacrifice", "position-trap", "king-trap", "endgame", "promotion"];
const DIFFICULTY = [1, 2, 3, 4, 5];
const PAGE_SIZE  = 20;

function themeLabel(t: string) {
  return t.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function isNew(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 6 * 3600000;
}

function themeAccent(t: string): string {
  const map: Record<string, string> = {
    sacrifice:       "rgba(251,113,133,0.15)",
    "position-trap": "rgba(52,211,153,0.15)",
    "king-trap":     "rgba(167,139,250,0.15)",
    endgame:         "rgba(251,191,36,0.15)",
    promotion:       "rgba(56,189,248,0.15)",
  };
  return map[t] ?? "rgba(255,255,255,0.05)";
}

function themeBorder(t: string): string {
  const map: Record<string, string> = {
    sacrifice:       "rgba(251,113,133,0.3)",
    "position-trap": "rgba(52,211,153,0.3)",
    "king-trap":     "rgba(167,139,250,0.3)",
    endgame:         "rgba(251,191,36,0.3)",
    promotion:       "rgba(56,189,248,0.3)",
  };
  return map[t] ?? colors.border;
}

function themeText(t: string): string {
  const map: Record<string, string> = {
    sacrifice:       "#fca5a5",
    "position-trap": "#6ee7b7",
    "king-trap":     "#c4b5fd",
    endgame:         "#fcd34d",
    promotion:       "#7dd3fc",
  };
  return map[t] ?? colors.textMuted;
}

export default function PuzzlesScreen() {
  const router = useRouter();

  const [puzzles,    setPuzzles]    = useState<Puzzle[]>([]);
  const [daily,      setDaily]      = useState<Puzzle | null>(null);
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore,setLoadingMore]= useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAll(1, true);
  }, []);

  const fetchAll = async (p: number, reset: boolean) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    const [puzzleRes, dailyRes] = await Promise.all([
      puzzleService.listPaged({
        page: p,
        limit: PAGE_SIZE,
      }),
      p === 1 ? puzzleService.getDaily() : Promise.resolve(null),
    ]);

    if (reset) {
      setPuzzles(puzzleRes.data);
      if (dailyRes) setDaily(dailyRes);
    } else {
      setPuzzles((prev) => [...prev, ...puzzleRes.data]);
    }
    setTotal(puzzleRes.total);
    setPage(p);
    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll(1, true);
  }, []);

  const loadMore = () => {
    if (loadingMore || puzzles.length >= total) return;
    fetchAll(page + 1, false);
  };



  const renderPuzzle = ({ item }: { item: Puzzle }) => {
    const fresh = item.publishedAt && isNew(item.publishedAt);
    return (
      <TouchableOpacity
        style={styles.puzzleListItem}
        activeOpacity={0.7}
        onPress={() => router.push(`/game/puzzle-player?id=${item.id}` as any)}
      >
        <View style={styles.puzzleIconWrap}>
          <PuzzleIcon color={colors.primary} size={20} />
        </View>
        <View style={styles.puzzleInfo}>
          <View style={styles.puzzleTitleRow}>
            <Text style={styles.puzzleTitle} numberOfLines={1}>
              {item.title ?? `${item.sideToMove === "WHITE" ? "White" : "Black"} to move`}
            </Text>
            {fresh && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          <View style={styles.puzzleMeta}>
            <View style={[styles.themePill, { backgroundColor: themeAccent(item.theme), borderColor: themeBorder(item.theme) }]}>
              <Text style={[styles.themePillText, { color: themeText(item.theme) }]}>
                {themeLabel(item.theme)}
              </Text>
            </View>
            <Text style={styles.cardStars}>{"★".repeat(item.difficulty)}</Text>
            {item.publishedAt && (
              <Text style={styles.cardTime}>{timeAgo(item.publishedAt)}</Text>
            )}
          </View>
        </View>
        <View style={styles.puzzleAction}>
          <Text style={styles.cardAttempts}>{item._count.attempts} plays</Text>
          <ArrowRight color={colors.textMuted} size={16} />
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Continuous Play hero */}
      <TouchableOpacity
        style={styles.dailyCard}
        activeOpacity={0.9}
        onPress={() => router.push(`/game/puzzle-player?continuous=true` as any)}
      >
        <LinearGradient
          colors={[colors.primary, "#ea580c"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.dailyGradient}
        >
          <View style={styles.dailyTop}>
            <View style={styles.dailyBadge}>
              <Text style={styles.dailyBadgeText}>PUZZLE RUSH</Text>
            </View>
          </View>
          <Text style={styles.dailyTitle}>Continuous Training</Text>
          <View style={styles.dailyBottom}>
            <Text style={{ color: "#fff", opacity: 0.8, fontSize: 13 }}>Play through all puzzles</Text>
            <View style={styles.solveBtn}>
              <Text style={styles.solveBtnText}>Start Now</Text>
              <ArrowRight color="#fff" size={13} />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.countText}>{total} puzzle{total !== 1 ? "s" : ""}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/" as any)} style={styles.iconBtn}>
          <ArrowLeft color={colors.foreground} size={22} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <PuzzleIcon color={colors.primary} size={18} />
          <Text style={styles.headerTitle}>Puzzles</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={puzzles}
          keyExtractor={(item) => item.id}
          renderItem={renderPuzzle}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<ListHeader />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} /> : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <PuzzleIcon color={colors.textDisabled} size={48} />
              <Text style={styles.emptyText}>No puzzles available.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  header:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerCenter:    { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle:     { color: colors.foreground, fontSize: 18, fontWeight: "900" },
  iconBtn:         { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  loadingWrap:     { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent:     { padding: 12, paddingBottom: 80 },
  row:             { gap: 10, marginBottom: 10 },
  dailyCard:       { borderRadius: 20, overflow: "hidden", marginBottom: 20 },
  dailyGradient:   { padding: 18, minHeight: 140, justifyContent: "space-between" },
  dailyTop:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dailyBadge:      { backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dailyBadgeText:  { color: "#fff", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  dailyAttempts:   { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  dailyTitle:      { color: "#fff", fontSize: 20, fontWeight: "900", marginVertical: 10 },
  dailyBottom:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dailyStars:      { color: "#fcd34d", fontSize: 14 },
  solveBtn:        { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  solveBtnText:    { color: "#fff", fontSize: 12, fontWeight: "bold" },
  filtersSection:  { marginBottom: 16 },
  filterLabel:     { color: colors.textSubtle, fontSize: 9, fontWeight: "900", letterSpacing: 2, marginBottom: 8 },
  filterRow:       { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip:            { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive:      { borderColor: colors.primaryAlpha30, backgroundColor: colors.primaryAlpha10 },
  chipText:        { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  chipTextActive:  { color: colors.primary, fontWeight: "900" },
  clearBtn:        { alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  clearBtnText:    { color: colors.textMuted, fontSize: 12 },
  countText:       { color: colors.textSubtle, fontSize: 11, marginBottom: 12 },
  puzzleListItem:  { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12, marginBottom: 10 },
  puzzleIconWrap:  { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryAlpha10, alignItems: "center", justifyContent: "center" },
  puzzleInfo:      { flex: 1, gap: 6 },
  puzzleTitleRow:  { flexDirection: "row", alignItems: "center", gap: 6 },
  puzzleTitle:     { color: colors.foreground, fontSize: 14, fontWeight: "bold", flexShrink: 1 },
  newBadge:        { backgroundColor: "rgba(249,115,22,0.15)", borderWidth: 1, borderColor: "rgba(249,115,22,0.4)", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  newBadgeText:    { color: colors.primary, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  puzzleMeta:      { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTime:        { color: colors.textDisabled, fontSize: 10 },
  puzzleAction:    { alignItems: "flex-end", gap: 6 },
  themePill:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  themePillText:   { fontSize: 9, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  cardStars:       { color: "#fbbf24", fontSize: 10 },
  cardAttempts:    { color: colors.textDisabled, fontSize: 10, fontWeight: "600" },
  emptyWrap:       { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText:       { color: colors.textSubtle, fontSize: 14, textAlign: "center" },
});
