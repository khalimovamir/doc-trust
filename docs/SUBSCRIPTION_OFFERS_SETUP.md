# Настройка Subscription и Offer в Supabase

После применения миграции `20260224000000_subscription_offers_and_products.sql` таблицы готовы к заполнению. Ниже — что добавить, чтобы в приложении отображался оффер как у вас: **Temporary Discount**, 50% OFF, таймер и цена **$25.99 Yearly**.

---

## 1. Таблица `subscription_offers`

Колонки (как в вашей схеме):

| Колонка          | Тип           | Описание |
|------------------|---------------|----------|
| `id`             | uuid          | PK, по умолчанию `gen_random_uuid()` |
| `code`           | text          | Уникальный код оффера (например `LIMITED_50`) |
| `title`          | text          | Заголовок в баннере и модалке, напр. **Temporary Discount** или **Limited Offer!** |
| `subtitle`       | text          | Подзаголовок скидки, напр. **50% OFF** (показывается на кнопке «Get 50% Offer Now») |
| `discount_type`  | offer_disc    | `'percent'` или `'fixed'` |
| `discount_perc`  | int2          | Процент скидки (например 50), если `discount_type = 'percent'` |
| `discount_cent`  | int4          | Скидка в центах, если `discount_type = 'fixed'` |
| `mode`           | offer_mo      | `'global'` — один таймер для всех по `ends_at`; `'per_user'` — у каждого пользователя свой таймер по `duration_seco` после первого показа |
| `starts_at`      | timestamptz   | Когда оффер становится активным (NULL = сразу) |
| `ends_at`        | timestamptz   | Когда оффер заканчивается (для модалки и баннера таймер считается до этой даты в режиме `global`) |
| `duration_seco`  | int4          | Длительность в секундах для режима `per_user` (например 86400 = 24 часа) |
| `applies_to_int` | plan_inte     | К какому плану применяется: `'monthly'`, `'yearly'` или NULL (ко всем) |
| `is_active`      | bool          | Включён ли оффер (по умолчанию true) |
| `created_at`     | timestamptz   | По умолчанию `now()` |

### Пример строки для «Temporary Discount», 50% OFF, таймер

**Вариант A: глобальный оффер** (один таймер для всех до `ends_at`):

```sql
insert into public.subscription_offers (
  code, title, subtitle, discount_type, discount_perc, mode,
  starts_at, ends_at, applies_to_int, is_active
) values (
  'LIMITED_50',
  'Temporary Discount',
  '50% OFF',
  'percent',
  50,
  'global',
  now(),
  now() + interval '7 days',
  'yearly',
  true
);
```

**Вариант B: персональный оффер** (у каждого пользователя свой таймер 24 часа после первого показа):

```sql
insert into public.subscription_offers (
  code, title, subtitle, discount_type, discount_perc, mode,
  duration_seco, applies_to_int, is_active
) values (
  'LIMITED_50',
  'Temporary Discount',
  '50% OFF',
  'percent',
  50,
  'per_user',
  86400,
  'yearly',
  true
);
```

- В приложении: заголовок модалки = `title`, на кнопке = «Get » + `subtitle` + « Now», таймер — до `ends_at` (global) или до `expires_at` в `user_offer_states` (per_user).  
- Цена «$25.99 Yearly» получается из продукта **yearly** и скидки 50% (см. ниже).

---

## 2. Таблица `subscription_products`

Чтобы в оффере отображалось **$25.99 Yearly** и **Only $2.16 for a month**, нужен годовой план с ценой **до** скидки. При 50% скидке: базовая цена $51.98 → после скидки $25.99.

Добавьте колонки (если их ещё нет после миграции): `price_cents`, `currency`, `trial_days`.

Пример строк для планов (store = `manual` для отображения до подключения IAP):

```sql
insert into public.subscription_products (store, interval, price_cents, currency, trial_days, is_active)
values
  ('manual', 'monthly', 299, 'USD', 3, true),
  ('manual', 'yearly',  5198, 'USD', 3, true)
on conflict (store, interval) do update set
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  trial_days = excluded.trial_days,
  is_active = excluded.is_active;
```

(Уникальный индекс по `(store, interval)` создаётся миграцией. Если в вашей БД ключ другой — уберите `on conflict` или замените на свой.)

- **Yearly 5198 центов** = $51.98 → с оффером 50% = **2599 центов ($25.99)** и «Only $2.16 for a month».

---

## 3. Таблицы для таблицы сравнения FREE / PRO в модалке

Чтобы в оффере корректно отображались строки типа «AI Issue Detection», «Unlimited document checking» и т.д.:

**feature_catalog** (колонки: `feature`, `title`, `description`, `sort_order`):

```sql
insert into public.feature_catalog (feature, title, sort_order) values
  ('document_check', 'Unlimited document checking', 0),
  ('document_compare', 'Unlimited document comparing', 1),
  ('ai_lawyer', 'Smart AI Lawyer assistant', 2);
```

**plan_feature_limits** (колонки: `tier`, `feature`, `is_unlimited`, `monthly_limit`):

```sql
insert into public.plan_feature_limits (tier, feature, is_unlimited, monthly_limit) values
  ('free', 'document_check', false, 3),
  ('free', 'document_compare', false, 1),
  ('free', 'ai_lawyer', false, 0),
  ('pro', 'document_check', true, null),
  ('pro', 'document_compare', true, null),
  ('pro', 'ai_lawyer', true, null);
```

При необходимости добавьте уникальные ограничения и `on conflict` по вашим ключам.

---

## Кратко: что добавить в `subscription_offers`

1. Применить миграцию с enum'ами и колонками.  
2. Вставить одну запись оффера с:
   - **title** = «Temporary Discount» (или «Limited Offer!»),
   - **subtitle** = «50% OFF»,
   - **discount_type** = `'percent'`, **discount_perc** = 50,
   - **mode** = `'global'` (и задать **ends_at**) или `'per_user'` (и задать **duration_seco**),
   - **applies_to_int** = `'yearly'` (чтобы скидка применялась к годовой цене).  
3. В **subscription_products** иметь годовой план с **price_cents** = 5198 (чтобы после 50% получилось $25.99).  
4. При необходимости заполнить **feature_catalog** и **plan_feature_limits** для таблицы сравнения FREE/PRO в модалке.

После этого в приложении будут сохраняться и отображаться офферы из Supabase, таймер и цена как у вас.
