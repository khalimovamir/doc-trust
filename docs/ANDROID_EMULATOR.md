# Запуск приложения на Android Studio Emulator (Pixel 6)

## Ошибка «Unable to locate a Java Runtime»

Сборка Android требует JDK. Используй один из способов:

**Способ 1 — скрипт (рекомендуется):**
```bash
cd "/Users/amirkhalimov/Cursor/AI Lawyer"
chmod +x scripts/run-android-emulator.sh
./scripts/run-android-emulator.sh
```

**Способ 2 — npm:**
```bash
npm run android:emulator
```

**Способ 3 — вручную задать переменные и запустить:**
```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export REACT_NATIVE_PACKAGER_HOSTNAME=10.0.2.2
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
npx expo run:android
```

## Ошибка «Failed to connect to 192.168.1.7» на эмуляторе

Эмулятор обращается к Metro на **хосте**. Для Android Emulator хост — это `10.0.2.2`, а не IP твоего компьютера в сети.

Перед запуском приложения задай (или используй скрипт выше, там это уже задано):
```bash
export REACT_NATIVE_PACKAGER_HOSTNAME=10.0.2.2
```

Затем:
1. Запусти эмулятор (например Pixel 6) из Android Studio: **Tools → Device Manager → Pixel_6 → Launch**.
2. В папке проекта выполни `./scripts/run-android-emulator.sh` или `npm run android:emulator`.

Metro запустится сам, приложение установится на эмулятор и подключится к бандлеру по 10.0.2.2.

## Запуск только эмулятора Pixel 6

Если нужно просто включить эмулятор:
```bash
$HOME/Library/Android/sdk/emulator/emulator -avd Pixel_6
```

После полной загрузки в другом терминале запусти приложение (скрипт или `npm run android:emulator`).
