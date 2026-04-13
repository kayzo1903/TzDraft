import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Dimensions, 
  ImageBackground
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { 
  ArrowLeft, 
  Users, 
  Trophy, 
  Medal, 
  ChevronRight, 
  Gamepad2, 
  Star,
  MessageSquare,
  Share2
} from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function CommunityHub() {
  const { t } = useTranslation();
  const router = useRouter();

  const CommunityCard = ({ icon: Icon, title, subtitle, onPress, color = "#f59e0b" }: any) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}10` }]}>
        <Icon color={color} size={28} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight color="#404040" size={20} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("community.title", "Community")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>{t("community.heroTitle", "Join the Elite")}</Text>
          <Text style={styles.heroSubtitle}>
            {t("community.heroSubtitle", "Connect with players, compete in events, and climb the rankings.")}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("community.discover", "Discover")}</Text>
          <CommunityCard 
            icon={Trophy}
            title={t("community.tournaments", "Active Tournaments")}
            subtitle={t("community.tournamentsDesc", "Join official prize pools and special events")}
            onPress={() => router.push("/game/tournaments")}
          />
          <CommunityCard 
            icon={Medal}
            title={t("community.leaderboard", "Global Leaderboard")}
            subtitle={t("community.leaderboardDesc", "See where you stand among the world's best")}
            onPress={() => router.push("/game/leaderboard")}
            color="#ec4899"
          />
          <CommunityCard 
            icon={Users}
            title={t("community.clubs", "Player Clubs")}
            subtitle={t("community.clubsDesc", "Join groups or create your own community")}
            onPress={() => {}} // Placeholder
            color="#8b5cf6"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("community.social", "Social")}</Text>
          <View style={styles.socialGrid}>
             <TouchableOpacity style={styles.socialBox}>
                <MessageSquare color="#f59e0b" size={24} />
                <Text style={styles.socialLabel}>Discord</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.socialBox}>
                <Share2 color="#f59e0b" size={24} />
                <Text style={styles.socialLabel}>Invite</Text>
             </TouchableOpacity>
          </View>
        </View>

        <View style={styles.topPlayersSection}>
           <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>{t("community.topPlayers", "Top Players")}</Text>
              <Text style={styles.viewAll}>{t("common.viewAll", "View All")}</Text>
           </View>
           {[1, 2, 3].map((i) => (
             <View key={i} style={styles.playerRow}>
                <View style={styles.playerInfo}>
                   <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>{i}</Text>
                   </View>
                   <View>
                      <Text style={styles.playerName}>Grandmaster_{i}</Text>
                      <Text style={styles.playerRating}>2840 ELO</Text>
                   </View>
                </View>
                <Star color={i === 1 ? "#f59e0b" : "#404040"} size={16} fill={i === 1 ? "#f59e0b" : "transparent"} />
             </View>
           ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030307",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 20,
  },
  heroSection: {
    marginBottom: 32,
    marginTop: 10,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: "#737373",
    fontSize: 16,
    marginTop: 8,
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
    gap: 12,
  },
  sectionLabel: {
    color: "#525252",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cardSubtitle: {
    color: "#737373",
    fontSize: 12,
    marginTop: 2,
  },
  socialGrid: {
    flexDirection: "row",
    gap: 12,
  },
  socialBox: {
    flex: 1,
    height: 90,
    backgroundColor: "#111",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  socialLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  topPlayersSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  viewAll: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "bold",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111",
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  playerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  avatarText: {
    color: "#f59e0b",
    fontWeight: "900",
  },
  playerName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  playerRating: {
    color: "#737373",
    fontSize: 12,
  },
});
