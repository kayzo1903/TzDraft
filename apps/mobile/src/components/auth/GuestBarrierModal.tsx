import React from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { ThemedModal } from "../ui/ThemedModal";
import { colors } from "../../theme/colors";

interface GuestBarrierModalProps {
  visible: boolean;
  onClose: () => void;
  onContinueAsGuest?: () => void;
  title?: string;
  subtitle?: string;
}

export const GuestBarrierModal: React.FC<GuestBarrierModalProps> = ({
  visible,
  onClose,
  onContinueAsGuest,
  title,
  subtitle,
}) => {
  const { t } = useTranslation();
  const router = useRouter();

  const handleSignup = () => {
    onClose();
    router.push("/(auth)/signup");
  };

  const handleContinue = () => {
    onClose();
    if (onContinueAsGuest) {
      onContinueAsGuest();
    }
  };

  return (
    <ThemedModal
      visible={visible}
      onClose={onClose}
      label={t("auth.guestPopup.label", "Registration Required")}
      title={title || t("auth.guestPopup.title", "Create your account")}
      subtitle={subtitle || t("auth.guestPopup.subtitle", "Join the community to track your ratings, review game history, and compete in official tournaments!")}
      icon={UserPlus}
      iconBg={colors.primaryAlpha10}
      iconColor={colors.primary}
      actions={[
        {
          label: t("auth.guestPopup.primaryAction", "Create Free Account"),
          onPress: handleSignup,
          type: "primary",
        },
        {
          label: t("auth.guestPopup.secondaryAction", "Continue as Guest"),
          onPress: handleContinue,
          type: "secondary",
        },
      ]}
    />
  );
};
