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
  StatusBar,
  Image,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Mail, Lock, Eye, EyeOff, Check } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";
import { authClient } from "../../src/lib/auth-client";
import { GoogleIcon } from "../../src/components/icons/GoogleIcon";

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Glows (Faked) */}
      <View style={styles.glowTop} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            {/* Header / Back */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ChevronLeft size={24} color="#a3a3a3" />
            </TouchableOpacity>

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
                  <Mail size={20} color="#525252" />
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
                  <Lock size={20} color="#525252" />
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
                    <EyeOff size={20} color="#525252" />
                  ) : (
                    <Eye size={20} color="#525252" />
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

                <TouchableOpacity style={styles.forgotPass}>
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

              <TouchableOpacity style={styles.googleBtn}>
                <GoogleIcon size={24} />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020205",
  },
  glowTop: {
    position: "absolute",
    top: -150,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    borderRadius: 150,
    transform: [{ scaleX: 2 }],
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 12,
    paddingTop: Platform.OS === "ios" ? 40 : 20,
  },
  backButton: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#111",
    marginBottom: 32,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  stationLabel: {
    fontSize: 10,
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#a3a3a3",
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
    color: "#f87171",
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
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
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
    color: "#ffffff",
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
    borderColor: "#404040",
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#d97706",
    borderColor: "#d97706",
  },
  rememberMeText: {
    color: "#a3a3a3",
    fontSize: 13,
  },
  forgotPass: {
    alignSelf: "flex-end",
  },
  forgotPassText: {
    color: "#737373",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  loginBtn: {
    backgroundColor: "#d97706",
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
    color: "#ffffff",
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
    backgroundColor: "#1a1a1a",
  },
  dividerText: {
    color: "#525252",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 4,
    marginHorizontal: 16,
  },
  googleBtn: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#262626",
    backgroundColor: "#111",
    borderRadius: 16,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  googleBtnText: {
    color: "#d4d4d4",
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
    color: "#737373",
    fontSize: 14,
  },
  signupLink: {
    color: "#f59e0b",
    fontSize: 14,
    fontWeight: "bold",
  },
});
