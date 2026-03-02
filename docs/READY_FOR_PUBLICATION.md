# Подготовка приложения к публикации (для того, кто публикует)

Проект подготовлен к публикации. После клонирования из Git нужно выполнить шаги ниже (RevenueCat, App Store Connect, сборка и отправка). Публикацию делает тот, у кого подключён аккаунт Apple Developer и доступ к проекту.

---

## Что уже сделано в репозитории

- Интеграция RevenueCat SDK (`react-native-purchases`), инициализация при старте и при входе/выходе пользователя.
- Экран подписки в приложении (SubscriptionBottomSheet): планы **weekly** и **yearly**.
- В коде проверяется entitlement **`pro`** в RevenueCat (identifier в дашборде должен быть именно `pro`).
- Конфиг приложения: Bundle ID `com.anonymous.ai-lawyer`, название Doc Trust, splash, иконки.
- EAS: профили `production` и `submit.production` для сборки и отправки.

---

## 1. Переменные окружения (обязательно)

Для локальной сборки скопируйте `.env.example` в `.env` и заполните.  
Для **EAS Build** задайте переменные в [expo.dev](https://expo.dev) → проект → **Environment variables** (профиль production):

| Переменная | Описание |
|------------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | URL проекта Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | iOS API Key из RevenueCat (API keys) |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | Android API Key (если публикуете в Google Play) |

Без этих ключей приложение не подключится к бэкенду и подпискам.

---

## 2. RevenueCat (подписки)

1. **Apps & providers** → подключить **App Store**:
   - Bundle ID: `com.anonymous.ai-lawyer`
   - Shared Secret из App Store Connect: приложение DocTrust → **App Information** → App-Specific Shared Secret (создать/скопировать).

2. **Entitlement**: в настройках проекта создать entitlement с идентификатором **`pro`** (отображаемое имя может быть любым, например «DocTrust Pro»).

3. **Product catalog / Offerings**: добавить продукты с ID **`pro_weekly`** и **`pro_yearly`** (как в приложении), тип Subscription, привязать к entitlement **pro** в Default offering.

4. **API keys**: скопировать iOS (и при необходимости Android) ключ и подставить в переменные окружения (п. 1).

5. В Overview можно отметить **«Integrate the SDK»** и **«Create your first paywall»** как выполненные (в приложении свой экран подписки).

---

## 3. App Store Connect (перед отправкой на ревью)

1. **In-App Purchases**  
   Создать подписки (Auto-Renewable Subscription) с ID:
   - **`pro_weekly`**
   - **`pro_yearly`**  
   Один Subscription Group (например, «DocTrust PRO»), цены и локализации на своё усмотрение.

2. **Previews and Screenshots**  
   - iPhone 6.5": **1242×2688** или **1284×2778** px (до 10 скриншотов, первые 3 — на листе установки).
   - При необходимости — другие размеры (iPad и т.д.).

3. **Остальное для версии 1.0**  
   - Описание, ключевые слова, категория, возрастной рейтинг.  
   - **App Privacy**: политика конфиденциальности (URL) и ответы на вопросы о сборе данных.  
   - **Support URL** (обязательно для контакта).  
   - **Version**: 1.0; новый билд подтянется после загрузки сборки.

4. **Add for Review**  
   После заполнения всех обязательных полей нажать **Add for Review** / **Submit for Review**.

---

## 4. Сборка и отправка в App Store

**Вариант A — EAS (рекомендуется)**

```bash
npm install
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production --latest
```

Перед этим в [expo.dev](https://expo.dev) в проекте должны быть заданы переменные окружения для production и (при необходимости) credentials для Apple.

**Вариант B — Xcode**

- Открыть `ios/DocTrust.xcworkspace`.
- Выбрать таргет DocTrust, подпись (Team с платным Apple Developer).
- **Product → Archive** → **Distribute App** → App Store Connect.

---

## Краткий чек-лист для публикации

- [ ] Клонировать репозиторий, выполнить `npm install`.
- [ ] Задать переменные окружения (`.env` или EAS Environment variables): Supabase, RevenueCat.
- [ ] RevenueCat: подключить App Store (Bundle ID, Shared Secret), entitlement `pro`, продукты `pro_weekly`, `pro_yearly`.
- [ ] App Store Connect: создать In-App Purchases `pro_weekly`, `pro_yearly`; загрузить скриншоты; заполнить описание, приватность, Support URL.
- [ ] Собрать production-билд (EAS или Xcode).
- [ ] Загрузить билд в App Store Connect и нажать **Add for Review**.

Подробные шаги по RevenueCat и скриншотам — в **docs/PUBLISH_APP_STORE_AND_REVENUECAT.md**.
