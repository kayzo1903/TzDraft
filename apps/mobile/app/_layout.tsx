import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { I18nextProvider } from "react-i18next";
import i18n from "../src/i18n";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useAuthInitializer } from "../src/hooks/useAuthInitializer";
import { Header } from "../src/components/Header";
import { SideMenu } from "../src/components/SideMenu";
import { View, StyleSheet } from "react-native";
import { useSegments, useRouter, usePathname, useRootNavigationState } from "expo-router";
import { useAuthStore } from "../src/auth/auth-store";
import { LoadingScreen } from "../src/components/ui/LoadingScreen";
import { colors } from "../src/theme/colors";

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

  const isRedirecting = React.useRef(false);

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
      if (inWelcome || inAuthGroup) {
        performRedirect("/", "authenticated — bypass welcome/auth screens");
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
    <I18nextProvider i18n={i18n}>
      <View style={styles.container}>
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
      </View>
    </I18nextProvider>
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
