import React, { useEffect, useRef, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MkaguziProvider } from "../src/lib/game/mkaguzi-mobile";
import { I18nextProvider } from "react-i18next";
import i18n from "../src/i18n";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { useAuthInitializer } from "../src/hooks/useAuthInitializer";
import { Header } from "../src/components/Header";
import { SideMenu } from "../src/components/SideMenu";
import { preloadBotImages } from "../src/lib/game/bots";
import { View, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSegments, useRouter, usePathname, useRootNavigationState } from "expo-router";
import { useAuthStore } from "../src/auth/auth-store";
import { LoadingScreen } from "../src/components/ui/LoadingScreen";
import { colors } from "../src/theme/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncPushToken, getNotificationRoute } from "../src/lib/push-notifications";
import { NotificationPermissionModal } from "../src/components/auth/NotificationPermissionModal";
import { QueryProvider } from "../src/providers/QueryProvider";

const PENDING_INVITE_KEY = "pendingInviteCode";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { hasHydrated } = useAuthInitializer();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [loaded, error] = useFonts({
    // Add custom fonts here if needed
  });

  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const rootNavState = useRootNavigationState();
  const { status } = useAuthStore();

  const [showNotifModal, setShowNotifModal] = useState(false);

  const isRedirecting = useRef(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // rootNavState.key is undefined until the navigation container is fully mounted.
    // Navigating before that throws "Attempted to navigate before mounting the Root Layout".
    if (!hasHydrated || !loaded || !rootNavState?.key) return;

    const rootPath = segments[0] || "";
    const inAuthGroup = rootPath === "(auth)";
    const inWelcome = rootPath === "welcome";
    const hasSession = status === "authenticated" || status === "guest";

    console.log(`[Root Guard] Status: ${status}, Path: "${rootPath}"`);

    if (isRedirecting.current) return;

    const performRedirect = (to: string, reason: string) => {
      if (pathname === to) return;
      if (isRedirecting.current) return;

      console.log(`[Root Guard] Gating: ${reason} -> Redirecting to ${to}`);
      isRedirecting.current = true;

      // setTimeout(0) defers past the current commit phase so React Navigation's
      // containerRef finishes wiring before router.replace() calls assertIsReady().
      // rootNavState.key being set ≠ navigationRef.isReady() being true — they
      // are two different internal signals that don't synchronise in the same tick.
      setTimeout(() => {
        router.replace(to as any);
        setTimeout(() => { isRedirecting.current = false; }, 500);
      }, 0);
    };

    if (status === "authenticated") {
      // Registered users with an active session go straight to home — no welcome page.
      // If a deep-link invite was stashed before login, resume it now.
      if (inWelcome || inAuthGroup) {
        AsyncStorage.getItem(PENDING_INVITE_KEY)
          .then((pendingCode) => {
            if (pendingCode) {
              AsyncStorage.removeItem(PENDING_INVITE_KEY).catch(() => {});
              performRedirect(`/join/${pendingCode}`, "resuming stashed invite after login");
            } else {
              performRedirect("/", "authenticated — bypass welcome/auth screens");
            }
          })
          .catch(() => {
            performRedirect("/", "authenticated — bypass welcome/auth screens");
          });
      }
    } else if (status === "guest") {
      // Guest sessions are ephemeral — they always start at the welcome page.
      // No redirects needed; guests can freely navigate welcome, auth, and app screens.
    } else if (status === "unauthenticated") {
      // No session: welcome page is the only valid entry point outside of auth
      if (!inWelcome && !inAuthGroup) {
        performRedirect("/welcome", "no session — show welcome");
      }
    }
  }, [status, hasHydrated, loaded, rootNavState?.key, segments[0]]);

  useEffect(() => {
    preloadBotImages().catch(() => {});
  }, []);

  // Show our themed modal first; only hit the OS dialog if user agrees
  useEffect(() => {
    if (status !== "authenticated") return;
    Notifications.getPermissionsAsync().then(({ status: perm }) => {
      console.log(`[Push] Current status: ${perm}`);
      if (perm === "granted") {
        console.log("[Push] Syncing token...");
        syncPushToken()
          .then(() => console.log("[Push] Token synced successfully"))
          .catch((err) => console.error("[Push] Token sync failed:", err));
      } else if (perm === "undetermined") {
        setShowNotifModal(true);
      }
      // "denied" — respect user choice, don't prompt again
    });
  }, [status]);

  // Handle notification taps (app in background/killed)
  useEffect(() => {
    if (!rootNavState?.key) return;

    // Tapped while app was foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // The in-app UI already gets this via WebSocket; no extra action needed.
      }
    );

    // Tapped from system tray (background / killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | Record<string, any>
          | undefined;
        const route = getNotificationRoute(data);
        if (route) {
          router.push(route as any);
        }
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [rootNavState?.key]);

  useEffect(() => {
    if ((loaded || error) && hasHydrated) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, hasHydrated]);

  const isLoading = (!loaded && !error) || !hasHydrated || status === "loading" || status === "transitioning";
  const rootSegment = segments[0] || "";
  const showHeader = (status === "authenticated" || status === "guest") && rootSegment !== "welcome" && rootSegment !== "(auth)";

  // Always render the Stack so Expo Router's navigator is mounted from the first render.
  // The LoadingScreen sits as an absolute overlay on top until auth is resolved.
  return (
    <QueryProvider>
      <I18nextProvider i18n={i18n}>
        <MkaguziProvider>
          <GestureHandlerRootView style={styles.container}>
            <StatusBar style="light" />
            {showHeader && <Header onMenuPress={() => setIsMenuVisible(true)} />}
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="welcome" options={{ headerShown: false }} />
              <Stack.Screen name="index" options={{ title: "Home" }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="profile" options={{ title: "Profile" }} />
              <Stack.Screen name="notifications" options={{ headerShown: false }} />
              <Stack.Screen name="game/vs-ai" options={{ headerShown: false }} />
              <Stack.Screen name="game/online-game" options={{ headerShown: false }} />
              <Stack.Screen name="game/setup-friend" options={{ headerShown: false }} />
              <Stack.Screen name="game/friend-local" options={{ headerShown: false }} />
              <Stack.Screen name="game/free-play" options={{ headerShown: false }} />
              <Stack.Screen name="game/setup-ai" options={{ headerShown: false }} />
              <Stack.Screen name="game/lobby" options={{ headerShown: false }} />
              <Stack.Screen name="game/history" options={{ headerShown: false }} />
              <Stack.Screen name="game/game-replay" options={{ headerShown: false }} />
              <Stack.Screen name="game/leaderboard" options={{ headerShown: false }} />
              <Stack.Screen name="game/player/[userId]" options={{ headerShown: false }} />
              <Stack.Screen name="game/studies" options={{ headerShown: false }} />
              <Stack.Screen name="game/study-replay" options={{ headerShown: false }} />
              <Stack.Screen name="game/tournaments" options={{ headerShown: false }} />
              <Stack.Screen name="community/announcement/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="join/[code]" options={{ headerShown: false }} />
            </Stack>
            <SideMenu
              isVisible={isMenuVisible}
              onClose={() => setIsMenuVisible(false)}
            />
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <LoadingScreen />
              </View>
            )}
            <NotificationPermissionModal
              visible={showNotifModal}
              onEnable={() => {
                setShowNotifModal(false);
                syncPushToken().catch(() => {});
              }}
              onSkip={() => setShowNotifModal(false)}
            />
          </GestureHandlerRootView>
        </MkaguziProvider>
      </I18nextProvider>
    </QueryProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
});
