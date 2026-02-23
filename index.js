import React from 'react';
import { LogBox } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';
import RootErrorBoundary from './src/components/RootErrorBoundary';

// Suppress AuthApiError snackbar when refresh token is invalid (we handle sign-out in AuthContext)
LogBox.ignoreLogs(['AuthApiError', 'Invalid Refresh Token', 'Refresh T']);

// Catch unhandled auth rejections and sign out silently (prevents error snackbar)
if (typeof global !== 'undefined' && global.addEventListener) {
  global.addEventListener('unhandledrejection', (event) => {
    const msg = (event?.reason?.message || String(event?.reason || ''));
    if (msg.includes('AuthApiError') || msg.includes('Invalid Refresh Token') || msg.includes('refresh_token')) {
      event.preventDefault?.();
      const { supabase } = require('./src/lib/supabase');
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    }
  });
}

function Root() {
  return (
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
}

registerRootComponent(Root);
