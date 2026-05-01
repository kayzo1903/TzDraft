import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Smartphone, KeyRound, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "../../src/lib/auth-client";
import { LanguageSwitcher } from "../../src/components/LanguageSwitcher";
import { colors } from "../../src/theme/colors";

type Step = "phone" | "otp" | "reset" | "success";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\s+/g, "").trim();
  if (digits.startsWith("+255")) return digits;
  if (digits.startsWith("255")) return `+${digits}`;
  if (digits.startsWith("0")) return `+255${digits.slice(1)}`;
  return `+255${digits}`;
}

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setResendCooldown(180);
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
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    const trimmed = phoneNumber.trim();
    if (!trimmed) {
      setError(t("auth.forgotPassword.errors.phoneRequired", "Phone number is required"));
      return;
    }
    if (!/^(0|255|\+255)?[67]\d{8}$/.test(trimmed)) {
      setError(t("auth.forgotPassword.errors.phoneInvalid", "Please enter a valid phone number"));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authClient.sendOTP(trimmed, "password_reset");
      startCooldown();
      setStep("otp");
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(msg || t("auth.forgotPassword.errors.serverError", "Something went wrong. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setError(t("auth.forgotPassword.errors.otpRequired", "OTP code is required"));
      return;
    }
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError(t("auth.forgotPassword.errors.otpInvalid", "Invalid OTP code"));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authClient.verifyOTP(phoneNumber.trim(), otpCode.trim(), "password_reset");
      setStep("reset");
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(msg || t("auth.forgotPassword.errors.otpInvalid", "Invalid OTP code"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      setError(t("auth.resetPassword.errors.passwordRequired", "Password is required"));
      return;
    }
    if (newPassword.length < 8) {
      setError(t("auth.resetPassword.errors.passwordTooShort", "Password must be at least 8 characters"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.resetPassword.errors.passwordMismatch", "Passwords do not match"));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authClient.resetPasswordPhone(phoneNumber.trim(), otpCode.trim(), newPassword);
      setStep("success");
      setTimeout(() => router.replace("/(auth)/login"), 2500);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(msg || t("auth.resetPassword.errors.serverError", "Failed to reset password. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "otp") { setStep("phone"); setError(null); }
    else if (step === "reset") { setStep("otp"); setError(null); }
    else router.back();
  };

  const renderStepIndicator = () => {
    const steps: Step[] = ["phone", "otp", "reset"];
    const current = steps.indexOf(step === "success" ? "reset" : step);
    return (
      <View style={styles.stepRow}>
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <View style={[styles.stepDot, i <= current && styles.stepDotActive]} />
            {i < steps.length - 1 && (
              <View style={[styles.stepLine, i < current && styles.stepLineActive]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  if (step === "success") {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.successContainer}>
          <CheckCircle2 size={72} color={colors.success} />
          <Text style={styles.successTitle}>
            {t("auth.resetPassword.successTitle", "Password Reset Successful")}
          </Text>
          <Text style={styles.successMessage}>
            {t("auth.resetPassword.successMessage", "Your password has been reset. Redirecting to login...")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>

            {renderStepIndicator()}

            <View style={styles.welcomeSection}>
              <Text style={styles.stationLabel}>
                {t("auth.forgotPassword.title", "Forgot Password?")}
              </Text>
              <Text style={styles.title}>
                {step === "phone" && t("auth.forgotPassword.steps.phone.title", "Enter Your Phone Number")}
                {step === "otp" && t("auth.forgotPassword.steps.otp.title", "Verify OTP")}
                {step === "reset" && t("auth.resetPassword.title", "Reset Password")}
              </Text>
              <Text style={styles.subtitle}>
                {step === "phone" && t("auth.forgotPassword.steps.phone.subtitle", "We'll send you a verification code")}
                {step === "otp" && t("auth.forgotPassword.steps.otp.subtitle", "Code sent to {phone}", { phone: normalizePhone(phoneNumber.trim()) })}
                {step === "reset" && t("auth.resetPassword.subtitle", "Enter your new password")}
              </Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.form}>
              {step === "phone" && (
                <>
                  <View style={styles.inputContainer}>
                    <View style={styles.inputIcon}>
                      <Smartphone size={20} color={colors.textDisabled} />
                    </View>
                    <TextInput
                      placeholder={t("fields.phonePlaceholder", "07** *** ***")}
                      placeholderTextColor="#525252"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      style={styles.input}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleSendOtp}
                    disabled={isLoading}
                    style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        {t("auth.forgotPassword.steps.phone.button", "Send OTP")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {step === "otp" && (
                <>
                  <View style={styles.inputContainer}>
                    <View style={styles.inputIcon}>
                      <KeyRound size={20} color={colors.textDisabled} />
                    </View>
                    <TextInput
                      placeholder="000000"
                      placeholderTextColor="#525252"
                      value={otpCode}
                      onChangeText={setOtpCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={[styles.input, styles.otpInput]}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleVerifyOtp}
                    disabled={isLoading}
                    style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        {t("auth.forgotPassword.steps.otp.button", "Verify & Continue")}
                      </Text>
                    )}
                  </TouchableOpacity>
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
                </>
              )}

              {step === "reset" && (
                <>
                  <View style={styles.inputContainer}>
                    <View style={styles.inputIcon}>
                      <Lock size={20} color={colors.textDisabled} />
                    </View>
                    <TextInput
                      placeholder={t("auth.resetPassword.newPasswordLabel", "New Password")}
                      placeholderTextColor="#525252"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                      style={styles.input}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      {showPassword ? (
                        <EyeOff size={20} color={colors.textDisabled} />
                      ) : (
                        <Eye size={20} color={colors.textDisabled} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputContainer}>
                    <View style={styles.inputIcon}>
                      <Lock size={20} color={colors.textDisabled} />
                    </View>
                    <TextInput
                      placeholder={t("auth.resetPassword.confirmPasswordLabel", "Confirm Password")}
                      placeholderTextColor="#525252"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirm}
                      style={styles.input}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeIcon}>
                      {showConfirm ? (
                        <EyeOff size={20} color={colors.textDisabled} />
                      ) : (
                        <Eye size={20} color={colors.textDisabled} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={handleResetPassword}
                    disabled={isLoading}
                    style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        {t("auth.resetPassword.submitButton", "Reset Password")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
                <Text style={styles.backToLoginText}>
                  {t("auth.forgotPassword.backToLogin", "Back to Login")}
                </Text>
              </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 12,
    paddingTop: 10,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 6,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
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
    fontSize: 32,
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
  otpInput: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 8,
  },
  eyeIcon: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
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
  primaryBtnText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  resendBtn: {
    alignItems: "center",
    paddingVertical: 12,
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
    alignItems: "center",
    marginTop: "auto",
    paddingTop: 32,
    paddingBottom: 24,
  },
  backToLoginText: {
    color: colors.textSubtle,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.foreground,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 24,
  },
});
