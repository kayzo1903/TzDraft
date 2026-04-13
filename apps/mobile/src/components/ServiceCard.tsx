import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ArrowRight } from "lucide-react-native";

interface ServiceCardProps {
  title: string;
  subtitle: string;
  onPress: () => void;
  icon?: React.ReactNode;
  isLocked?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  subtitle,
  onPress,
  icon,
  isLocked,
}) => {
  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.actionContainer}>
        <ArrowRight size={20} color={isLocked ? "#525252" : "#f59e0b"} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    color: "#a3a3a3",
    fontSize: 13,
  },
  actionContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
});
