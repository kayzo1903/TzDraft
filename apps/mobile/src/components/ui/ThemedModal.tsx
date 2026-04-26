import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { X, LucideIcon } from "lucide-react-native";
import { colors } from "../../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface ModalAction {
  label: string;
  onPress: () => void | Promise<void>;
  type?: "primary" | "secondary" | "destructive";
  loading?: boolean;
  icon?: LucideIcon;
}

interface ThemedModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  label?: string; // Small caps text above title
  subtitle?: string;
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  children?: React.ReactNode;
  actions?: ModalAction[];
  dismissable?: boolean;
}

export const ThemedModal: React.FC<ThemedModalProps> = ({
  visible,
  onClose,
  title,
  label,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  children,
  actions = [],
  dismissable = true,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={dismissable ? onClose : undefined}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.container}
            >
              <View style={styles.card}>
                {/* Header Section */}
                <View style={[styles.header, !!Icon && styles.headerWithIcon]}>
                  <View style={styles.headerTitleRow}>
                    {Icon && (
                      <View style={[styles.iconWrap, { backgroundColor: iconBg || colors.surfaceElevated, borderColor: iconColor + "33" || colors.border }]}>
                        <Icon color={iconColor || colors.primary} size={20} />
                      </View>
                    )}
                    <View style={styles.titleBlock}>
                      {label && <Text style={styles.label}>{label.toUpperCase()}</Text>}
                      <Text style={styles.title}>{title}</Text>
                      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                    </View>
                    {dismissable && (
                      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X color={colors.textMuted} size={18} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Content Section */}
                {children && <View style={styles.body}>{children}</View>}

                {/* Actions Section */}
                {actions.length > 0 && (
                  <View style={styles.footer}>
                    {actions.map((action, index) => {
                      const isPrimary = action.type === "primary";
                      const isDestructive = action.type === "destructive";
                      
                      const btnStyle = [
                         styles.btn,
                         isPrimary && styles.btnPrimary,
                         isDestructive && styles.btnDestructive,
                         index > 0 && styles.btnMargin,
                      ];
                      
                      const textStyle = [
                        styles.btnText,
                        isPrimary && styles.btnTextPrimary,
                        isDestructive && styles.btnTextDestructive,
                      ];

                      return (
                        <TouchableOpacity
                          key={action.label}
                          style={btnStyle}
                          onPress={action.onPress}
                          disabled={action.loading}
                        >
                          {action.loading ? (
                            <ActivityIndicator size="small" color={isPrimary ? "#000" : colors.textMuted} />
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              {action.icon && <action.icon color={isPrimary ? "#000" : isDestructive ? "#fff" : colors.textMuted} size={18} />}
                              <Text style={textStyle}>{action.label}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  container: {
    width: "100%",
    alignItems: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    width: Math.min(SCREEN_WIDTH - 48, 400),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerWithIcon: {
    backgroundColor: "rgba(249,115,22,0.05)",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flex: 1,
  },
  label: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1.5,
    opacity: 0.8,
    marginBottom: 2,
  },
  title: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "bold",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  footer: {
    padding: 20,
    paddingTop: 8,
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  btnDestructive: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  btnMargin: {
    // Spacer if needed
  },
  btnText: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "bold",
  },
  btnTextPrimary: {
    color: "#000",
  },
  btnTextDestructive: {
    color: "#fff",
  },
});
