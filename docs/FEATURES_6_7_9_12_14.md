# Функции: офлайн, оценка в Store, deep links, Sentry, тесты

## 6. Офлайн-доступ к анализам

- **Кэш:** последние 20 анализов сохраняются локально (AsyncStorage).
- **Поведение:** при открытии экрана «Детали» сначала проверяется кэш, затем запрос в Supabase; при успешном ответе результат пишется в кэш. При ошибке сети показываются данные из кэша, если они есть.
- **История и главная:** список анализов при ошибке сети подставляется из кэша (`getAnalysesForUserWithCache`, `getCachedAnalysesList`).
- **Файлы:** `src/lib/analysisCache.js`, `src/lib/documents.js` (`getAnalysisByIdCached`, `getAnalysesForUserWithCache`), экраны Details, History, Home используют кэширующие версии.

---

## 7. Запрос оценки в Store

- **Пакет:** `expo-store-review`.
- **Когда:** через ~1.5 с после успешного показа результата анализа (`AnalysisResultScreen`) или результата сравнения (`ComparingResultScreen`).
- **Ограничение:** не чаще одного раза в 30 дней (ключ `@doctrust_last_review_request` в AsyncStorage).
- **Файлы:** `src/lib/requestReview.js`, вызовы в `AnalysisResultScreen`, `ComparingResultScreen`.

---

## 9. Глубокие ссылки (deep links)

- **Схемы:** `doctrust://` и `ai-lawyer://` (в `app.json` задано `"scheme": ["ai-lawyer", "doctrust"]`).
- **Формат оффера:** `doctrust://offer/50` или `ai-lawyer://offer/50` (число или id оффера). Поддерживаются query-параметры: `?id=50`, `?offerId=50`.
- **Поведение:** при открытии ссылки (cold start или из другого приложения) приложение переходит на экран Подписки с параметрами `fromOffer: true`, `offerId: <значение>` (если пользователь авторизован).
- **Файлы:** `src/lib/deepLinks.js` (`parseOfferDeepLink`), `src/navigation/AppNavigator.js` (подписка на `Linking`, `navigationRef.navigate('Subscription', …)`).

---

## 12. Краш-репорты и Error Boundary

- **Error Boundary:** `src/components/ErrorBoundary.js` — перехватывает ошибки в дереве компонентов и показывает экран «Something went wrong» и кнопку «Try again». При инициализированном Sentry вызывает `global.__sentryCaptureException`.
- **Sentry (по желанию):** инициализация в `src/lib/sentry.js`. Чтобы включить, задайте в `.env`:  
  `EXPO_PUBLIC_SENTRY_DSN=https://…@sentry.io/…`  
  Тогда при падениях и вызове `__sentryCaptureException` события уходят в Sentry. Корень приложения обёрнут в `wrapRootComponent` для перехвата необработанных ошибок.
- **Плагин:** в `app.json` добавлен `@sentry/react-native`. Для загрузки source maps при EAS Build можно настроить плагин (organization, project) по [документации Sentry для Expo](https://docs.sentry.io/platforms/react-native/manual-setup/expo/).

---

## 14. Тесты (Jest)

- **Запуск:** `npm test` или `npm run test:ci`.
- **Сейчас:** юнит-тесты для `parseOfferDeepLink` (deep links) и `applyOfferDiscount` (подписка/скидки).
- **Файлы:** `jest.config.js`, `babel.config.js`, `src/__tests__/lib/deepLinks.test.js`, `src/__tests__/lib/subscription.test.js`.
- **Зависимости:** `jest`, `babel-jest`, `@babel/core`, `@babel/preset-env`.
