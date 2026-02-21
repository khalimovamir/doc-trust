# Upload File и Edge Functions

## Ошибка "Cannot find native module 'ExpoDocumentPicker'"

После установки `expo-document-picker` нужно **пересобрать нативное приложение** (модуль нативный, одного перезапуска Metro мало):

```bash
npx expo run:ios
```

или для Android:

```bash
npx expo run:android
```

После сборки снова открой приложение в симуляторе/устройстве — выбор документа должен заработать.

---

## Деплой Edge Function `extract-document-text`

Функция извлекает текст из загруженных файлов (TXT — декодирование, PNG/JPG — через Gemini).

1. Установи [Supabase CLI](https://supabase.com/docs/guides/cli), залогинься и привяжи проект:
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```

2. Задеплой функцию:
   ```bash
   supabase functions deploy extract-document-text
   ```

3. В Supabase Dashboard → Project Settings → Edge Functions проверь, что у функции задан секрет **GEMINI_API_KEY** (для извлечения текста из изображений).

Альтернатива: в Dashboard → Edge Functions → Create function → имя `extract-document-text`, вставить код из `supabase/functions/extract-document-text/index.ts` и задеплоить.
