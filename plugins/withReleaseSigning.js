// Signs release builds with the upload key when WS_KEYSTORE is set (local Gradle builds).
// Without those environment variables (e.g. on EAS, which injects its own credentials) nothing changes.
const { withAppBuildGradle } = require('@expo/config-plugins');

const RELEASE_CONFIG = `
        release {
            if (System.getenv('WS_KEYSTORE')) {
                storeFile file(System.getenv('WS_KEYSTORE'))
                storePassword System.getenv('WS_STORE_PASSWORD')
                keyAlias System.getenv('WS_KEY_ALIAS')
                keyPassword System.getenv('WS_KEY_PASSWORD')
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes("System.getenv('WS_KEYSTORE')")) return cfg;

    // Add a release signing config right after `signingConfigs {`
    src = src.replace(/signingConfigs\s*\{/, (m) => `${m}${RELEASE_CONFIG}`);

    // Use it for the release build type
    src = src.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig System.getenv('WS_KEYSTORE') ? signingConfigs.release : signingConfigs.debug"
    );

    cfg.modResults.contents = src;
    return cfg;
  });
};
