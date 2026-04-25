import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../../src/components/LanguageSwitcher";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Smartphone,
  Lock,
  UserCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react-native";
import { authClient } from "../../src/lib/auth-client";
import { GoogleIcon } from "../../src/components/icons/GoogleIcon";
import { colors } from "../../src/theme/colors";

type Step = "phone" | "otp" | "details";

/** Normalise any Tanzanian format to +255XXXXXXXXX for the register endpoint */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\s+/g, "").trim();
  if (digits.startsWith("+255")) return digits;
  if (digits.startsWith("255")) return `+${digits}`;
  if (digits.startsWith("0")) return `+255${digits.slice(1)}`;
  return digits;
}

const PHONE_REGEX = /^(0|255|\+255)?[67]\d{8}$/;

// Defined outside the component so it is never recreated on re-renders,
// keeping the hidden TextInput stable and preventing keyboard dismissal.
function OTPBoxes({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<TextInput>(null);
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => inputRef.current?.focus()}
      style={styles.otpGrid}
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[styles.otpBox, value[i] ? styles.otpBoxFilled : null]}>
          <Text style={styles.otpChar}>{value[i] || ""}</Text>
        </View>
      ))}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.hiddenInput}
        autoFocus
      />
    </TouchableOpacity>
  );
}

export default function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      await authClient.loginWithGoogle();
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (!msg.includes("cancelled") && !msg.includes("dismissed")) {
        setError(t("auth.errors.google_failed", "Google sign-in failed. Please try again."));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const trimmed = phoneNumber.trim();
    if (!PHONE_REGEX.test(trimmed)) {
      setError(t("auth.errors.invalid_phone", "Please enter a valid Tanzanian phone number"));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authClient.sendOTP(trimmed, "signup");
      startCooldown();
      setStep("otp");
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(msg || t("auth.errors.unexpected", "An unexpected error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError(t("auth.errors.invalid_otp", "Please enter the 6-digit code"));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authClient.verifyOTP(phoneNumber.trim(), otpCode, "signup");
      setStep("details");
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(msg || t("auth.signup.errors.otpInvalid", "Invalid OTP code. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || username.length < 3) {
      setError(t("auth.errors.invalid_details", "Username must be at least 3 characters"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.signup.errors.passwordTooShort", "Password must be at least 8 characters"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.signup.errors.passwordMismatch", "Passwords do not match"));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authClient.register({
        phoneNumber: normalizePhone(phoneNumber.trim()),
        username,
        password,
        confirmPassword,
      });
      // Navigation handled by the root auth guard on status change
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(msg || t("auth.errors.unexpected", "An unexpected error occurred"));
      setIsLoading(false);
    }
  };

  const handleNextStep = () => {
    setError(null);
    if (step === "phone") handleSendOtp();
    else if (step === "otp") handleVerifyOtp();
    else handleRegister();
  };

  const handleBack = () => {
    setError(null);
    if (step === "phone") router.back();
    else if (step === "otp") setStep("phone");
    else setStep("otp");
  };

  const renderStepIndicator = () => (
    <View style={styles.indicatorContainer}>
      <Text style={styles.indicatorLabel}>
        {t("auth.signup.verificationCircuit", "Verification Circuit")}
      </Text>
      <View style={styles.stepBadge}>
        <Text style={styles.stepText}>
          {t("auth.signup.step", "Step")}{" "}
          {step === "phone" ? "01" : step === "otp" ? "02" : "03"}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.langWrapper}>
          <LanguageSwitcher />
        </View>
      </View>

      <View style={styles.glowTop} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.stepIcon}>
              {step === "phone" && <Smartphone size={24} color={colors.primary} />}
              {step === "otp" && <Lock size={24} color={colors.primary} />}
              {step === "details" && <UserCircle size={24} color={colors.primary} />}
            </View>

            {renderStepIndicator()}

            <View style={styles.welcomeSection}>
              <Text style={styles.title}>
                {step === "phone"
                  ? t("auth.signup.steps.phone.title", "Join the Academy")
                  : step === "otp"
                  ? t("auth.signup.steps.otp.title", "Identity Check")
                  : t("auth.signup.steps.details.title", "Finalize Profile")}
              </Text>
              <Text style={styles.subtitle}>
                {step === "phone"
                  ? t("auth.signup.steps.phone.subtitle", "Start your journey with your phone number")
                  : step === "otp"
                  ? t("auth.signup.steps.otp.subtitle", "Enter the 6-digit code sent to your device")
                  : t("auth.signup.steps.details.subtitle", "Choose your username and secure password")}
              </Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.content}>
              {step === "phone" && (
                <View style={styles.inputCard}>
                  <TextInput
                    placeholder={t("auth.fields.phonePlaceholder", "07** *** ***")}
                    placeholderTextColor="#525252"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    style={styles.phoneInput}
                  />
                </View>
              )}

              {step === "otp" && (
                <OTPBoxes value={otpCode} onChange={setOtpCode} />
              )}

              {step === "details" && (
                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      placeholder={t("auth.fields.username", "Username")}
                      placeholderTextColor="#525252"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.inputContainerRow}>
                    <TextInput
                      placeholder={t("auth.fields.password", "Password")}
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
                  <View style={styles.inputContainerRow}>
                    <TextInput
                      placeholder={t("auth.resetPassword.confirmPasswordLabel", "Confirm Password")}
                      placeholderTextColor="#525252"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirm}
                      style={styles.input}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirm(!showConfirm)}
                      style={styles.eyeIcon}
                    >
                      {showConfirm ? (
                        <EyeOff size={20} color={colors.textDisabled} />
                      ) : (
                        <Eye size={20} color={colors.textDisabled} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={handleNextStep}
                disabled={isLoading}
                style={[styles.actionBtn, isLoading && styles.btnDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <View style={styles.btnRow}>
                    <Text style={styles.actionBtnText}>
                      {step === "details"
                        ? t("auth.signup.steps.details.button", "Complete")
                        : t("common.continue", "Continue")}
                    </Text>
                    {step !== "details" ? (
                      <ArrowRight size={20} color="white" />
                    ) : (
                      <CheckCircle2 size={20} color="white" />
                    )}
                  </View>
                )}
              </TouchableOpacity>

              {step === "otp" && (
                <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={isLoading || resendCooldown > 0}
                  style={styles.resendBtn}
                >
                  <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
                    {resendCooldown > 0
                      ? t("auth.forgotPassword.steps.otp.resend", "Resend OTP") + ` (${resendCooldown}s)`
                      : t("auth.forgotPassword.steps.otp.resend", "Resend OTP")}
                  </Text>
                </TouchableOpacity>
              )}

              {step === "phone" && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{t("common.or", "OR")}</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={[styles.googleBtn, isGoogleLoading && { opacity: 0.7 }]}
                    onPress={handleGoogleSignup}
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
                </>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {t("auth.signup.haveAccount", "Already have an account?")}{" "}
              </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.loginLink}>
                    {t("auth.signup.loginLink", "Sign In")}
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
    top: -100,
    left: 0,
    right: 0,
    height: 250,
    backgroundColor: colors.primaryAlpha10,
    borderRadius: 125,
    transform: [{ scaleX: 2.5 }],
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
  stepIcon: {
    height: 60,
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: colors.primaryAlpha05,
    borderWidth: 1,
    borderColor: colors.primaryAlpha15,
    marginBottom: 24,
  },
  indicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  indicatorLabel: {
    fontSize: 10,
    color: colors.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 4,
  },
  stepBadge: {
    backgroundColor: colors.primaryAlpha10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stepText: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
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
  content: {
    gap: 16,
  },
  inputCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 64,
    justifyContent: "center",
  },
  phoneInput: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "600",
  },
  otpGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
  },
  otpBox: {
    width: 48,
    height: 60,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha05,
  },
  otpChar: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.foreground,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: "100%",
    height: "100%",
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    justifyContent: "center",
  },
  inputContainerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingLeft: 16,
    height: 60,
  },
  input: {
    flex: 1,
    color: colors.foreground,
    fontSize: 16,
  },
  eyeIcon: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtnText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  resendBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  resendText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  resendTextDisabled: {
    color: colors.textDisabled,
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
  loginLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
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
});
