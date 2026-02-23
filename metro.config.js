/**
 * Metro config for Expo.
 * Чтобы обновления сразу показывались в Xcode Simulator:
 * 1. Запустите: npm run dev (или npm run ios:sim)
 * 2. В терминале нажмите "i" — откроется симулятор и подцепится к Metro
 * 3. Сохраняйте файлы — Fast Refresh применит изменения без перезапуска
 * Если не подхватывает: в симуляторе Cmd+R (полная перезагрузка) или в терминале "r".
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
