import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "space-sync",
  slug: config.slug ?? "space-sync",
  ios: { ...config.ios, bundleIdentifier: config.ios?.bundleIdentifier ?? "com.celineemercy.spacesync" },
  android: {
    ...config.android,
    ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
  },
});
