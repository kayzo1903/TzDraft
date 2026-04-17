import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../i18n";
import { colors } from "../theme/colors";

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLng = i18n.language;

  const toggleLanguage = () => {
    const nextLng = currentLng === "en" ? "sw" : "en";
    changeLanguage(nextLng);
  };

  return (
    <TouchableOpacity
      onPress={toggleLanguage}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.pill}>
        <Text style={[styles.text, currentLng === "en" && styles.activeText]}>🇬🇧</Text>
        <View style={styles.divider} />
        <Text style={[styles.text, currentLng === "sw" && styles.activeText]}>🇹🇿</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 8,
  },
  pill: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 6,
  },
  text: {
    color: colors.textDisabled,
    fontSize: 12,
    fontWeight: "900",
  },
  activeText: {
    color: colors.primary,
  },
  divider: {
    width: 1,
    height: 10,
    backgroundColor: colors.border,
  },
});
