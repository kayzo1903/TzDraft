import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookMarked, ChevronRight, MoveRight, Calendar } from "lucide-react-native";
import { colors } from "../../src/theme/colors";
import { studyService, type SavedStudySummary } from "../../src/services/study.service";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function StudyCard({ study, onPress }: { study: SavedStudySummary; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardIconWrap}>
        <BookMarked color={colors.primary} size={22} />
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{study.name}</Text>
        {study.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{study.description}</Text>
        ) : null}

        <View style={styles.cardMeta}>
          <View style={styles.metaChip}>
            <MoveRight color={colors.textDisabled} size={11} />
            <Text style={styles.metaText}>{study.moveCount} {t("studies.moves", "moves")}</Text>
          </View>
          <View style={styles.metaChip}>
            <Calendar color={colors.textDisabled} size={11} />
            <Text style={styles.metaText}>{formatDate(study.createdAt)}</Text>
          </View>
        </View>
      </View>

      <ChevronRight color={colors.textDisabled} size={18} />
    </TouchableOpacity>
  );
}

export default function StudiesScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [studies, setStudies] = useState<SavedStudySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await studyService.listMine();
      setStudies(data);
    } catch {
      setError(t("studies.loadError", "Failed to load studies. Please try again."));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setIsRefreshing(true);
    load(true);
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft color={colors.foreground} size={20} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.titleBadge}>{t("studies.badge", "FREE PLAY").toUpperCase()}</Text>
          <Text style={styles.title}>{t("studies.title", "My Studies")}</Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>{t("studies.loading", "Loading your studies…")}</Text>
          {/* Skeleton cards */}
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.card, styles.skeletonCard]}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonBody}>
                <View style={[styles.skeletonLine, { width: "60%" }]} />
                <View style={[styles.skeletonLine, { width: "90%", marginTop: 6 }]} />
                <View style={[styles.skeletonLine, { width: "40%", marginTop: 8 }]} />
              </View>
            </View>
          ))}
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryBtnText}>{t("common.retry", "Retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={studies}
          keyExtractor={(s) => s.id}
          contentContainerStyle={studies.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <BookMarked color={colors.textDisabled} size={40} />
              </View>
              <Text style={styles.emptyTitle}>{t("studies.emptyTitle", "No Studies Yet")}</Text>
              <Text style={styles.emptySubtitle}>
                {t("studies.emptySubtitle", "Play a Free Play game and tap Save to record interesting positions.")}
              </Text>
              <TouchableOpacity style={styles.goPlayBtn} onPress={() => router.push("/game/free-play")}>
                <Text style={styles.goPlayBtnText}>{t("studies.goPlay", "Open Free Play")}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <StudyCard
              study={item}
              onPress={() => router.push({ pathname: "/game/study-replay", params: { id: item.id, name: item.name } })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  titleBlock: { flex: 1, alignItems: "center" },
  titleBadge: { color: colors.primary, fontSize: 9, fontWeight: "bold", letterSpacing: 1.5 },
  title: { color: colors.foreground, fontSize: 15, fontWeight: "bold" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  loadingContainer: { flex: 1, alignItems: "center", paddingTop: 40, gap: 14, paddingHorizontal: 16 },
  loadingText: { color: colors.textDisabled, fontSize: 13, fontStyle: "italic", marginBottom: 4 },
  skeletonCard: { opacity: 0.4 },
  skeletonIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceElevated },
  skeletonBody: { flex: 1, gap: 0 },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: colors.surfaceElevated },
  errorText: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  retryBtn: {
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  retryBtnText: { color: colors.foreground, fontSize: 14, fontWeight: "bold" },

  listContent: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1 },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  emptyTitle: { color: colors.foreground, fontSize: 18, fontWeight: "900", textAlign: "center" },
  emptySubtitle: { color: colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },
  goPlayBtn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14,
    backgroundColor: colors.primary,
  },
  goPlayBtnText: { color: "#000", fontSize: 14, fontWeight: "bold" },

  // Study card
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.primaryAlpha10,
    borderWidth: 1, borderColor: colors.primaryAlpha30,
    alignItems: "center", justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 4 },
  cardName: { color: colors.foreground, fontSize: 14, fontWeight: "bold" },
  cardDesc: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  cardMeta: { flexDirection: "row", gap: 12, marginTop: 4 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: colors.textDisabled, fontSize: 11 },
});
