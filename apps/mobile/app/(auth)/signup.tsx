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
import {
  ChevronLeft,
  Smartphone,
  Lock,
  UserCircle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react-native";
import { authClient } from "../../src/lib/auth-client";
import { GoogleIcon } from "../../src/components/icons/GoogleIcon";

type Step = "phone" | "otp" | "details";

export default function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNextStep = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (step === "phone") {
        if (phoneNumber.length >= 10) {
          await authClient.sendOTP(phoneNumber, "signup");
          setStep("otp");
        } else {
          setError(t("auth.errors.invalid_phone", "Please enter a valid phone number"));
        }
      } else if (step === "otp") {
        if (otpCode.length === 6) {
          await authClient.verifyOTP(phoneNumber, otpCode, "signup");
          setStep("details");
        } else {
          setError(t("auth.errors.invalid_otp", "Invalid verification code"));
        }
      } else if (step === "details") {
        if (username && password.length >= 8) {
          await authClient.register({
            phoneNumber,
            username,
            password,
            confirmPassword: password,
          });
          return;
        } else {
          setError(t("auth.errors.invalid_details", "Please complete all fields correctly"));
        }
      }
      setIsLoading(false);
    } catch (err: any) {
      console.error("[Signup] Error:", err);
      const backendMessage = err.response?.data?.message;
      setError(backendMessage || t("auth.errors.unexpected", "An unexpected error occurred"));
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.indicatorContainer}>
      <Text style={styles.indicatorLabel}>
        {t("auth.signup.verificationCircuit", "Verification Circuit")}
      </Text>
      <View style={styles.stepBadge}>
        <Text style={styles.stepText}>
          {t("auth.signup.step", "Step")} {step === "phone" ? "01" : step === "otp" ? "02" : "03"}
        </Text>
      </View>
    </View>
  );

  const OTPInput = () => {
    // Custom split OTP boxes
    const boxes = [0, 1, 2, 3, 4, 5];
    return (
      <View style={styles.otpGrid}>
        {boxes.map((i) => (
          <View key={i} style={[styles.otpBox, otpCode[i] ? styles.otpBoxFilled : null]}>
            <Text style={styles.otpChar}>{otpCode[i] || ""}</Text>
          </View>
        ))}
        {/* Hidden Input for handling typing */}
        <TextInput
          value={otpCode}
          onChangeText={setOtpCode}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.hiddenInput}
          autoFocus
        />
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.glowTop} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            {/* Nav Header */}
            <View style={styles.navHeader}>
              <TouchableOpacity
                onPress={() => step === "phone" ? router.back() : setStep(step === "otp" ? "phone" : "otp")}
                style={styles.backButton}
              >
                <ChevronLeft size={24} color="#a3a3a3" />
              </TouchableOpacity>
              
              <View style={styles.stepIcon}>
                {step === "phone" && <Smartphone size={24} color="#f59e0b" />}
                {step === "otp" && <Lock size={24} color="#f59e0b" />}
                {step === "details" && <UserCircle size={24} color="#f59e0b" />}
              </View>
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

            {/* Form Content */}
            <View style={styles.content}>
              {step === "phone" && (
                <View style={styles.inputCard}>
                  <TextInput
                    placeholder={t("auth.fields.phonePlaceholder", "+255 ...")}
                    placeholderTextColor="#525252"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    style={styles.phoneInput}
                  />
                </View>
              )}

              {step === "otp" && <OTPInput />}

              {step === "details" && (
                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      placeholder={t("auth.fields.username", "Username")}
                      placeholderTextColor="#525252"
                      value={username}
                      onChangeText={setUsername}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <TextInput
                      placeholder={t("auth.fields.password", "Password")}
                      placeholderTextColor="#525252"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      style={styles.input}
                    />
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

              {step === "phone" && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{t("common.or", "OR")}</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity style={styles.googleBtn}>
                    <GoogleIcon size={24} />
                    <Text style={styles.googleBtnText}>Continue with Google</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#030307",
  },
  glowTop: {
    position: "absolute",
    top: -100,
    left: 0,
    right: 0,
    height: 250,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 125,
    transform: [{ scaleX: 2.5 }],
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 12,
    paddingTop: Platform.OS === "ios" ? 40 : 20,
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  backButton: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#111",
  },
  stepIcon: {
    height: 60,
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: "rgba(245, 158, 11, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  indicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  indicatorLabel: {
    fontSize: 10,
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 4,
  },
  stepBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stepText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#f59e0b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
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
  content: {
    gap: 24,
  },
  inputCard: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 64,
    justifyContent: "center",
  },
  phoneInput: {
    color: "#ffffff",
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
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxFilled: {
    borderColor: "#f59e0b",
    backgroundColor: "rgba(245, 158, 11, 0.05)",
  },
  otpChar: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
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
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    justifyContent: "center",
  },
  input: {
    color: "#ffffff",
    fontSize: 16,
  },
  actionBtn: {
    backgroundColor: "#d97706",
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
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 2,
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
  loginLink: {
    color: "#f59e0b",
    fontSize: 14,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
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
});
