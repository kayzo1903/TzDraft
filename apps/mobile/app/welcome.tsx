import React, { useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { authClient } from "../src/lib/auth-client";
import { useAuthStore } from "../src/auth/auth-store";
import { WelcomeBoard } from "../src/components/WelcomeBoard";
import { LanguageSwitcher } from "../src/components/LanguageSwitcher";

export default function Welcome() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGuestPlay = async () => {
    setIsLoading(true);
    try {
      await authClient.loginAsGuest();
      // Guard in _layout will trigger and allow access to index
      router.replace("/");
    } catch (error) {
      console.error("[Welcome] Guest play failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topRightControls}>
        <LanguageSwitcher />
      </View>
      <View style={styles.container}>
        {/* Top Branding Section */}
        <View style={styles.branding}>
          <Image 
            source={require("../assets/logo.png")} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>
            {t("home.tagline", "Experience the finest draft platform")}
          </Text>
        </View>

        {/* Feature Highlights or Decorative Element */}
        <View style={styles.displayArea}>
           <WelcomeBoard size={240} />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginButtonText}>{t("nav.login", "Login to Your Account")}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.guestButton}
            onPress={handleGuestPlay}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#f59e0b" />
            ) : (
              <Text style={styles.guestButtonText}>{t("nav.play", "Play as a Guest")}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.signupLink}
            onPress={() => router.push("/(auth)/signup")}
          >
            <Text style={styles.signupText}>
              {t("auth.login.newToApp", "New to TzDraft?")}{" "}
              <Text style={styles.signupHighlight}>{t("nav.signup", "Sign Up")}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#030307",
  },
  topRightControls: {
    position: "absolute",
    top: 50,
    right: 16,
    zIndex: 10,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  branding: {
    alignItems: "center",
    marginTop: 40,
  },
  logo: {
    width: 240,
    height: 80,
  },
  tagline: {
    color: "#a3a3a3",
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
    fontWeight: "500",
  },
  displayArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  actions: {
    gap: 12,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: "#f59e0b",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  guestButton: {
    backgroundColor: "transparent",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#262626",
  },
  guestButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  signupLink: {
    alignItems: "center",
    marginTop: 12,
  },
  signupText: {
    color: "#737373",
    fontSize: 14,
  },
  signupHighlight: {
    color: "#f59e0b",
    fontWeight: "bold",
  },
});
