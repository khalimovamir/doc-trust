/**
 * Config plugin: Splash = background #EBF0F9 + splash.png image (centered on Android, full-screen aspect fit on iOS).
 * Runs during prebuild (including EAS Build) for both Android and iOS.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const SPLASH_BG_COLOR = '#EBF0F9';

// #EBF0F9 -> RGB 235, 240, 249 -> 0-1 for storyboard
const SPLASH_BG_R = 235 / 255;
const SPLASH_BG_G = 240 / 255;
const SPLASH_BG_B = 249 / 255;

// --- Android ---
const ANDROID_DRAWABLE = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item>
    <shape android:shape="rectangle">
      <solid android:color="${SPLASH_BG_COLOR}"/>
    </shape>
  </item>
  <item>
    <bitmap android:gravity="center" android:src="@drawable/splash_screen_image"/>
  </item>
</layer-list>
`;

function withAndroidSplash(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest?.projectRoot ?? config.modRequest?.platformProjectRoot ?? process.cwd();
      const androidDir = path.join(projectRoot, 'android');
      if (!fs.existsSync(androidDir)) return config;

      const resDir = path.join(androidDir, 'app', 'src', 'main', 'res');
      const drawableDir = path.join(resDir, 'drawable');
      const drawableNodpi = path.join(resDir, 'drawable-nodpi');
      const valuesDir = path.join(resDir, 'values');
      const splashSource = path.join(projectRoot, 'assets', 'splash.png');

      fs.mkdirSync(drawableDir, { recursive: true });
      fs.mkdirSync(drawableNodpi, { recursive: true });

      if (fs.existsSync(splashSource)) {
        fs.copyFileSync(splashSource, path.join(drawableNodpi, 'splash_screen_image.png'));
      }
      fs.writeFileSync(path.join(drawableDir, 'splash_screen_full.xml'), ANDROID_DRAWABLE);

      const colorsPath = path.join(valuesDir, 'colors.xml');
      if (fs.existsSync(colorsPath)) {
        let c = fs.readFileSync(colorsPath, 'utf8');
        if (!c.includes('name="transparent"')) {
          c = c.replace(/<resources>\s*/, '<resources>\n  <color name="transparent">#00000000</color>\n  ');
        }
        c = c.replace(/<color name="splashscreen_background">[^<]+<\/color>/, `<color name="splashscreen_background">${SPLASH_BG_COLOR}</color>`);
        fs.writeFileSync(colorsPath, c);
      }

      const stylesPath = path.join(valuesDir, 'styles.xml');
      if (fs.existsSync(stylesPath)) {
        let content = fs.readFileSync(stylesPath, 'utf8');
        if (!content.includes('splash_screen_full')) {
          content = content.replace(
            /(<style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">)/,
            `$1\n    <item name="android:windowBackground">@drawable/splash_screen_full</item>`
          );
        }
        content = content.replace(/\s*<item name="windowSplashScreenAnimatedIcon">[^<]+<\/item>\n?/g, '');
        content = content.replace(/\s*<item name="android:windowSplashScreenBehavior">[^<]+<\/item>\n?/g, '');
        content = content.replace(/<item name="windowSplashScreenBackground">@color\/splashscreen_background<\/item>/, '<item name="windowSplashScreenBackground">@color/transparent</item>');
        if (!content.includes('windowSplashScreenBackground')) {
          content = content.replace(
            /(<style name="Theme.App.SplashScreen"[^>]*>)/,
            '$1\n    <item name="windowSplashScreenBackground">@color/transparent</item>'
          );
        }
        content = content.replace(/<\/item>    <item/g, '</item>\n    <item');
        fs.writeFileSync(stylesPath, content);
      }

      return config;
    },
  ]);
}

// --- iOS: update SplashScreen.storyboard — background #EBF0F9 and image view full-screen with scaleAspectFit ---
function withIosSplash(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest?.projectRoot ?? config.modRequest?.platformProjectRoot ?? process.cwd();
      const iosDir = path.join(projectRoot, 'ios');
      if (!fs.existsSync(iosDir)) return config;

      const storyboardPath = path.join(iosDir, 'DocTrust', 'SplashScreen.storyboard');
      if (!fs.existsSync(storyboardPath)) return config;

      let xml = fs.readFileSync(storyboardPath, 'utf8');

      // 1) Background color -> #EBF0F9 (sRGB 0–1)
      xml = xml.replace(
        /<namedColor name="SplashScreenBackground">\s*<color alpha="1\.000" blue="[^"]*" green="[^"]*" red="[^"]*" customColorSpace="sRGB" colorSpace="custom"\/>\s*<\/namedColor>/,
        `<namedColor name="SplashScreenBackground">\n            <color alpha="1.000" red="${SPLASH_BG_R}" green="${SPLASH_BG_G}" blue="${SPLASH_BG_B}" customColorSpace="sRGB" colorSpace="custom"/>\n        </namedColor>`
      );

      // 2) Image view: scaleAspectFit so image fits by height, background visible
      xml = xml.replace(/contentMode="scaleAspectFill"/, 'contentMode="scaleAspectFit"');

      // 3) Constraints: pin image to container (full-screen) so aspect-fit letterboxes with background
      xml = xml.replace(
            /<constraint firstItem="EXPO-SplashScreen" firstAttribute="centerX" secondItem="EXPO-ContainerView" secondAttribute="centerX" id="[^"]*"\/>\s*<constraint firstItem="EXPO-SplashScreen" firstAttribute="centerY" secondItem="EXPO-ContainerView" secondAttribute="centerY" id="[^"]*"\/>/,
            `<constraint firstItem="EXPO-SplashScreen" firstAttribute="leading" secondItem="EXPO-ContainerView" secondAttribute="leading" id="splash-lead"/>
                            <constraint firstItem="EXPO-SplashScreen" firstAttribute="trailing" secondItem="EXPO-ContainerView" secondAttribute="trailing" id="splash-trail"/>
                            <constraint firstItem="EXPO-SplashScreen" firstAttribute="top" secondItem="EXPO-ContainerView" secondAttribute="top" id="splash-top"/>
                            <constraint firstItem="EXPO-SplashScreen" firstAttribute="bottom" secondItem="EXPO-ContainerView" secondAttribute="bottom" id="splash-bottom"/>`
      );

      fs.writeFileSync(storyboardPath, xml);
      return config;
    },
  ]);
}

function withSplashFullScreen(config) {
  config = withAndroidSplash(config);
  config = withIosSplash(config);
  return config;
}

module.exports = withSplashFullScreen;
