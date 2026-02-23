/**
 * Doc Trust - Error Boundary
 * Catches JS errors in child tree and shows fallback UI so the app doesn't close.
 * On "Try again" navigates to Home and clears error.
 * Logs full error so we can see real cause in logcat / console.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';

function reportError(error, errorInfo) {
  const msg = error?.message || String(error);
  const stack = error?.stack || '';
  const compStack = errorInfo?.componentStack || '';
  if (__DEV__) {
    console.error('[ErrorBoundary]', msg, stack, compStack);
  } else {
    console.error('[ErrorBoundary]', msg);
  }
  try {
    if (typeof global.__sentryCaptureException === 'function') {
      global.__sentryCaptureException(error, errorInfo);
    }
  } catch {
    // ignore
  }
}

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    reportError(error, errorInfo);
  }

  handleRetry = () => {
    const { navigationRef, onRetry } = this.props;
    const navRef = navigationRef?.current;
    if (navRef?.isReady?.() && typeof navRef.navigate === 'function') {
      try {
        navRef.navigate('Home');
      } catch (_) {}
    }
    onRetry?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback, onRetry } = this.props;
      if (Fallback) {
        return <Fallback error={this.state.error} onRetry={this.handleRetry} />;
      }
      const err = this.state.error;
      const message = err?.message;
      const safeMessage = typeof message === 'string' ? message : (err ? String(err) : 'Unknown error');
      const stack = typeof err?.stack === 'string' ? err.stack : '';
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{safeMessage}</Text>
          {stack ? (
            <ScrollView style={styles.stackScroll} contentContainerStyle={styles.stackContent}>
              <Text style={styles.stackText} selectable>{stack}</Text>
            </ScrollView>
          ) : null}
          <TouchableOpacity style={styles.button} onPress={onRetry || this.handleRetry} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  stackScroll: { maxHeight: 120, width: '100%', marginBottom: 16 },
  stackContent: { padding: 8 },
  stackText: { fontSize: 11, color: '#6b7280', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
