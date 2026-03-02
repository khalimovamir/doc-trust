/**
 * Config plugin: ensure native Android splash shows only background (no icon).
 * Adds a transparent splashscreen_logo drawable so no placeholder/green shape appears.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const TRANSPARENT_DRAWABLE = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <size android:width="1dp" android:height="1dp"/>
  <solid android:color="#00000000"/>
</shape>
`;

function withSplashBackgroundOnly(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest?.projectRoot ?? config.modRequest?.platformProjectRoot ?? process.cwd();
      const drawableDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'drawable');
      if (!fs.existsSync(path.join(projectRoot, 'android'))) return config;
      fs.mkdirSync(drawableDir, { recursive: true });
      const logoPath = path.join(drawableDir, 'splashscreen_logo.xml');
      fs.writeFileSync(logoPath, TRANSPARENT_DRAWABLE);
      return config;
    },
  ]);
}

module.exports = withSplashBackgroundOnly;
