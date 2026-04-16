import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  ArrowLeft, 
  Trophy, 
  Medal, 
  TrendingUp, 
  Search, 
  ChevronRight,
  User,
  Globe
} from "lucide-react-native";
import { historyService, LeaderboardEntry } from "../../src/lib/history-service";
import { LoadingScreen } from "../../src/components/ui/LoadingScreen";
import { colors } from "../../src/theme/colors";

const PAGE_SIZE = 50;

export default function LeaderboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<string>("ALL");

  const countries = [
    { id: "ALL", name: "Global", icon: Globe },
    { id: "TZ", name: "Tanzania" },
    { id: "KE", name: "Kenya" },
    { id: "UG", name: "Uganda" },
    { id: "RW", name: "Rwanda" },
    { id: "BI", name: "Burundi" },
  ];

  const fetchLeaderboard = useCallback(async (pageNum = 0) => {
    try {
      const { items, total } = await historyService.getLeaderboard({ 
        skip: pageNum * PAGE_SIZE, 
        take: PAGE_SIZE,
        country: selectedCountry !== "ALL" ? selectedCountry : undefined
      });
      
      if (pageNum === 0) {
        setPlayers(items);
      } else {
        setPlayers(prev => [...prev, ...items]);
      }
      setTotalPlayers(total);
    } catch (error) {
      console.error("[Leaderboard] Fetch failed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(0);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchLeaderboard(0);
  };

  const onEndReached = () => {
    if (players.length < totalPlayers && !loadingMore && !loading) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      fetchLeaderboard(nextPage);
    }
  };

  const renderPlayerItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isTop3 = index < 3;
    const rankColors = [colors.rankGold, colors.rankSilver, colors.rankBronze];
    
    return (
      <View style={styles.playerCard}>
        <View style={styles.playerCardLeft}>
          <View style={[
            styles.rankBadge,
            isTop3 && { backgroundColor: rankColors[index] }
          ]}>
            <Text style={[styles.rankText, isTop3 && styles.rankTextDark]}>{index + 1}</Text>
          </View>
          
          <View style={styles.avatarContainer}>
             <User size={18} color={colors.textDisabled} />
          </View>
          
          <View style={styles.playerInfo}>
             <Text style={styles.playerName} numberOfLines={1}>{item.displayName}</Text>
             <View style={styles.extraInfo}>
                <Globe size={10} color={colors.textDisabled} />
                <Text style={styles.extraText}>{item.country || "Global"}</Text>
                <View style={styles.dot} />
                <Text style={styles.extraText}>{item.gamesPlayed} games</Text>
             </View>
          </View>
        </View>

        <View style={styles.playerCardRight}>
          <View style={styles.ratingBadge}>
             <TrendingUp size={12} color={colors.win} />
             <Text style={styles.ratingValue}>{item.rating}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing && page === 0) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.root} edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("home.leaderboard", "Leaderboard")}</Text>
        <TouchableOpacity style={styles.backButton}>
           <Search size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={players}
        renderItem={renderPlayerItem}
        keyExtractor={item => item.userId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            <View style={styles.listHeader}>
               <Text style={styles.listHeaderTitle}>Global Rankings</Text>
               <Text style={styles.listHeaderSub}>{totalPlayers} active players</Text>
            </View>

            <View style={styles.filterSection}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.filterScroll}
              >
                {countries.map(country => (
                  <TouchableOpacity 
                    key={country.id} 
                    style={[styles.filterChip, selectedCountry === country.id && styles.filterChipActive]}
                    onPress={() => {
                       setLoading(true);
                       setPage(0);
                       setSelectedCountry(country.id);
                       fetchLeaderboard(0);
                    }}
                  >
                    {country.icon && <country.icon size={12} color={selectedCountry === country.id ? colors.primary : colors.textSubtle} style={{ marginRight: 6 }} />}
                    <Text style={[styles.filterChipText, selectedCountry === country.id && styles.filterChipTextActive]}>
                       {country.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : players.length > 0 ? (
            <View style={styles.footerLoader}>
               <Text style={styles.footerText}>End of rankings</Text>
            </View>
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
  listHeader: {
    padding: 24,
  },
  listHeaderTitle: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "900",
  },
  listHeaderSub: {
    color: colors.textSubtle,
    fontSize: 14,
    marginTop: 4,
    fontWeight: "bold",
  },
  listContent: {
    paddingBottom: 40,
  },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    color: colors.textSubtle,
    fontSize: 13,
    fontWeight: "900",
  },
  rankTextDark: {
    color: colors.onPrimary,
  },
  avatarContainer: {
     width: 40,
     height: 40,
     borderRadius: 12,
     backgroundColor: colors.surface,
     alignItems: "center",
     justifyContent: "center",
     borderWidth: 1,
     borderColor: colors.border,
  },
  playerInfo: {
     flex: 1,
  },
  playerName: {
     color: colors.foreground,
     fontSize: 15,
     fontWeight: "bold",
  },
  extraInfo: {
     flexDirection: "row",
     alignItems: "center",
     gap: 6,
     marginTop: 4,
  },
  extraText: {
     color: colors.textDisabled,
     fontSize: 11,
     fontWeight: "bold",
  },
  dot: {
     width: 3,
     height: 3,
     borderRadius: 1.5,
     backgroundColor: colors.surfaceElevated,
  },
  playerCardRight: {
     paddingLeft: 12,
  },
  ratingBadge: {
     flexDirection: "row",
     alignItems: "center",
     gap: 6,
     backgroundColor: "rgba(16, 185, 129, 0.1)",
     paddingHorizontal: 8,
     paddingVertical: 5,
     borderRadius: 10,
     borderWidth: 1,
     borderColor: "rgba(16, 185, 129, 0.2)",
  },
  ratingValue: {
     color: colors.win,
     fontSize: 13,
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
  filterSection: {
    marginBottom: 20,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
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
});
