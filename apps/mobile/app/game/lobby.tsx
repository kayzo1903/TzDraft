import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  Platform,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Users,
  Zap,
  Clock,
  Shield,
  Search,
  X,
  Trophy
} from "lucide-react-native";
import { colors } from "../../src/theme/colors";

const { width } = Dimensions.get("window");

export default function OnlineLobby() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(60);
  
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTime(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
          })
        ])
      ).start();

      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ).start();
    } else {
      setSearchTime(60);
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"]
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartSearch = () => {
    setIsSearching(true);
  };

  const handleCancelSearch = () => {
    setIsSearching(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("lobby.title", "Online Match")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        {!isSearching ? (
          <View style={styles.setupSection}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Users color={colors.primary} size={20} />
                <Text style={styles.statValue}>1,248</Text>
                <Text style={styles.statLabel}>{t("lobby.online", "Online")}</Text>
              </View>
              <View style={styles.statCard}>
                <Trophy color={colors.primary} size={20} />
                <Text style={styles.statValue}>150</Text>
                <Text style={styles.statLabel}>{t("lobby.active", "Active Games")}</Text>
              </View>
            </View>

            <View style={styles.modeSelection}>
              <Text style={styles.sectionTitle}>{t("lobby.selectMode", "Select Time Control")}</Text>
              <View style={styles.grid}>
                <TouchableOpacity style={styles.modeCard}>
                  <Zap color={colors.primary} size={24} />
                  <Text style={styles.modeTitle}>Blitz</Text>
                  <Text style={styles.modeDesc}>3 + 2</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modeCard, styles.activeModeCard]}>
                  <Clock color={colors.primary} size={24} />
                  <Text style={styles.modeTitle}>Rapid</Text>
                  <Text style={styles.modeDesc}>10 + 5</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modeCard}>
                  <Shield color={colors.primary} size={24} />
                  <Text style={styles.modeTitle}>Classic</Text>
                  <Text style={styles.modeDesc}>30 + 0</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.mainActionBtn}
              onPress={handleStartSearch}
            >
              <Text style={styles.mainActionText}>{t("lobby.findOpponent", "Find Opponent")}</Text>
              <Search color={colors.onPrimary} size={20} strokeWidth={3} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.searchSection}>
            <Animated.View style={[styles.searchRing, { transform: [{ scale: pulseAnim }] }]}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Search color={colors.primary} size={60} strokeWidth={1} />
              </Animated.View>
            </Animated.View>
            
            <Text style={styles.searchingTitle}>{t("lobby.searching", "Searching for Opponent...")}</Text>
            <Text style={styles.searchTimer}>{formatTime(searchTime)}</Text>
            
            <View style={styles.searchDetails}>
              <Text style={styles.detailText}>{t("lobby.ratingRange", "Rating Range: 1100 - 1300")}</Text>
              <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            </View>

            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={handleCancelSearch}
            >
              <X color={colors.danger} size={20} />
              <Text style={styles.cancelBtnText}>{t("common.cancel", "Cancel")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  setupSection: {
    gap: 32,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 8,
  },
  statLabel: {
    color: colors.textSubtle,
    fontSize: 12,
    marginTop: 2,
  },
  modeSelection: {
    gap: 16,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  activeModeCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha05,
  },
  modeTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "bold",
  },
  modeDesc: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  mainActionBtn: {
    backgroundColor: colors.primary,
    height: 64,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mainActionText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  searchSection: {
    alignItems: "center",
    gap: 30,
  },
  searchRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primaryAlpha05,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primaryAlpha10,
  },
  searchingTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  searchTimer: {
    color: colors.primary,
    fontSize: 48,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  searchDetails: {
    alignItems: "center",
  },
  detailText: {
    color: colors.textSubtle,
    fontSize: 14,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dangerAlpha20,
    marginTop: 20,
  },
  cancelBtnText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "bold",
  },
});
