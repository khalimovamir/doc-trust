# Публикация приложения: RevenueCat и App Store Connect

Пошаговая настройка подписок через RevenueCat и подготовка DocTrust к публикации в App Store.

---

## Часть 1. RevenueCat

RevenueCat — сервис, который принимает платежи в App Store / Google Play и сообщает приложению, есть ли у пользователя подписка. Ваше приложение уже использует его API (`src/lib/revenueCat.js`), нужно только настроить дашборд и подставить ключи.

### Шаг 1.1. Подтвердите email

- В RevenueCat вверху страницы розовый баннер: «Your email address is not yet confirmed».
- Откройте почту, найдите письмо от RevenueCat и перейдите по ссылке подтверждения.
- Если письма нет — нажмите «try again» в баннере или проверьте папку «Спам».

### Шаг 1.2. Проект и приложение в RevenueCat

- Если в дашборде сейчас открыт проект **Plantus** — либо переименуйте его в **DocTrust**, либо создайте **новый проект** и назовите его **DocTrust**.
- В проекте должно быть приложение для **DocTrust** (не Plantus). При необходимости создайте новое приложение: **Apps & providers** → **+ New** → укажите имя (например, DocTrust) и платформу.

### Шаг 1.3. Подключение App Store (iOS)

1. В RevenueCat: **Apps & providers** → выберите ваше приложение (DocTrust) → **+ Add app** или настройка iOS.
2. Выберите **App Store Connect**.
3. Укажите **Bundle ID**: `com.anonymous.ai-lawyer` (как в `app.json`).
4. **App Store Connect Shared Secret**:
   - Зайдите в [App Store Connect](https://appstoreconnect.apple.com) → ваше приложение **DocTrust - AI Risk Detector** → **App Information**.
   - В блоке **App-Specific Shared Secret** нажмите **Generate** (или скопируйте существующий).
   - Скопируйте значение и вставьте в RevenueCat в поле Shared Secret.
5. Сохраните. RevenueCat подтянет продукты из App Store Connect после того, как вы их создадите (см. Часть 2).

### Шаг 1.4. Подключение Google Play (Android, по желанию)

1. В RevenueCat: **Apps & providers** → то же приложение → **+ Add app** → **Google Play**.
2. **Package name**: `com.anonymous.ailawyer`.
3. Создайте в [Google Play Console](https://play.google.com/console) сервисный аккаунт (Setup → API access), скачайте JSON-ключ.
4. В RevenueCat загрузите этот JSON (Service account credentials).

### Шаг 1.5. Продукты и entitlement в RevenueCat

1. **Product catalog** (RevenueCat):
   - Перейдите в **Product catalog**.
   - Добавьте продукты с **идентификаторами**, которые совпадают с теми, что вы создадите в App Store Connect (см. ниже): например `pro_weekly`, `pro_monthly`, `pro_yearly`, `pro_yearly_offer`.
   - Тип: **Subscription**.

2. **Entitlement** (обязательно):
   - В проекте RevenueCat откройте **Project settings** (или раздел Entitlements).
   - Создайте entitlement с идентификатором **`pro`** (именно так задано в коде приложения).

3. **Offering**:
   - **Paywalls** или **Offerings** → создайте Offering (например, **Default**).
   - В него добавьте пакеты (Packages), привязанные к продуктам App Store: например `$rc_weekly`, `$rc_monthly`, `$rc_annual` и т.п., и привяжите их к entitlement **pro**.

### Шаг 1.6. API Keys в приложении

1. В RevenueCat: **API keys** (или **Project settings** → API Keys).
2. Скопируйте:
   - **Public app-specific API key** для **iOS**
   - **Public app-specific API key** для **Android** (если настроили Google Play).

3. В корне проекта в файле **`.env`** добавьте (если ключей ещё нет):

```env
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxxxxxx
```

Подставьте свои ключи. Для EAS Build те же переменные можно задать в [expo.dev](https://expo.dev) → ваш проект → **Environment variables** (production).

4. Перезапустите приложение (или сделайте новую сборку), чтобы переменные подхватились.

### Шаг 1.7. Paywall в RevenueCat (по желанию)

- В приложении уже есть свой экран подписки (`SubscriptionBottomSheet`), поэтому можно нажать **«Mark as done»** для шага «Create your first paywall» и не создавать визуальный Paywall в RevenueCat.
- Если позже захотите использовать визуальный Paywall RevenueCat — можно добавить его и вызывать из кода вместо или вместе с текущим экраном.

### Шаг 1.8. Тестовые платежи (два варианта)

**Вариант A — Sandbox Apple/Google (реальный магазин, тестовый аккаунт):**

- В RevenueCat включите **Sandbox data** (переключатель на Overview).
- На устройстве/симуляторе войдите в **Sandbox-аккаунт** Apple: Настройки → App Store → внизу «Sandbox Account» (тестовый Apple ID из App Store Connect → Users and Access → Sandbox).
- В приложении нажмите кнопку подписки и совершите тестовую покупку — в RevenueCat во вкладке **Customers** появится запись.

**Вариант B — RevenueCat Test Store (без настройки App Store):**

- В RevenueCat: **Apps and providers** → раздел **Test configuration** → **Create a Test Store** → скопировать **Test Store API key**.
- В дашборде создать продукты и offering для Test Store (или использовать созданный по умолчанию).
- В проекте в `.env` добавить:  
  `EXPO_PUBLIC_REVENUECAT_TEST_STORE_API_KEY=rcb_xxxx` (подставить свой ключ).  
  В режиме разработки (`__DEV__`) приложение будет использовать Test Store: при нажатии «Купить» откроется модалка с кнопками «Успех» / «Ошибка» / «Отмена» (без запроса к Apple/Google).
- **Важно:** перед релизом убедитесь, что в production-сборках эта переменная не задана — иначе в сторе будет использоваться тестовый ключ.

---

## Часть 2. App Store Connect — подготовка к публикации

### Шаг 2.1. In-App Purchases (подписки)

Чтобы RevenueCat и приложение могли продавать подписки, продукты должны быть созданы в App Store Connect.

1. В [App Store Connect](https://appstoreconnect.apple.com) откройте приложение **DocTrust - AI Risk Detector**.
2. Перейдите в раздел **In-App Purchases** (или через приложение → подписки/покупки).
3. Создайте подписки с типами **Auto-Renewable Subscription** и идентификаторами, которые совпадают с теми, что вы указали в RevenueCat и с которыми работает приложение, например:
   - `pro_weekly` — недельная,
   - `pro_monthly` — месячная,
   - `pro_yearly` — годовая,
   - `pro_yearly_offer` — акционная годовая (если используете).
4. Для каждой подписки задайте цену, локализации и описание. Создайте **Subscription Group** (например, «DocTrust PRO») и добавьте в неё все эти продукты.

После сохранения и обработки Apple эти продукты появятся в RevenueCat после следующей синхронизации (или обновления приложения в RevenueCat).

### Шаг 2.2. Previews and Screenshots (скриншоты)

На скриншоте у вас открыт раздел **Previews and Screenshots** для **iPhone 6.5" Display**.

1. Требуемые размеры для iPhone 6.5":
   - **1242 × 2688 px** или **2688 × 1242 px**,  
   - либо **1284 × 2778 px** или **2778 × 1284 px** (для новых iPhone).
2. Загрузите от 3 до 10 скриншотов приложения (главный экран, сканирование, подписка и т.д.). Первые 3 используются на странице установки.
3. При необходимости добавьте скриншоты для других размеров (iPad, другие iPhone) в соответствующих вкладках.

### Шаг 2.3. Остальные поля версии 1.0

- **App Information**: название, подзаголовок, категория, возрастной рейтинг и т.д.
- **App Privacy**: политика конфиденциальности (URL и ответы на вопросы о сборе данных).
- **Description / Keywords**: описание приложения и ключевые слова для поиска.
- **Support URL** и **Marketing URL** (по желанию).
- **Version**: 1.0 уже выбрана; при необходимости обновите **Build** (новый билд загружается через Xcode или EAS Build).

### Шаг 2.4. Отправка на модерацию

- Заполните все обязательные поля (обычно помечены предупреждениями).
- Нажмите **Add for Review** (или **Submit for Review**). После проверки Apple приложение станет доступно в App Store.

---

## Краткий чек-лист

**RevenueCat**

- [ ] Подтвердить email в RevenueCat.
- [ ] Создать/выбрать проект и приложение для DocTrust.
- [ ] Подключить App Store (Bundle ID `com.anonymous.ai-lawyer`, Shared Secret).
- [ ] (Опционально) Подключить Google Play.
- [ ] Создать entitlement **`pro`** и продукты (ID совпадают с App Store).
- [ ] Создать Offering и привязать пакеты к **pro**.
- [ ] Скопировать API Keys и добавить в `.env` (`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`).
- [ ] Проверить покупку в Sandbox.

**App Store Connect**

- [ ] Создать In-App Purchases (подписки) с теми же ID, что в приложении и RevenueCat.
- [ ] Загрузить скриншоты для iPhone 6.5" (и при необходимости для других устройств).
- [ ] Заполнить описание, приватность, контакты.
- [ ] Отправить версию на ревью (**Add for Review**).

После этого подписки будут проходить через RevenueCat, а приложение будет готово к публикации в App Store.
