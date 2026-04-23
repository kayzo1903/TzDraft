import React from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, X } from "lucide-react-native";
import { type CommunicationCampaign } from "@tzdraft/shared-client";
import { getCampaignTheme } from "../../lib/communication-center";
import { colors } from "../../theme/colors";

interface MobileAnnouncementBannerProps {
  campaign: CommunicationCampaign;
  onPress: () => void;
  onDismiss: () => void;
}

export function MobileAnnouncementBanner({
  campaign,
  onPress,
  onDismiss,
}: MobileAnnouncementBannerProps) {
  const theme = getCampaignTheme(campaign.type);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]}
    >
      <LinearGradient
        colors={[theme.primary, theme.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.headerRow}>
          <View style={[styles.badge, { backgroundColor: "rgba(0,0,0,0.18)" }]}>
            <Text style={styles.badgeText}>{campaign.mobilePresentation.badge}</Text>
          </View>
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <X size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <Text style={styles.eyebrow}>{campaign.mobilePresentation.eyebrow}</Text>
        <Text style={styles.title}>{campaign.title}</Text>
        <Text style={styles.body}>{campaign.mobilePresentation.bannerBody}</Text>

        <View style={styles.ctaButton}>
          <Text style={styles.ctaText}>{campaign.cta.label}</Text>
          <ArrowRight size={16} color="#0f172a" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 24,
  },
  pressablePressed: {
    opacity: 0.96,
  },
  gradient: {
    borderRadius: 20,
    padding: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.foreground,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  eyebrow: {
    marginTop: 6,
    color: "rgba(255,255,255,0.7)",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    marginTop: 4,
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "900",
  },
  body: {
    marginTop: 4,
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    lineHeight: 17,
  },
  ctaButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.foreground,
  },
  ctaText: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
