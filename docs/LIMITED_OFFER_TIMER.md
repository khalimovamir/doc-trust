# Как работает таймер Limited Offer

Таймер обратного отсчёта (часы : минуты : секунды) для оффера берётся из **Supabase** и зависит от режима оффера: **global** или **per_user**.

---

## 1. Откуда берётся время

### Режим оффера: `mode` в `subscription_offers`

В таблице **`subscription_offers`** у каждого оффера есть поле **`mode`**:

- **`global`** — один общий дедлайн для всех.
- **`per_user`** — у каждого пользователя свой дедлайн (персональный таймер).

---

## 2. Режим **global**

- **Конец времени:** поле **`ends_at`** (timestamptz) в `subscription_offers`.
- Таймер считает время до `ends_at` от текущего момента.
- Один и тот же обратный отсчёт видят все пользователи.

**Пример в БД:**

- `mode = 'global'`
- `ends_at = '2026-03-01 23:59:59+00'`  
→ таймер показывает, сколько осталось до этой даты/времени.

---

## 3. Режим **per_user**

- **Конец времени:** поле **`expires_at`** в таблице **`user_offer_states`** (для пары user + offer).
- `expires_at` выставляется **автоматически** при первом появлении оффера у пользователя:
  - при открытии баннера на Home вызывается `ensureUserOfferState(userId, offerId)`;
  - если записи нет, создаётся строка в `user_offer_states`;
  - триггер в БД читает у оффера **`duration_seco`** (длительность в секундах) и ставит  
    **`expires_at = now() + duration_seco`**.
- Таймер считает время до этого персонального `expires_at`.

**Пример в БД:**

- В **`subscription_offers`**: `mode = 'per_user'`, `duration_seco = 86400` (24 часа).
- Пользователь первый раз видит оффер → создаётся запись в **`user_offer_states`** → триггер выставляет `expires_at = now() + 24 hours`.
- У каждого пользователя свой `expires_at`, значит и свой обратный отсчёт.

---

## 3.1. Режим **per_user** с повтором «через день» (recurrence)

Если у оффера задано **`recurrence_hidden_seco`** (секунды скрытия после окончания окна), карточка оффера ведёт себя так:

- **Показ:** 24 часа (`duration_seco = 86400`), таймер до `expires_at`.
- **Скрытие:** после `expires_at` карточка исчезает на время **`recurrence_hidden_seco`** (например 86400 = 1 день).
- **Повтор:** когда наступило `next_show_at` (в **`user_offer_states`**), приложение вызывает RPC **`start_next_offer_window`** и получает новое окно: `expires_at` и `next_show_at` обновляются, карточка снова показывается на 24 часа.

**Пример в БД:**

- `mode = 'per_user'`, `duration_seco = 86400`, **`recurrence_hidden_seco = 86400`** (24 ч показ, 24 ч скрыто, затем снова показ).
- В **`user_offer_states`** триггер при создании записи выставляет `expires_at` и **`next_show_at`** = `expires_at + recurrence_hidden_seco`.

---

## 4. Где в коде считается обратный отсчёт

- **Функция:** `computeCountdown(expiresAt)` в **`HomeScreen.js`**.
- На вход — одна дата окончания (строка/Date): либо `ends_at` (global), либо `expires_at` из `user_offer_states` (per_user).
- Считает разницу между этой датой и `Date.now()`, переводит в часы, минуты, секунды; если время вышло — возвращает `{ h: 0, m: 0, s: 0 }`.

**Откуда подставляется дата:**

- **Баннер на Home:**  
  - global: `activeOffer.ends_at`  
  - per_user: `bannerOfferState.expires_at` (после вызова `ensureUserOfferState`).
- **Bottom sheet оффера:**  
  - global: `currentOffer.ends_at`  
  - per_user: `userOfferState.expires_at`.

Таймер обновляется каждую секунду (`setInterval(..., 1000)`).

---

## 5. Кратко

| Режим     | Где хранится конец времени      | Как задаётся |
|----------|---------------------------------|--------------|
| **global**  | `subscription_offers.ends_at`   | Вручную в БД (дата/время окончания оффера). |
| **per_user**| `user_offer_states.expires_at`  | Триггер при создании записи: `now() + subscription_offers.duration_seco` (секунды). При наличии `recurrence_hidden_seco` следующее окно — через RPC `start_next_offer_window`. |

Таймер Limited Offer всегда показывает время до этой даты (часы : минуты : секунды) и обновляется в реальном времени. Для оффера «через день» карточка скрыта, пока `now()` не достигнет `next_show_at` и приложение не обновит окно через RPC.
