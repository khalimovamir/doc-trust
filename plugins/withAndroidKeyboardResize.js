/**
 * Config plugin: force android:windowSoftInputMode="adjustResize" so the app window
 * resizes and stays above the keyboard (content visible, not covered).
 */
const { withAndroidManifest } = require('@expo/config-plugins');

function withAndroidKeyboardResize(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest?.application?.[0];
    if (!application?.activity) return config;

    for (const activity of application.activity) {
      if (activity.$) {
        activity.$['android:windowSoftInputMode'] = 'adjustResize';
      }
    }
    return config;
  });
}

module.exports = withAndroidKeyboardResize;
