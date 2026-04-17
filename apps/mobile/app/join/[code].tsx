/**
 * Deep-link handler for invite joins.
 *
 * Handles: tzdraft-mobile://join/<CODE>
 *
 * Flow:
 *   1. Unauthenticated → redirect to welcome, stash the code so we can resume after login
 *   2. Guest → show register barrier (online play requires an account)
 *   3. Authenticated → auto-join via matchService, navigate to online-game screen
 */
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../../src/auth/auth-store";
import { matchService } from "../../src/lib/match-service";
import { colors } from "../../src/theme/colors";

const PENDING_INVITE_KEY = "pendingInviteCode";

export default function JoinByCodeScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { status, user } = useAuthStore();
  const isGuest = user?.accountType === "GUEST";

  const [statusText, setStatusText] = useState("Joining game…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError("No invite code in link.");
      return;
    }

    // Wait until auth has hydrated before acting
    if (status === "loading") return;

    if (status === "unauthenticated") {
      // Stash the invite code so the auth flow can resume it after login
      AsyncStorage.setItem(PENDING_INVITE_KEY, code.toUpperCase()).catch(() => {});
      router.replace("/welcome");
      return;
    }

    if (isGuest) {
      setError("Online matches require a registered account. Sign up to join.");
      return;
    }

    // Authenticated — auto-join
    const join = async () => {
      try {
        setStatusText(`Joining game ${code}…`);
        const { gameId } = await matchService.joinInviteGame(code.toUpperCase());
        router.replace({
          pathname: "/game/online-game",
          params: { gameId, inviteCode: code.toUpperCase(), isHost: "false" },
        });
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        setError(
          e?.response?.data?.message ??
            "Game not found or already started. Ask your friend for a new code.",
        );
      }
    };

    join();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, code]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card}>
        {error ? (
          <>
            <Text style={styles.errorIcon}>✕</Text>
            <Text style={styles.errorTitle}>Couldn't join</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Text
              style={styles.link}
              onPress={() => router.replace("/game/setup-friend")}
            >
              Go to Play with Friend
            </Text>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.statusText}>{statusText}</Text>
            <Text style={styles.codeLabel}>{code?.toUpperCase()}</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 36,
    alignItems: "center",
    gap: 16,
  },
  statusText: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 12,
  },
  codeLabel: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 6,
  },
  errorIcon: {
    color: colors.danger,
    fontSize: 40,
    fontWeight: "900",
  },
  errorTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  errorBody: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  link: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 8,
    textDecorationLine: "underline",
  },
});
