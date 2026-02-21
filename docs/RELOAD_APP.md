# Как обновить приложение в симуляторе

Если приложение не обновляется автоматически, попробуйте:

## Вариант 1: Reload в приложении

1. Запустите Metro с очисткой кэша (в терминале):
   ```bash
   npm run start:dev
   ```
   или
   ```bash
   env -u CI npx expo start --clear
   ```

2. Убедитесь, что приложение уже установлено в симуляторе.

3. В симуляторе нажмите **Cmd + D** (или в меню: Device → Shake).

4. В dev‑меню выберите **Reload**.

Приложение загрузит свежий JS‑бандл с Metro.

## Вариант 2: Сборка через Xcode

1. Откройте проект в Xcode:
   ```
   open "/Users/amirkhalimov/Cursor/AI Lawyer/ios/AILawyer.xcworkspace"
   ```

2. Выберите симулятор (например, iPhone 17 Pro).

3. Запустите Metro в отдельном терминале:
   ```bash
   cd "/Users/amirkhalimov/Cursor/AI Lawyer"
   npm run start:dev
   ```

4. В Xcode нажмите **Cmd + R** для сборки и запуска.

## Вариант 3: Переустановка приложения

1. В симуляторе удалите приложение (долгое нажатие → Remove App).

2. Запустите Metro:
   ```bash
   npm run start:dev
   ```

3. Соберите и установите заново:
   ```bash
   npx expo run:ios
   ```

---

**Примечание:** В режиме CI (CI=true) Fast Refresh отключён. Используйте `env -u CI` или `npm run start:dev` для автообновления.
