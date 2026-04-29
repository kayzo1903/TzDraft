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
import { ArrowLeft, ArrowRight, Target } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../src/theme/colors";
import { puzzleService, Puzzle } from "../../src/services/puzzle.service";

const THEMES     = ["sacrifice", "position-trap", "king-trap", "endgame", "promotion"];
const DIFFICULTY = [1, 2, 3, 4, 5];
const PAGE_SIZE  = 20;

function themeLabel(t: string) {
  return t.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

  const MiniBoard = ({ pieces }: { pieces: any[] }) => {
    const pdnMap = new Map();
    (pieces || []).forEach(p => pdnMap.set(p.position, p));

    return (
      <View style={{ width: 48, height: 48, flexWrap: "wrap", flexDirection: "row", borderWidth: 1, borderColor: colors.border, borderRadius: 4, overflow: "hidden" }}>
        {Array.from({ length: 64 }).map((_, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const isDark = (row + col) % 2 !== 0;
          
          let piece = null;
          if (isDark) {
            const pdn = Math.floor(row * 4) + Math.floor(col / 2) + 1;
            piece = pdnMap.get(pdn);
          }

          return (
            <View key={i} style={{ width: 6, height: 6, backgroundColor: isDark ? colors.boardDark : colors.boardLight, alignItems: "center", justifyContent: "center" }}>
              {piece && (
                <View style={{
                  width: 4, height: 4, borderRadius: 2,
                  backgroundColor: piece.color === "WHITE" ? "#f8fafc" : "#1e293b",
                  borderWidth: piece.type === "KING" ? 1 : 0,
                  borderColor: "#fbbf24"
                }} />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderPuzzle = ({ item, index }: { item: Puzzle; index: number }) => (
    <TouchableOpacity
      style={styles.puzzleCard}
      activeOpacity={0.75}
      onPress={() => router.push(`/game/puzzle-player?id=${item.id}` as any)}
    >
      <View style={styles.puzzleCardTop}>
        <View style={[styles.themePill, { backgroundColor: themeAccent(item.theme), borderColor: themeBorder(item.theme) }]}>
          <Text style={[styles.themePillText, { color: themeText(item.theme) }]}>
            {themeLabel(item.theme)}
          </Text>
        </View>
        <Text style={styles.cardStars}>{"★".repeat(item.difficulty)}{"☆".repeat(5 - item.difficulty)}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
        <MiniBoard pieces={item.pieces} />
        <Text style={[styles.cardTitle, { flex: 1 }]} numberOfLines={3}>
          {item.title ?? `${item.sideToMove === "WHITE" ? "White" : "Black"} to move`}
        </Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardAttempts}>{item._count.attempts} attempts</Text>
        <ArrowRight color={colors.primary} size={14} />
      </View>
    </TouchableOpacity>
  );

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
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft color={colors.foreground} size={22} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Target color={colors.primary} size={18} />
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
          numColumns={2}
          columnWrapperStyle={styles.row}
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
              <Target color={colors.textDisabled} size={48} />
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
  puzzleCard:      { flex: 1, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  puzzleCardTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  themePill:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  themePillText:   { fontSize: 9, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  cardStars:       { color: "#fbbf24", fontSize: 10 },
  cardTitle:       { color: colors.foreground, fontSize: 13, fontWeight: "bold", lineHeight: 18 },
  cardFooter:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  cardAttempts:    { color: colors.textDisabled, fontSize: 10 },
  emptyWrap:       { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText:       { color: colors.textSubtle, fontSize: 14, textAlign: "center" },
});
