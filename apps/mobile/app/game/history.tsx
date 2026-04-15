import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Trophy,
  Minus,
  X as XIcon,
  Clock3,
  BarChart3,
  ChevronRight,
  Filter,
  Cpu,
  Target,
  Swords,
  WifiOff,
  RefreshCw
} from "lucide-react-native";
import { historyService, GameHistoryItem, PlayerStats, HistoryFilters } from "../../src/lib/history-service";
import { LoadingScreen } from "../../src/components/ui/LoadingScreen";
import { colors } from "../../src/theme/colors";

const PAGE_SIZE = 20;

export default function GameHistoryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const locale = i18n.language;

  // State
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [games, setGames] = useState<GameHistoryItem[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<HistoryFilters>({ result: "ALL", gameType: "ALL" });

  const fetchStats = useCallback(async () => {
    try {
      const data = await historyService.getStats();
      setStats(data);
    } catch (error) {
      console.warn("[History] Stats failed:", error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchGames = useCallback(async (pageNum = 0, currentFilters = filters) => {
    try {
      const { items, total } = await historyService.getHistory(pageNum * PAGE_SIZE, PAGE_SIZE, currentFilters);
      setNetworkError(false);
      if (pageNum === 0) {
        setGames(items);
      } else {
        setGames(prev => [...prev, ...items]);
      }
      setTotalGames(total);
    } catch (error) {
      console.warn("[History] Games failed:", error);
      if (pageNum === 0) setNetworkError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
    fetchGames(0);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setNetworkError(false);
    setPage(0);
    fetchStats();
    fetchGames(0);
  };

  const onEndReached = () => {
    if (games.length < totalGames && !loadingMore && !loading) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      fetchGames(nextPage);
    }
  };

  const handleFilterChange = (newFilters: HistoryFilters) => {
    setLoading(true);
    setPage(0);
    setFilters(newFilters);
    fetchGames(0, newFilters);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    const date = new Date(iso);
    return new Intl.DateTimeFormat(locale === "sw" ? "sw-TZ" : "en-US", {
      month: "short", day: "numeric"
    }).format(date);
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "—";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  const renderResultBadge = (result: "WIN" | "LOSS" | "DRAW") => {
    const configs = {
      WIN: { icon: Trophy, color: colors.win, label: "WON" },
      LOSS: { icon: XIcon, color: colors.danger, label: "LOST" },
      DRAW: { icon: Minus, color: colors.textSubtle, label: "DRAW" }
    };
    const config = configs[result];
    return (
      <View style={[styles.resultBadge, { backgroundColor: config.color + "15", borderColor: config.color + "30" }]}>
        <config.icon size={12} color={config.color} />
        <Text style={[styles.resultText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  };

  const renderStatCard = (label: string, value: string | number, color = "#fff") => (
    <View style={styles.statMiniBox}>
      <Text style={styles.statMiniValue}>{value}</Text>
      <Text style={styles.statMiniLabel}>{label}</Text>
    </View>
  );

  const renderGameItem = ({ item }: { item: GameHistoryItem }) => (
    <TouchableOpacity 
      style={styles.gameCard}
      onPress={() => console.log("Replay", item.id)}
    >
      <View style={styles.gameCardLeft}>
        <View style={[styles.resultIndicator, {
          backgroundColor: item.result === "WIN" ? colors.win : item.result === "LOSS" ? colors.danger : colors.textSubtle
        }]} />
        <View style={styles.gameInfo}>
          <View style={styles.opponentRow}>
            <Text style={styles.opponentName}>
              {item.opponent ? item.opponent.displayName : "Stockfish AI"}
            </Text>
            {item.opponent?.elo && <Text style={styles.opponentElo}>({item.opponent.elo})</Text>}
          </View>
          <View style={styles.metaRow}>
            <View style={styles.modeBadge}>
              {item.gameType === "AI" ? <Cpu size={10} color={colors.textSubtle} /> : <Target size={10} color={colors.textSubtle} />}
              <Text style={styles.modeText}>{item.gameType}</Text>
            </View>
            <View style={styles.dot} />
            <Text style={styles.metaText}>{formatDate(item.playedAt)}</Text>
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

  if (loading && !refreshing && page === 0) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.root} edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("home.history", "Game History")}</Text>
        <TouchableOpacity style={styles.backButton}>
           <Filter size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={games}
        renderItem={renderGameItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            {/* Stats Overview */}
            <View style={styles.statsContainer}>
              <View style={styles.mainStats}>
                 <View style={styles.winRateBox}>
                    <Text style={styles.winRateValue}>{stats?.winRate || 0}%</Text>
                    <Text style={styles.winRateLabel}>WIN RATE</Text>
                 </View>
                 <View style={styles.statsGrid}>
                    <View style={styles.statMiniBox}>
                       <Text style={styles.statMiniValue}>{stats?.total || 0}</Text>
                       <Text style={styles.statMiniLabel}>TOTAL</Text>
                    </View>
                    <View style={styles.statMiniBox}>
                       <Text style={[styles.statMiniValue, { color: colors.win }]}>{stats?.wins || 0}</Text>
                       <Text style={styles.statMiniLabel}>WINS</Text>
                    </View>
                    <View style={styles.statMiniBox}>
                       <Text style={[styles.statMiniValue, { color: colors.danger }]}>{stats?.losses || 0}</Text>
                       <Text style={styles.statMiniLabel}>LOSSES</Text>
                    </View>
                    <View style={styles.statMiniBox}>
                       <Text style={[styles.statMiniValue, { color: colors.textSubtle }]}>{stats?.draws || 0}</Text>
                       <Text style={styles.statMiniLabel}>DRAWS</Text>
                    </View>
                 </View>
              </View>
            </View>

            {/* Filter Chips */}
            <View style={styles.filterSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                {(["ALL", "WIN", "LOSS", "DRAW"] as const).map(res => (
                  <TouchableOpacity 
                    key={res} 
                    style={[styles.filterChip, filters.result === res && styles.filterChipActive]}
                    onPress={() => handleFilterChange({ ...filters, result: res })}
                  >
                    <Text style={[styles.filterChipText, filters.result === res && styles.filterChipTextActive]}>
                      {res}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.filterSeparator} />
                {(["ALL", "RANKED", "AI", "CASUAL"] as const).map(type => (
                  <TouchableOpacity 
                    key={type} 
                    style={[styles.filterChip, filters.gameType === type && styles.filterChipActive]}
                    onPress={() => handleFilterChange({ ...filters, gameType: type })}
                  >
                    <Text style={[styles.filterChipText, filters.gameType === type && styles.filterChipTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.listHeader}>
               <Text style={styles.listTitle}>Timeline</Text>
               <Text style={styles.listCount}>{totalGames} matches</Text>
            </View>
          </>
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
        ListEmptyComponent={
          !loading ? (
            networkError ? (
              <View style={styles.emptyState}>
                <WifiOff size={48} color={colors.surfaceElevated} />
                <Text style={styles.emptyTitle}>Unable to connect</Text>
                <Text style={styles.emptySubtitle}>Check your connection and try again.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                  <RefreshCw size={16} color={colors.primary} />
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Swords size={48} color={colors.surfaceElevated} />
                <Text style={styles.emptyTitle}>No games found</Text>
                <Text style={styles.emptySubtitle}>Start your first match to see your history here!</Text>
              </View>
            )
          ) : null
        }
      />
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
  },
  headerTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
  statsContainer: {
    padding: 20,
  },
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
  winRateValue: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "900",
  },
  winRateLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 4,
  },
  statsGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statMiniBox: {
    width: "45%",
  },
  statMiniValue: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
  },
  statMiniLabel: {
    color: colors.textDisabled,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: 2,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primaryAlpha10,
    borderColor: colors.primaryAlpha30,
  },
  filterChipText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "bold",
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  filterSeparator: {
    width: 1,
    height: 20,
    backgroundColor: colors.borderStrong,
    marginHorizontal: 8,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  listTitle: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  listCount: {
    color: colors.textDisabled,
    fontSize: 11,
    fontWeight: "bold",
  },
  listContent: {
    paddingBottom: 40,
  },
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
  gameCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  resultIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  gameInfo: {
    flex: 1,
    gap: 6,
  },
  opponentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  opponentName: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "bold",
  },
  opponentElo: {
    color: colors.textDisabled,
    fontSize: 12,
    fontWeight: "bold",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modeText: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: "900",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.surfaceElevated,
  },
  metaText: {
    color: colors.textDisabled,
    fontSize: 11,
    fontWeight: "bold",
  },
  gameCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  resultText: {
    fontSize: 10,
    fontWeight: "900",
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  footerText: {
    color: colors.surfaceElevated,
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyState: {
    padding: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 40,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
  emptySubtitle: {
    color: colors.textSubtle,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primaryAlpha10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
  },
  retryText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "bold",
  },
});
