/**
 * Doc Trust - Sentry (optional)
 * Call initSentry() at app startup. If EXPO_PUBLIC_SENTRY_DSN is set, initializes Sentry
 * and sets global.__sentryCaptureException (e.g. for manual error reporting).
 * wrapRootComponent(Root) returns Sentry.wrap(Root) when Sentry is in use, else Root.
 */

let initialized = false;

export function initSentry() {
  if (initialized) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || typeof dsn !== 'string' || !dsn.startsWith('https://')) {
    return;
  }
  try {
    const Sentry = require('@sentry/react-native').default;
    Sentry.init({
      dsn,
      tracesSampleRate: 0.2,
      enableAutoSessionTracking: true,
      _experiments: { replaysOnErrorSampleRate: 0.1 },
    });
    global.__sentryCaptureException = (error, errorInfo) => {
      Sentry.withScope((scope) => {
        if (errorInfo?.componentStack) scope.setExtra('componentStack', errorInfo.componentStack);
        Sentry.captureException(error);
      });
    };
    initialized = true;
  } catch {
    // ignore
  }
}

export function wrapRootComponent(RootComponent) {
  if (!initialized) return RootComponent;
  if (require('react-native').Platform.OS === 'android') {
    return RootComponent;
  }
  try {
    const Sentry = require('@sentry/react-native');
    return Sentry.wrap(RootComponent);
  } catch {
    return RootComponent;
  }
}
