import { ExpoConfig, ConfigContext } from "expo/config";
import { withGradleProperties } from "@expo/config-plugins";

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = process.env.APP_VARIANT || "production";

  const iconPath = variant === "staging" ? "./assets/icon-staging.png" : "./assets/icon.png";

  console.log(`[Config] Building for variant: ${variant} -> Using icon: ${iconPath}`);

  const baseConfig: ExpoConfig = {
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
    slug: "tzdraft",
  };

  return withGradleProperties(baseConfig, (cfg) => {
    const set = (key: string, value: string) => {
      const existing = cfg.modResults.find(
        (item) => item.type === "property" && item.key === key
      );
      if (existing && existing.type === "property") {
        existing.value = value;
      } else {
        cfg.modResults.push({ type: "property", key, value });
      }
    };

    // Single ABI for test APK — biggest size win (~60 MB)
    set("reactNativeArchitectures", "arm64-v8a");
    // R8 minification + resource shrinking
    set("android.enableMinifyInReleaseBuilds", "true");
    set("android.enableShrinkResourcesInReleaseBuilds", "true");
    // Compress native libs in APK
    set("expo.useLegacyPackaging", "true");
    // Disable dev network inspector in production builds
    set("EX_DEV_CLIENT_NETWORK_INSPECTOR", "false");

    return cfg;
  }) as ExpoConfig;
};
