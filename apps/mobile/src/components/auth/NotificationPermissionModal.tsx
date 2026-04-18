import React from "react";
import { Text, StyleSheet } from "react-native";
import { Bell } from "lucide-react-native";
import { ThemedModal } from "../ui/ThemedModal";
import { colors } from "../../theme/colors";

interface NotificationPermissionModalProps {
  visible: boolean;
  onEnable: () => void;
  onSkip: () => void;
}

export const NotificationPermissionModal: React.FC<
  NotificationPermissionModalProps
> = ({ visible, onEnable, onSkip }) => {
  return (
    <ThemedModal
      visible={visible}
      onClose={onSkip}
      dismissable={false}
      label="Stay in the Game"
      title="Enable Notifications"
      subtitle="Get alerts for match invites, tournament updates, and your turn reminders."
      icon={Bell}
      iconBg={colors.primaryAlpha10}
      iconColor={colors.primary}
      actions={[
        {
          label: "Enable Notifications",
          onPress: onEnable,
          type: "primary",
        },
        {
          label: "Not Now",
          onPress: onSkip,
          type: "secondary",
        },
      ]}
    >
      <Text style={styles.bullet}>• Tournament match assignments</Text>
      <Text style={styles.bullet}>• Online game — opponent moves</Text>
      <Text style={styles.bullet}>• Round results and standings</Text>
    </ThemedModal>
  );
};

const styles = StyleSheet.create({
  bullet: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 22,
  },
});
