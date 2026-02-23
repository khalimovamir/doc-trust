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

## iOS и Android (изменения применяются сразу)

**Одна команда** — Metro запускается в фоне и остаётся работать:

```bash
npm run ios      # iOS Simulator
npm run android  # Android Emulator
```

Терминал **не закрывать** — Metro работает в нём. При сохранении файлов приложение обновится само (Fast Refresh). Если нет — в симуляторе **Cmd+R** (iOS) или **R+R** (Android).

**Альтернатива (два терминала):**
1. Терминал 1: `npm start` — Metro (не закрывать)
2. Терминал 2: `npm run ios:run` или `npm run android:run` — сборка и запуск

- `npm run ios:uninstall` — удалить с iOS симулятора
- `npm run ios:fresh` — удалить и заново собрать iOS

## TODO (сборка страниц)

- [ ] Home — загрузка документов
- [ ] Details — результаты анализа документа
- [ ] Chat с AI
- [ ] Интеграция Supabase
- [ ] Интеграция Gemini AI
