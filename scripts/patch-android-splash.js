#!/usr/bin/env node
/**
 * After prebuild: ensure Android native splash shows only background (no icon/placeholder).
 * - Adds transparent splashscreen_logo drawable
 * - Removes windowSplashScreenAnimatedIcon from styles so no green/placeholder appears
 */
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const androidRes = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');

const TRANSPARENT_DRAWABLE = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <size android:width="1dp" android:height="1dp"/>
  <solid android:color="#00000000"/>
</shape>
`;

if (!fs.existsSync(androidRes)) {
  console.warn('patch-android-splash: android res not found, skip');
  process.exit(0);
}

const drawableDir = path.join(androidRes, 'drawable');
fs.mkdirSync(drawableDir, { recursive: true });
fs.writeFileSync(path.join(drawableDir, 'splashscreen_logo.xml'), TRANSPARENT_DRAWABLE);

const stylesPath = path.join(androidRes, 'values', 'styles.xml');
if (fs.existsSync(stylesPath)) {
  let content = fs.readFileSync(stylesPath, 'utf8');
  content = content.replace(/\s*<item name="windowSplashScreenAnimatedIcon">@drawable\/splashscreen_logo<\/item>\n?/g, '');
  content = content.replace(/\s*<item name="android:windowSplashScreenBehavior">[^<]+<\/item>\n?/g, '');
  content = content.replace(/<\/item>    <item/g, '</item>\n    <item');
  fs.writeFileSync(stylesPath, content);
}

console.log('patch-android-splash: applied (transparent logo + styles updated)');
