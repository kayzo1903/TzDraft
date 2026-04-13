import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Linking,
  Platform
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";
import { 
  ArrowLeft, 
  HelpCircle, 
  MessageSquare, 
  Mail, 
  ExternalLink,
  ShieldCheck,
  FileText,
  ChevronRight,
  LifeBuoy
} from "lucide-react-native";
import { SUPPORT_URLS } from "../src/lib/urls";

export default function SupportScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const openWebPage = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        toolbarColor: "#030307",
      });
    } catch (error) {
      console.error("Failed to open browser:", error);
      // Fallback to system browser
      Linking.openURL(url);
    }
  };

  const SupportItem = ({ icon: Icon, title, onPress, subtitle }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemLeft}>
        <View style={styles.iconBox}>
          <Icon color="#f59e0b" size={20} />
        </View>
        <View>
          <Text style={styles.itemText}>{title}</Text>
          {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <ChevronRight color="#404040" size={18} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("support.title", "Help & Support")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
           <View style={styles.heroIconBox}>
              <LifeBuoy color="#f59e0b" size={40} />
           </View>
           <Text style={styles.heroTitle}>{t("support.heroTitle", "How can we help?")}</Text>
           <Text style={styles.heroSubtitle}>
              {t("support.heroSubtitle", "Access our documentation, rules, and support team directly.")}
           </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("support.contact", "Direct Help")}</Text>
          <SupportItem 
            icon={HelpCircle} 
            title={t("support.faqsTitle", "Frequently Asked Questions")} 
            subtitle={t("support.faqsDesc", "Find answers to common questions about gameplay and accounts.")}
            onPress={() => openWebPage(SUPPORT_URLS.faq)} 
          />
          <SupportItem 
            icon={Mail} 
            title={t("support.emailUs", "Email Support Team")} 
            subtitle="support@tzdraft.co.tz"
            onPress={async () => {
              const url = "mailto:support@tzdraft.co.tz";
              const canOpen = await Linking.canOpenURL(url);
              if (canOpen) {
                Linking.openURL(url);
              } else {
                console.error("Cannot open mail app");
              }
            }} 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("support.legal", "Legal & Rules")}</Text>
          <SupportItem 
            icon={FileText} 
            title={t("support.rules", "Game Rules")} 
            subtitle={t("support.rulesDesc", "Official TZD draughts standards and tournament rules.")}
            onPress={() => openWebPage(SUPPORT_URLS.rules)} 
          />
          <SupportItem 
            icon={ShieldCheck} 
            title={t("support.privacy", "Privacy & Terms")} 
            subtitle={t("support.privacyDesc", "How we protect your data and platform guidelines.")}
            onPress={() => openWebPage(SUPPORT_URLS.privacy)} 
          />
          <SupportItem 
            icon={ExternalLink} 
            title={t("support.website", "Visit Official Website")} 
            subtitle="www.tzdraft.co.tz"
            onPress={() => openWebPage(SUPPORT_URLS.website)} 
          />
        </View>

        <View style={styles.footer}>
           <Text style={styles.versionText}>TzDraft Mobile v1.0.0 (Stable)</Text>
           <Text style={styles.copyrightText}>© 2026 TzDraft. All rights reserved.</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030307",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 20,
  },
  heroSection: {
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  heroIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  heroSubtitle: {
    color: "#737373",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
    gap: 12,
  },
  sectionLabel: {
    color: "#525252",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
    marginRight: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  itemText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  itemSubtitle: {
    color: "#525252",
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
    gap: 4,
  },
  versionText: {
    color: "#404040",
    fontSize: 12,
    fontWeight: "bold",
  },
  copyrightText: {
    color: "#262626",
    fontSize: 11,
  },
});
