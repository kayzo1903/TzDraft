import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Link, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Mail, Lock, Eye, EyeOff, Check } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";
import { authClient } from "../../src/lib/auth-client";
import { GoogleIcon } from "../../src/components/icons/GoogleIcon";
import { colors } from "../../src/theme/colors";
import { LanguageSwitcher } from "../../src/components/LanguageSwitcher";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load remembered identifier on mount
  React.useEffect(() => {
    const loadSavedIdentifier = async () => {
      try {
        const saved = await SecureStore.getItemAsync("remembered_identifier");
        if (saved) {
          setIdentifier(saved);
          setRememberMe(true);
        }
      } catch (err) {
        console.error("[Login] Failed to load saved identifier:", err);
      }
    };
    loadSavedIdentifier();
  }, []);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      await authClient.loginWithGoogle();
      // Navigation handled by the root guard on status change.
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (!msg.includes("cancelled") && !msg.includes("dismissed")) {
        setError(t("auth.errors.google_failed", "Google sign-in failed. Please try again."));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError(t("auth.errors.missing_fields", "Please fill in all fields"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authClient.login({ identifier, password });

      // Handle "Remember Me" persistence
      if (rememberMe) {
        await SecureStore.setItemAsync("remembered_identifier", identifier);
      } else {
        await SecureStore.deleteItemAsync("remembered_identifier");
      }
    } catch (err: any) {
      console.error("[Login] Error:", err);
      const backendMessage = err.response?.data?.message;
      setError(
        backendMessage || t("auth.errors.invalid_credentials", "Invalid email or password")
      );
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      
      {/* Absolute Header elements (Symmetric with Welcome page) */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.langWrapper}>
          <LanguageSwitcher />
        </View>
      </View>

      {/* Background Glows (Faked) */}
      <View style={styles.glowTop} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>

            <View style={styles.welcomeSection}>
              <Text style={styles.stationLabel}>
                {t("auth.login.base", "Base Station")}
              </Text>
              <Text style={styles.title}>
                {t("auth.login.title", "Welcome Back")}
              </Text>
              <Text style={styles.subtitle}>
                {t("auth.login.subtitle", "Enter your credentials to continue your journey")}
              </Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Input Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Mail size={20} color={colors.textDisabled} />
                </View>
                <TextInput
                  placeholder={t("auth.login.identifierPlaceholder", "Email or Username")}
                  placeholderTextColor="#525252"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Lock size={20} color={colors.textDisabled} />
                </View>
                <TextInput
                  placeholder={t("fields.password", "Password")}
                  placeholderTextColor="#525252"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textDisabled} />
                  ) : (
                    <Eye size={20} color={colors.textDisabled} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.authOptionsRow}>
                <TouchableOpacity 
                  style={styles.rememberMeContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Check size={12} color="white" />}
                  </View>
                  <Text style={styles.rememberMeText}>{t("auth.login.rememberMe", "Remember Me")}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.forgotPass} onPress={() => router.push("/(auth)/forgot-password")}>
                  <Text style={styles.forgotPassText}>
                    {t("auth.login.forgotPassword", "Forgot Password?")}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                style={[styles.loginBtn, isLoading && styles.btnDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.loginBtnText}>
                    {t("auth.login.button", "Sign In")}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t("common.or", "OR")}</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.googleBtn, isGoogleLoading && styles.btnDisabled]}
                onPress={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator color={colors.textSecondary} />
                ) : (
                  <>
                    <GoogleIcon size={24} />
                    <Text style={styles.googleBtnText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {t("auth.login.noAccount", "Don't have an account?")}{" "}
              </Text>
              <Link href="/(auth)/signup" asChild>
                <TouchableOpacity>
                  <Text style={styles.signupLink}>
                    {t("auth.login.signupLink", "Sign Up")}
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glowTop: {
    position: "absolute",
    top: -150,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: colors.primaryAlpha15,
    borderRadius: 150,
    transform: [{ scaleX: 2 }],
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 12,
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 20,
    zIndex: 10,
  },
  langWrapper: {
    marginTop: 0,
  },
  backButton: {
    height: 48,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  stationLabel: {
    fontSize: 10,
    color: colors.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: "center",
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    height: 60,
  },
  inputIcon: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    color: colors.foreground,
    fontSize: 16,
  },
  eyeIcon: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  authOptionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.textDisabled,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rememberMeText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  forgotPass: {
    alignSelf: "flex-end",
  },
  forgotPassText: {
    color: colors.textSubtle,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textDisabled,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 4,
    marginHorizontal: 16,
  },
  googleBtn: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    borderRadius: 16,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  googleBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: "auto",
    paddingTop: 32,
    paddingBottom: 24,
  },
  footerText: {
    color: colors.textSubtle,
    fontSize: 14,
  },
  signupLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "bold",
  },
});
