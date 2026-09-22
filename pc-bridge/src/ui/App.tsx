// SPDX-License-Identifier: MIT
/**
 * App – Root-Komponente der Agent Deck UI.
 */

import React, { useState, useCallback } from 'react';
import { Grid } from './components/Grid';
import { Toolbar } from './components/Toolbar';
import { createGridStore, type GridState } from './store/gridStore';

export function App() {
  const [state] = useState<GridState>(() => createGridStore());
  const [, forceUpdate] = useState(0);

  // Re-render bei State-Änderungen (simple Lösung ohne externe Library)
  const rerender = useCallback(() => forceUpdate((n) => n + 1), []);

  // Wrap alle State-Methoden mit re-render
  const wrappedState: GridState = new Proxy(state, {
    get(target, prop) {
      const val = (target as any)[prop];
      if (typeof val === 'function') {
        return (...args: any[]) => {
          const result = val.apply(target, args);
          rerender();
          return result;
        };
      }
      return val;
    },
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#0a0a0a',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <Toolbar state={wrappedState} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Grid state={wrappedState} />
      </div>
    </div>
  );
}
