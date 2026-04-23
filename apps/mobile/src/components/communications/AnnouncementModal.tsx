import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, X } from "lucide-react-native";
import { Vibration } from "react-native";
import { type CommunicationCampaign } from "@tzdraft/shared-client";
import { getCampaignTheme } from "../../lib/communication-center";
import { colors } from "../../theme/colors";

interface AnnouncementModalProps {
  campaign: CommunicationCampaign | null;
  isVisible: boolean;
  onClose: () => void;
  onAction: () => void;
}

export function AnnouncementModal({
  campaign,
  isVisible,
  onClose,
  onAction,
}: AnnouncementModalProps) {
  React.useEffect(() => {
    if (isVisible && campaign) {
      // Temporary fallback to native Vibration until Metro cache is cleared for expo-haptics
      Vibration.vibrate(10); 
    }
  }, [isVisible, campaign]);

  if (!campaign) return null;
  const theme = getCampaignTheme(campaign.type);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={[theme.primary, theme.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.header}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{campaign.mobilePresentation.badge}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.eyebrow}>{campaign.mobilePresentation.eyebrow}</Text>
              <Text style={styles.title}>{campaign.title}</Text>
              <Text style={styles.body}>{campaign.body}</Text>
            </ScrollView>

            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={onAction}
            >
              <Text style={styles.actionText}>{campaign.cta.label}</Text>
              <ArrowRight size={18} color="#0f172a" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  container: {
    width: "100%",
    maxHeight: "70%",
    borderRadius: 24,
    overflow: "hidden",
  },
  gradient: {
    padding: 16,
    borderRadius: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeText: {
    color: colors.foreground,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    marginBottom: 14,
  },
  eyebrow: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
    lineHeight: 24,
  },
  body: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    lineHeight: 18,
  },
  actionButton: {
    backgroundColor: colors.foreground,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  actionText: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
