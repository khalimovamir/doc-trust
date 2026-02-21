# Подключение Supabase к AI Lawyer

В проекте уже настроен клиент Supabase (`src/lib/supabase.js`) и используются таблицы для профилей, чатов, документов и подписок. Чтобы приложение работало с реальной БД, нужно создать проект в Supabase и подставить ключи.

## 1. Создать проект в Supabase

1. Зайди на [supabase.com](https://supabase.com) и войди в аккаунт.
2. **New project** → выбери организацию, задай имя (например, `ai-lawyer`), пароль БД и регион.
3. Дождись создания проекта.

## 2. Получить URL и anon key

В дашборде проекта:

- **Project Settings** (иконка шестерёнки) → **API**.
- Скопируй:
  - **Project URL** (например, `https://xxxxx.supabase.co`);
  - **anon public** key (в разделе Project API keys).

## 3. Создать файл `.env`

В корне проекта (рядом с `package.json`):

```bash
cp .env.example .env
```

Открой `.env` и подставь свои значения:

```
EXPO_PUBLIC_SUPABASE_URL=https://ТВОЙ_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=твой_anon_key
```

Файл `.env` уже в `.gitignore`, в репозиторий он не попадёт.

## 4. Применить миграции к облачной БД

Установи [Supabase CLI](https://supabase.com/docs/guides/cli), если ещё не установлен, затем:

```bash
cd "/Users/amirkhalimov/Cursor/AI Lawyer"
npx supabase login
npx supabase link --project-ref ТВОЙ_PROJECT_REF
```

`ТВОЙ_PROJECT_REF` — это часть URL проекта (например, для `https://abcdefgh.supabase.co` ref будет `abcdefgh`). Его можно взять в **Project Settings** → **General** → **Reference ID**.

Применить миграции:

```bash
npx supabase db push
```

Так в облачной БД создадутся таблицы: `profiles`, `chats`, `chat_messages`, `documents`, `document_versions`, `analyses`, `analysis_issues`, `analysis_guidance_items`, таблицы подписок и бакет `avatars` в Storage.

## 5. (Опционально) Локальный Supabase

Если хочешь разрабатывать с локальной БД:

```bash
npx supabase start
```

В выводе будет **API URL** и **anon key** для локального проекта. Пропиши их в `.env` (можно в `.env.local` и переключаться при необходимости). Миграции к локальной БД применятся при `supabase start` автоматически.

## 6. Проверка

Перезапусти приложение:

```bash
npm start
```

После входа в аккаунт профиль создастся в `profiles`, чаты и документы будут сохраняться в Supabase. Если в консоли не появляется предупреждение про отсутствие Supabase credentials — подключение настроено верно.

## Edge Functions

В папке `supabase/functions/` лежат функции: `analyze-document`, `compare-documents`, `chat`. Для их работы нужно задеплоить функции в тот же проект:

```bash
npx supabase functions deploy
```

И настроить секреты/переменные для функций в дашборде Supabase при необходимости.
