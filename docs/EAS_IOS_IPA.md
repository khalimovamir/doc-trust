# Получение IPA для iOS (EAS Build)

## Какие данные нужны для IPA

Чтобы собрать и получить **IPA** (установочный пакет для iOS), нужны:

### 1. Apple Developer аккаунт (обязательно)

- **Apple Developer Program** — платная подписка (~$99/год).
- Без неё подписывать приложение для реальных устройств и App Store нельзя.
- Регистрация: [developer.apple.com](https://developer.apple.com/programs/enroll/).

### 2. Данные приложения (уже есть в проекте)

- **Bundle Identifier** — в `app.json` уже указан: `com.anonymous.ai-lawyer`.  
  Для публикации в App Store лучше заменить на свой (например `com.webnum.doctrust`).
- **Версия** — в `app.json`: `version: "1.0.0"`.
- **Поддержка Sign in with Apple** — в `app.json` уже включена (`usesAppleSignIn: true`).

### 3. Учётная запись Expo (EAS)

- Проект привязан к EAS (в `app.json`: `projectId`, `owner: "webnum.com"`).
- Войти в тот же аккаунт: `npx eas-cli login`.

### 4. Сертификаты и профили (EAS сделает сам)

Для сборки IPA EAS нужны:

- **Distribution Certificate** (сертификат распространения).
- **Provisioning Profile** (профиль для твоего Bundle ID).

По умолчанию EAS предлагает **автоматически** создать и хранить их в Expo (рекомендуется).  
Либо можно загрузить свои, если они уже есть в Apple Developer.

---

## Как правильно получить IPA файл

### Шаг 1: Убедиться, что EAS и проект настроены

```bash
cd "/Users/amirkhalimov/Cursor/AI Lawyer"
npx eas-cli whoami
```

Если не залогинен — выполни `npx eas-cli login` и выбери аккаунт (например **webnum.com**).

### Шаг 2: Запустить сборку iOS (production)

```bash
npx eas-cli build --platform ios --profile production
```

- Выбери **Build for iOS**.
- EAS спросит про учётные данные Apple:
  - **Apple ID** — email от Apple Developer аккаунта.
  - **Password** — пароль или **App-Specific Password** (если включена 2FA).
  - Обычно выбирают **Let EAS manage your credentials** — тогда сертификаты и профили создаются автоматически.

### Шаг 3: Дождаться сборки

- Сборка идёт в облаке Expo (не на твоём Mac).
- В терминале появится ссылка на страницу билда, например:  
  `https://expo.dev/accounts/webnum.com/projects/ai-lawyer/builds/...`

### Шаг 4: Скачать IPA

1. Открой [expo.dev](https://expo.dev) → свой аккаунт → проект **Doc Trust** / **ai-lawyer**.
2. Вкладка **Builds** → найди последнюю сборку **iOS** со статусом **Finished**.
3. Нажми **Download** — скачается файл **.ipa**.

Это и есть нужный IPA: его можно ставить на устройства (через Apple Configurator, TestFlight, Ad Hoc) или загружать в App Store Connect для публикации.

---

## Если сборка падает с ошибкой Apple

- **«Internal server error» / ошибки App Store Connect** — часто со стороны Apple. Подожди и запусти сборку снова через некоторое время.
- **Invalid credentials** — проверь Apple ID и пароль; при 2FA используй [App-Specific Password](https://appleid.apple.com/account/manage).
- **Bundle ID уже занят** — в Apple Developer должен быть заведён App с таким же Bundle ID, как в `app.json` (`com.anonymous.ai-lawyer` или твой).

---

## Переменные окружения (Supabase и др.)

Как и для Android, для iOS билда нужны те же переменные (Supabase, Sentry и т.д.). Их задают в Expo:

- [expo.dev](https://expo.dev) → проект → **Environment variables** (Production).
- Либо в `eas.json` в секции `build.production.env` (не коммить секреты в репозиторий).

Подробнее: [docs/EAS_ENV_VARS.md](./EAS_ENV_VARS.md).

---

## Краткий чеклист

| Что нужно | Где взять |
|-----------|-----------|
| Apple Developer аккаунт | [developer.apple.com](https://developer.apple.com/programs/enroll/) |
| Expo/EAS аккаунт | Уже есть (webnum.com), `eas login` |
| Bundle ID | В `app.json`: `ios.bundleIdentifier` |
| Credentials для подписи | EAS создаёт сам при первом билде (рекомендуется) |
| IPA файл | expo.dev → Builds → iOS build → **Download** |

Итого: залогиниться в EAS, иметь активный Apple Developer аккаунт, выполнить `eas build --platform ios --profile production` и скачать IPA со страницы билда на expo.dev.
