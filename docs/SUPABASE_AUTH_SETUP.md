# Настройка авторизации Supabase

## 1. Email / Password
- В Supabase Dashboard: **Authentication > Providers** — включите **Email**.
- При необходимости отключите **Confirm email**, если не нужна верификация по письму при регистрации.

## 2. Forgot password (6-значный OTP вместо Magic Link)

Приложение использует `resetPasswordForEmail` — шаблон **Reset password** (не Magic Link). По умолчанию Supabase отправляет ссылку. Чтобы отправлялся **6-значный OTP**:

1. Откройте **Supabase Dashboard** → **Authentication** → **Email** → выберите **Reset password**
2. Измените **Subject** на: `Reset Password - Verification Code` (или по желанию)
3. Замените **Body** — вместо ссылки покажите код как текст:

**Было (ссылка):**
```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

**Должно быть (OTP):**
```html
<h2>Reset Password</h2>
<p>Enter this 6-digit code in the app:</p>
<p><strong>{{ .Token }}</strong></p>
```

4. Нажмите **Save changes**

- `{{ .Token }}` — 6-значный код, который пользователь вводит в приложении
- **Magic Link** — только для входа в систему; для сброса пароля используйте шаблон **Reset password**

## 3. Google Sign In
- **Authentication > Providers** — включите **Google**, укажите Client ID и Client Secret из [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
- **Authentication > URL Configuration** — в **Redirect URLs** добавьте:
  - `ai-lawyer://google-auth` (для production)
  - Для разработки: URL из `Linking.createURL('google-auth')` (например `exp://192.168.x.x:8081/--/google-auth`).

## 4. Storage — аватар пользователя (bucket `avatars`)

Приложение загружает аватар в bucket **avatars**. Путь: `{user_id}/avatar.jpg`.

1. **Storage > Policies** — добавьте политику для bucket `avatars`:

**Upload (insert):** Пользователь может загружать только в свою папку:
```sql
create policy "avatars: user upload own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

**Update:** Для перезаписи аватара (upsert):
```sql
create policy "avatars: user update own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

2. Bucket **avatars** должен быть **public** (Settings → Public bucket), чтобы `getPublicUrl` работал.

## 5. Apple Sign In
- Пока не настраивается (по вашему запросу в Supabase ещё не подключён).
