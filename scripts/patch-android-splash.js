#!/usr/bin/env node
/**
 * After prebuild: Android splash = background #EBF0F9 + splash.png centered (by height).
 * Same logic as withAndroidSplashFullScreen plugin; run this when building locally without prebuild.
 */
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const androidRes = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
const splashSource = path.join(projectRoot, 'assets', 'splash.png');
const SPLASH_BG_COLOR = '#EBF0F9';

const SPLASH_FULL_DRAWABLE = `<?xml version="1.0" encoding="utf-8"?>
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

if (!fs.existsSync(androidRes)) {
  console.warn('patch-android-splash: android res not found, skip');
  process.exit(0);
}

const drawableDir = path.join(androidRes, 'drawable');
const drawableNodpi = path.join(androidRes, 'drawable-nodpi');
const valuesDir = path.join(androidRes, 'values');
fs.mkdirSync(drawableDir, { recursive: true });
fs.mkdirSync(drawableNodpi, { recursive: true });

if (fs.existsSync(splashSource)) {
  fs.copyFileSync(splashSource, path.join(drawableNodpi, 'splash_screen_image.png'));
}
fs.writeFileSync(path.join(drawableDir, 'splash_screen_full.xml'), SPLASH_FULL_DRAWABLE);

const colorsPath = path.join(valuesDir, 'colors.xml');
if (fs.existsSync(colorsPath)) {
  let c = fs.readFileSync(colorsPath, 'utf8');
  if (!c.includes('name="transparent"')) {
    c = c.replace(/<resources>\s*/, '<resources>\n  <color name="transparent">#00000000</color>\n  ');
  }
  c = c.replace(/<color name="splashscreen_background">[^<]+<\/color>/, `<color name="splashscreen_background">${SPLASH_BG_COLOR}</color>`);
  fs.writeFileSync(colorsPath, c);
}

const stylesPath = path.join(androidRes, 'values', 'styles.xml');
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

console.log('patch-android-splash: applied (background #EBF0F9 + centered splash image)');
