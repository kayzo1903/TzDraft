import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MiniBoard } from "./MiniBoard";
import { colors } from "../theme/colors";

interface ServiceCardProps {
  title: string;
  subtitle: string;
  onPress: () => void;
  icon?: React.ReactNode;
  iconColor?: string;
  isLocked?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  subtitle,
  onPress,
  icon,
  iconColor = "#3b82f6",
}) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={styles.wrapper}>
      <View style={styles.card}>
        {/* Top accent line */}
        <View style={[styles.accentLine, { backgroundColor: iconColor + "60" }]} />

        {/* LEFT: draughts board */}
        <View style={[styles.boardWrap, { borderColor: iconColor + "40" }]}>
          <MiniBoard size={72} />
          <View style={[styles.boardOverlay, { backgroundColor: iconColor + "20" }]} />
        </View>

        {/* MIDDLE: text */}
        <View style={styles.textSide}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* RIGHT: icon */}
        <View style={[styles.iconWrap, { backgroundColor: iconColor + "18", borderColor: iconColor + "40" }]}>
          {icon}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingLeft: 14,
    paddingRight: 16,
    minHeight: 96,
    position: "relative",
    backgroundColor: colors.surface,
  },
  accentLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  boardWrap: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1.5,
    position: "relative",
  },
  boardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  textSide: {
    flex: 1,
    paddingHorizontal: 14,
  },
  title: {
    color: colors.foreground,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 5,
    letterSpacing: 0.1,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
