import React from 'react';
import { registerRootComponent } from 'expo';

import App from './App';
import RootErrorBoundary from './src/components/RootErrorBoundary';

function Root() {
  return (
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
}

registerRootComponent(Root);
