# Подключение RevenueCat к проекту Doc Trust

RevenueCat управляет подписками и покупками в App Store и Google Play. Ниже — минимальные шаги для интеграции в текущий проект (Expo + Supabase).

## 1. Установка SDK

В проекте уже есть `expo-dev-client`, поэтому нативный модуль можно ставить:

```bash
npx expo install react-native-purchases
```

Опционально (готовый UI для подписок):

```bash
npx expo install react-native-purchases-ui
```

После установки нужен **полный пересбор** приложения (не только hot reload):

```bash
npx expo prebuild --clean
npx expo run:ios
# или
npx expo run:android
```

## 2. Настройка в RevenueCat

1. Зайти на [app.revenuecat.com](https://app.revenuecat.com), создать проект.
2. **iOS**: в проекте RevenueCat добавить App Store Connect App (Bundle ID: `com.anonymous.ai-lawyer`), загрузить Shared Secret из App Store Connect → App → App Information → App-Specific Shared Secret.
3. **Android**: добавить Google Play app (package: `com.anonymous.ailawyer`), привязать сервисный аккаунт (JSON ключ из Google Play Console → Setup → API access).
4. В RevenueCat создать **Entitlement** (например `pro`) и **Products** (идентификаторы из App Store Connect / Google Play Console), сгруппировать в **Offering** (например `default`).
5. Скопировать **API Keys**: Project Settings → API Keys — отдельно ключ для iOS и для Android.

## 3. Ключи в приложении

Добавить ключи в окружение (например через `eas secret` или `.env`):

- `REVENUECAT_IOS_API_KEY` — iOS API Key из RevenueCat.
- `REVENUECAT_ANDROID_API_KEY` — Android API Key из RevenueCat.

В коде инициализация по платформе:

```js
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
});
if (apiKey) {
  await Purchases.configure({ apiKey });
}
```

(В Expo переменные окружения лучше задавать с префиксом `EXPO_PUBLIC_` и подставлять при сборке.)

## 4. Идентификация пользователя (опционально)

После логина в Supabase можно передать `userId` в RevenueCat, чтобы подписка была привязана к аккаунту:

```js
if (user?.id) {
  await Purchases.logIn(user.id);
}
```

При выходе:

```js
await Purchases.logOut();
```

## 5. Получение продуктов и покупка

- **Офферы**: `const offerings = await Purchases.getOfferings();` — пакеты и цены.
- **Покупка**: `const { customerInfo } = await Purchases.purchasePackage(package);` — после успеха проверять `customerInfo.entitlements.active['pro']`.
- **Статус**: `const customerInfo = await Purchases.getCustomerInfo();` — затем `customerInfo.entitlements.active['pro']` для проверки PRO.

Идентификаторы пакетов (например `$rc_weekly`, `$rc_annual`) задаются в RevenueCat Dashboard в Offering.

## 6. Связка с текущим кодом (Supabase)

Сейчас PRO хранится в Supabase (`user_subscriptions`). Возможные варианты:

- **A) RevenueCat как источник прав**: в приложении считать `isPro` только из RevenueCat (`customerInfo.entitlements.active['pro']`). Синхронизацию с Supabase (если нужна для бэкенда) делать через [RevenueCat Webhooks](https://www.revenuecat.com/docs/webhooks) → ваш backend обновляет `user_subscriptions`.
- **B) Supabase как источник прав**: оставить текущую логику (Supabase + `grant_manual_subscription`). RevenueCat использовать только для оплаты: после успешного `purchasePackage` вызывать ваш API/ Supabase RPC, который записывает подписку в БД.

В `SubscriptionContext` и `SubscriptionBottomSheet` затем подменяете вызов покупки: вместо прямого вызова `grantManualSubscription` — сначала `Purchases.purchasePackage(...)`, при успехе при необходимости вызвать backend/Supabase.

## 7. Полезные ссылки

- [RevenueCat + Expo](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [React Native Purchases (GitHub)](https://github.com/RevenueCat/react-native-purchases)
- [Webhooks](https://www.revenuecat.com/docs/webhooks) — для синхронизации с Supabase/backend

## 8. Чек-лист

- [ ] Установить `react-native-purchases`, пересобрать приложение.
- [ ] Создать проект в RevenueCat, подключить App Store и/или Google Play.
- [ ] Создать Entitlement (`pro`) и Offering с продуктами.
- [ ] Добавить API ключи в окружение и вызвать `Purchases.configure()` при старте приложения.
- [ ] После логина вызывать `Purchases.logIn(user.id)` (при необходимости).
- [ ] В экране подписки: загружать пакеты через `Purchases.getOfferings()`, покупать через `Purchases.purchasePackage()`.
- [ ] Определить источник прав PRO (RevenueCat или Supabase) и при необходимости настроить webhooks.
