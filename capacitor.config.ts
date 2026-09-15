import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.foosballarena.app",
  appName: "Foosball Arena",
  // Capacitor packages whatever is in webDir as the APK's offline bundle,
  // same idea as the original supplied APK described in APK_IMPORT.md.
  webDir: "dist/public",
  server: {
    androidScheme: "https",
  },
};

export default config;
