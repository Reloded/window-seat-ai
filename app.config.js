export default {
  expo: {
    name: "Window Seat",
    slug: "window-seat",
    version: "1.1.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: false,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#102847",
    },
    ios: {
      bundleIdentifier: "com.stonku.windowseat",
      buildNumber: "4",
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Window Seat uses your location, only on your phone, to work out what you are flying over.",
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "com.stonku.windowseat",
      versionCode: 16,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#102847",
      },
      edgeToEdgeEnabled: true,
      // Only what the app needs: location for the narration and the screen-awake lock.
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "WAKE_LOCK"],
      blockedPermissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.FOREGROUND_SERVICE",
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "./plugins/withReleaseSigning",
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Window Seat uses your location, only on your phone, to work out what you are flying over.",
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "3820c932-9718-4e2f-a1b0-c5ee5561254c",
      },
    },
    owner: "stonku",
    runtimeVersion: "1.1.0",
    updates: {
      url: "https://u.expo.dev/3820c932-9718-4e2f-a1b0-c5ee5561254c",
    },
  },
};
