// Load environment variables with proper priority (system > .env)
import type { ExpoConfig } from "expo/config";

// Identidad nativa de producción de EYESITE.
// IMPORTANTE: confirmar disponibilidad de este Bundle ID en Apple/Google antes del primer build.
const bundleId = "com.eyesite.app";
const schemeFromBundleId = "eyesite";

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "EYESITE",
  appSlug: "eyesite",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  // EAS Update: permite publicar cambios de JavaScript/estilos/assets
  // sin crear un binario nuevo, mientras sigan siendo compatibles
  // con el runtime nativo instalado.
  runtimeVersion: { policy: "appVersion" },
  updates: {
  enabled: true,
  checkAutomatically: "ON_LOAD",
  fallbackToCacheTimeout: 0,
  url: "https://u.expo.dev/53f27292-7aee-4a95-a597-0f3d062495bd",
},
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-font",
    "expo-image",
    "expo-secure-store",
    "expo-status-bar",
    "expo-web-browser",
    [
      "expo-location",
      {
        locationWhenInUsePermission: "EYESITE usa tu ubicación para mostrar propiedades cercanas y ubicar una propiedad en el mapa."
      }
    ],
    "expo-router",
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
  eas: {
    projectId: "53f27292-7aee-4a95-a597-0f3d062495bd"
  },
},
};

export default config;
