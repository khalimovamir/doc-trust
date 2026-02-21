# AI Lawyer

React Native (Expo) приложение для проверки документов с помощью AI (Gemini).

## Стек

- **React Native** + **Expo**
- **Шрифт:** SF Pro (системный на iOS)
- **Иконки:** Lucide (`lucide-react-native`)
- **Навигация:** React Navigation

## Структура проекта

```
AI Lawyer/
├── App.js                 # Точка входа
├── src/
│   ├── theme/             # Тема: цвета, типографика, отступы
│   │   ├── colors.js      # Цветовая палитра (Light Mode)
│   │   ├── typography.js
│   │   ├── spacing.js
│   │   └── index.js
│   ├── components/        # UI компоненты
│   ├── screens/           # Экраны приложения
│   │   ├── HomeScreen.js
│   │   └── DetailsScreen.js
│   └── navigation/        # Навигация
│       └── AppNavigator.js
└── assets/
```

## Цветовая схема (Light Mode)

### Brand Colors
- **Primary:** `#3b82f6`
- **Secondary:** `#111827`
- **Tertiary:** `#eeeff2`
- **Alternate:** `#f6f7f8`

### Utility Colors
- **Primary Text:** `#111827`
- **Secondary Text:** `#6b7280`
- **Primary Background:** `#f9fafb`
- **Secondary Background:** `#ffffff`

### Accent Colors (13% opacity)
- **Accent 1:** Primary 13%
- **Accent 2:** Success 13%
- **Accent 3:** Error 13%
- **Accent 4:** Warning 13%

### Semantic Colors
- **Success:** `#38a010`
- **Error:** `#ef4444`
- **Warning:** `#d97706`
- **Info:** `#ffffff`

## Запуск

```bash
npm start      # Expo dev server (Metro)
npm run ios    # iOS симулятор
npm run android # Android эмулятор
npm run web    # Web
```

## Разработка с Xcode (изменения видны сразу)

Чтобы при правках кода в Cursor/IDE изменения сразу отображались в приложении, запущенном из Xcode:

1. **Сначала запустите Metro** (в отдельном терминале):
   ```bash
   npm start
   ```
   Дождитесь сообщения вроде «Waiting on http://localhost:8081».

2. **Затем запустите приложение из Xcode** (▶ Run или Cmd+R).  
   В Debug-сборке приложение подключается к Metro и подгружает JS с сервера, а не из вшитого бандла.

3. **После этого:**
   - при сохранении JS/React-файлов сработает **Fast Refresh** — экран обновится сам;
   - если обновления нет — в симуляторе нажмите **Cmd+R** (или встряхните устройство и выберите «Reload»).

Если Metro не запущен и вы запускаете приложение только из Xcode, будет использоваться старый бандл и правки кода не появятся до пересборки.

## TODO (сборка страниц)

- [ ] Home — загрузка документов
- [ ] Details — результаты анализа документа
- [ ] Chat с AI
- [ ] Интеграция Supabase
- [ ] Интеграция Gemini AI
