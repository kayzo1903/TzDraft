import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { LoadingScreen } from "../../src/components/ui/LoadingScreen";
import { ArrowLeft, BookMarked, ChevronRight, MoveRight, Calendar, MoreVertical, X } from "lucide-react-native";
import { colors } from "../../src/theme/colors";
import { studyService, type SavedStudySummary } from "../../src/services/study.service";
import { useAuthStore } from "../../src/auth/auth-store";
import { ThemedModal } from "../../src/components/ui/ThemedModal";
import { LucideIcon, Trash2, Edit3, LogIn } from "lucide-react-native";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Edit modal
// ---------------------------------------------------------------------------
interface EditModalProps {
  visible: boolean;
  study: SavedStudySummary | null;
  onClose: () => void;
  onSave: (id: string, name: string, description: string) => Promise<void>;
}

function EditModal({ visible, study, onClose, onSave }: EditModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (study) {
      setName(study.name);
      setDescription(study.description ?? "");
    }
  }, [study]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSaving(true);
    try {
      await onSave(study!.id, trimmedName, description.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedModal
      visible={visible}
      onClose={onClose}
      label="RESOURCE MANAGEMENT"
      title={t("studies.editTitle", "Edit Study")}
      icon={Edit3}
      actions={[
        { label: t("common.cancel", "Cancel"), onPress: onClose },
        { label: t("common.save", "Save"), onPress: handleSave, type: "primary", loading: saving },
      ]}
    >
      <View style={{ gap: 12 }}>
        <View>
          <Text style={styles.inputLabel}>{t("studies.nameLabel", "Name")}</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder={t("studies.namePlaceholder", "Study name")}
            placeholderTextColor={colors.textDisabled}
            maxLength={120}
            editable={!saving}
          />
        </View>

        <View>
          <Text style={styles.inputLabel}>{t("studies.descLabel", "Description (optional)")}</Text>
          <TextInput
            style={[styles.textInput, styles.textInputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder={t("studies.descPlaceholder", "Add a note about this study…")}
            placeholderTextColor={colors.textDisabled}
            maxLength={500}
            multiline
            numberOfLines={3}
            editable={!saving}
          />
        </View>
      </View>
    </ThemedModal>
  );
}

// ---------------------------------------------------------------------------
// Study card
// ---------------------------------------------------------------------------
interface StudyCardProps {
  study: SavedStudySummary;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function StudyCard({ study, onPress, onEdit, onDelete }: StudyCardProps) {
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

      <TouchableOpacity style={styles.menuBtn} onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Edit3 color={colors.textDisabled} size={18} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuBtn} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Trash2 color="#fff" size={18} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function StudiesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { status } = useAuthStore();
  const isGuest = status === "guest" || status === "unauthenticated";

  const [studies, setStudies] = useState<SavedStudySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [editTarget, setEditTarget] = useState<SavedStudySummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedStudySummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleEdit = async (id: string, name: string, description: string) => {
    const updated = await studyService.updateStudy(id, { name, description: description || undefined });
    setStudies((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await studyService.deleteStudy(deleteTarget.id);
      setStudies((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      Alert.alert(t("common.error", "Error"), t("studies.deleteError", "Could not delete study. Please try again."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <View style={styles.iconBtn}>
            <ArrowLeft color={colors.foreground} size={20} />
          </View>
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={styles.titleBadge}>{t("studies.badge", "FREE PLAY").toUpperCase()}</Text>
          <Text style={styles.title}>{t("studies.title", "My Studies")}</Text>
        </View>
      </View>

      {isGuest ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <LogIn color={colors.textDisabled} size={36} />
          </View>
          <Text style={styles.emptyTitle}>{t("studies.guestTitle", "Sign In to View Studies")}</Text>
          <Text style={styles.emptySubtitle}>
            {t("studies.guestSubtitle", "Create a free account to save and revisit your studies.")}
          </Text>
          <TouchableOpacity style={styles.goPlayBtn} onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.goPlayBtnText}>{t("nav.login", "Sign In")}</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <LoadingScreen />
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
              onEdit={() => setEditTarget(item)}
              onDelete={() => setDeleteTarget(item)}
            />
          )}
        />
      )}

      <EditModal
        visible={editTarget !== null}
        study={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleEdit}
      />

      <ThemedModal
        visible={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        label="DESTRUCTIVE ACTION"
        title={t("studies.deleteTitle", "Delete Study?")}
        subtitle={t("studies.deleteMessage", "\"{{name}}\" will be permanently removed.", { name: deleteTarget?.name })}
        icon={Trash2}
        iconColor={colors.danger}
        iconBg={colors.dangerAlpha20}
        actions={[
          { label: t("common.cancel", "Cancel"), onPress: () => setDeleteTarget(null) },
          { label: t("common.delete", "Delete"), onPress: handleDelete, type: "destructive", loading: isDeleting },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  topBar: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  titleBlock: {
    alignItems: "center",
  },
  titleBadge: { color: colors.primary, fontSize: 9, fontWeight: "bold", letterSpacing: 1.5 },
  title: { color: colors.foreground, fontSize: 15, fontWeight: "bold" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
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
  menuBtn: { padding: 4 },

  // Edit modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  modalTitle: { color: colors.foreground, fontSize: 16, fontWeight: "bold" },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: "center", justifyContent: "center",
  },
  inputLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginBottom: -4 },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.foreground,
    fontSize: 14,
  },
  textInputMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    alignItems: "center",
  },
  modalCancelText: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  modalSaveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
  },
  modalSaveBtnDisabled: { opacity: 0.4 },
  modalSaveText: { color: "#000", fontSize: 14, fontWeight: "bold" },
});
