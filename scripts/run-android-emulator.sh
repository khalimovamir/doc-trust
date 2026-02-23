#!/bin/bash
# Запуск приложения на Android Studio Emulator (Pixel 6 или текущем устройстве)
# Требуется: Android Studio, эмулятор Pixel_6 или другой AVD

set -e
export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
# Эмулятор Android достучится до Metro на хосте по 10.0.2.2
export REACT_NATIVE_PACKAGER_HOSTNAME="${REACT_NATIVE_PACKAGER_HOSTNAME:-10.0.2.2}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"

cd "$(dirname "$0")/.."

echo "Checking for connected device/emulator..."
adb devices

echo "Building and running app on Android (Metro will start automatically)..."
npx expo run:android
