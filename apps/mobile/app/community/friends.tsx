import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Search,
  Users,
  Swords,
  Trophy,
  Flame,
  User as UserIcon,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { colors } from "../../src/theme/colors";
import { useSocial } from "../../src/hooks/useSocial";
import { SocialUser } from "../../src/services/social.service";

type Tab = "friends" | "following" | "followers";

export default function FriendsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { getFriends, getFollowing, getFollowers, loading } = useSocial();

  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<SocialUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      let result;
      if (activeTab === "friends") {
        result = await getFriends();
      } else if (activeTab === "following") {
        const following = await getFollowing();
        result = following.map((f: any) => f.following);
      } else {
        const followers = await getFollowers();
        result = followers.map((f: any) => f.follower);
      }
      setData(result);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const renderUserItem = ({ item }: { item: SocialUser }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.avatarWrapper}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.placeholderAvatar}>
              <UserIcon color={colors.textSubtle} size={24} />
            </View>
          )}
          {item.isRival && (
            <View style={styles.rivalBadge}>
              <Flame color="#fff" size={12} fill="#fff" />
            </View>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.displayName}>{item.displayName}</Text>
          <Text style={styles.username}>@{item.username}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Trophy size={12} color={colors.primary} />
              <Text style={styles.statText}>{item.rating?.rating || 1200}</Text>
            </View>
            {item.gameCount !== undefined && (
              <View style={[styles.stat, { marginLeft: 12 }]}>
                <Swords size={12} color={colors.textMuted} />
                <Text style={styles.statText}>{item.gameCount} games</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        {activeTab === "friends" ? (
          <View style={styles.friendActions}>
            <TouchableOpacity
              style={styles.viewProfileButton}
              onPress={() => router.push(`/game/player/${item.id}` as any)}
            >
              <Text style={styles.viewProfileText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.challengeButton}
              onPress={() => router.push(`/game/lobby?challenge=${item.username}` as any)}
            >
              <Swords color="#000" size={18} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={() => router.push(`/game/player/${item.id}` as any)}
          >
            <Text style={styles.viewProfileText}>Profile</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("social.title", "Social Hub")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.tabsWrapper}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "friends" && styles.activeTab]}
          onPress={() => setActiveTab("friends")}
        >
          <Text style={[styles.tabText, activeTab === "friends" && styles.activeTabText]}>
            Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "following" && styles.activeTab]}
          onPress={() => setActiveTab("following")}
        >
          <Text style={[styles.tabText, activeTab === "following" && styles.activeTabText]}>
            Following
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "followers" && styles.activeTab]}
          onPress={() => setActiveTab("followers")}
        >
          <Text style={[styles.tabText, activeTab === "followers" && styles.activeTabText]}>
            Followers
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <Search color={colors.textDisabled} size={20} />
          <TextInput
            placeholder="Search your social circle..."
            placeholderTextColor={colors.textDisabled}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={data.filter(u => 
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
            u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
          )}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Users color={colors.textDisabled} size={64} strokeWidth={1} />
              <Text style={styles.emptyTitle}>
                {activeTab === "friends" ? "No Rivals Yet" : "Silence in the Safari"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === "friends" 
                  ? "Follow mutuals and play a game to become Friends." 
                  : "Start following players to see them here."}
              </Text>
              <TouchableOpacity 
                style={styles.findPlayersBtn}
                onPress={() => router.push("/game/leaderboard")}
              >
                <Text style={styles.findPlayersBtnText}>Find Players</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
  tabsWrapper: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: {
    backgroundColor: colors.primaryAlpha15,
    borderColor: colors.primaryAlpha30,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  activeTabText: {
    color: colors.primary,
  },
  searchBarWrapper: {
    padding: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: colors.foreground,
    fontSize: 15,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  placeholderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  rivalBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: colors.primary,
    borderRadius: 8,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  displayName: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "bold",
  },
  username: {
    color: colors.textSubtle,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  actions: {
    marginLeft: 12,
  },
  friendActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  challengeButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  viewProfileButton: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewProfileText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: "bold",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    textAlign: "center",
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  findPlayersBtn: {
    marginTop: 24,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  findPlayersBtnText: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "bold",
  },
});
