import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = process.env.APP_VARIANT || "production";
  
  // Decide which icon to use
  const iconPath = variant === "staging" ? "./assets/icon-staging.png" : "./assets/icon.png";
  
  console.log(`[Config] Building for variant: ${variant} -> Using icon: ${iconPath}`);

  return {
    ...config,
    name: variant === "staging" ? "TzDraft (Staging)" : "TzDraft",
    icon: iconPath,
    android: {
      ...config.android,
      adaptiveIcon: {
        ...config.android?.adaptiveIcon,
        foregroundImage: iconPath,
      },
    },
    // Ensure the slug remains consistent across variants for EAS
    slug: "tzdraft",
  } as ExpoConfig;
};
