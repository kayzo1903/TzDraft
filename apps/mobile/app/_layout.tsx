import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { I18nextProvider } from "react-i18next";
import i18n from "../src/i18n";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useAuthInitializer } from "../src/hooks/useAuthInitializer";
import { Header } from "../src/components/Header";
import { SideMenu } from "../src/components/SideMenu";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useSegments, useRouter, usePathname } from "expo-router";
import { useAuthStore } from "../src/auth/auth-store";
import { LoadingScreen } from "../src/components/ui/LoadingScreen";

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
  const { status, user } = useAuthStore();

  const [isMounted, setIsMounted] = useState(false);
  const isRedirecting = React.useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated || !loaded || !isMounted) return;

    const rootPath = segments[0] || "";
    const inAuthGroup = rootPath === "(auth)";
    const inWelcome = rootPath === "welcome";

    console.log(`[Root Guard] Status: ${status}, Path: "${rootPath}"`);

    // Logic Lock: Prevent recursive loops
    if (isRedirecting.current) return;

    const performRedirect = (to: string, reason: string) => {
      if (pathname === to) return;
      if (isRedirecting.current) return;

      console.log(`[Root Guard] Gating: ${reason} -> Redirecting to ${to}`);
      isRedirecting.current = true;
      
      // Since we have a Loading Gate, we can be more immediate with navigation
      router.replace(to as any);
      setTimeout(() => { isRedirecting.current = false; }, 500);
    };

    if (status === "unauthenticated") {
      if (!inWelcome && !inAuthGroup) {
        performRedirect("/welcome", "unauthenticated session");
      }
    } else if (status === "authenticated") {
      if (inWelcome || inAuthGroup) {
        performRedirect("/", "authenticated user on auth/welcome screen");
      }
    } else if (status === "guest") {
      if (inWelcome) {
        performRedirect("/", "guest on welcome screen");
      }
    }
  }, [status, hasHydrated, loaded, isMounted, JSON.stringify(segments)]);

  useEffect(() => {
    if ((loaded || error) && hasHydrated) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, hasHydrated]);

  if ((!loaded && !error) || !hasHydrated || status === "loading" || status === "transitioning") {
    // This is the "Loading Gate"
    return <LoadingScreen />;
  }

  const rootSegment = segments[0] || "";
  const showHeader = (status === "authenticated" || status === "guest") && rootSegment !== "welcome" && rootSegment !== "(auth)";

  return (
    <I18nextProvider i18n={i18n}>
      <View style={styles.container}>
        {showHeader && <Header onMenuPress={() => setIsMenuVisible(true)} />}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0a0a0a" },
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
      </View>
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  gate: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020205",
  },
});
