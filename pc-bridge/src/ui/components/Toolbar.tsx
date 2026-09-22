// SPDX-License-Identifier: MIT
/**
 * Toolbar – obere Leiste mit Window-Controls, Auto-Sort und Layout-Management.
 */

import React from 'react';
import { AUTO_SORT_PRESETS, CELL_COLORS, type CellType, type GridState } from '../store/gridStore';

interface ToolbarProps {
  state: GridState;
}

export function Toolbar({ state }: ToolbarProps) {
  const [showAddMenu, setShowAddMenu] = React.useState(false);
  const [showSortMenu, setShowSortMenu] = React.useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '4px 12px',
        backgroundColor: '#111',
        borderBottom: '1px solid #1f1f1f',
        height: '36px',
        gap: '8px',
        userSelect: 'none',
        WebkitAppRegion: 'drag' as any,
      }}
    >
      {/* ── Logo ────────────────────────── */}
      <span style={{ fontWeight: 700, fontSize: '13px', color: '#e0e0e0', fontFamily: 'Inter, sans-serif' }}>
        ⬡ Agent Deck
      </span>

      <div style={{ flex: 1 }} />

      {/* ── Auto-Sort ────────────────────────── */}
      <div style={{ position: 'relative', WebkitAppRegion: 'no-drag' as any }}>
        <button
          onClick={() => { setShowSortMenu(!showSortMenu); setShowAddMenu(false); }}
          style={toolbarButtonStyle}
        >
          ⊞ Sort
        </button>
        {showSortMenu && (
          <div style={dropdownStyle}>
            {AUTO_SORT_PRESETS.map((preset, i) => (
              <button
                key={preset.name}
                onClick={() => { state.autoSort(i); setShowSortMenu(false); }}
                style={dropdownItemStyle}
              >
                <span style={{ fontWeight: 600 }}>{preset.name}</span>
                <span style={{ fontSize: '11px', color: '#888' }}>{preset.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Window ────────────────────────── */}
      <div style={{ position: 'relative', WebkitAppRegion: 'no-drag' as any }}>
        <button
          onClick={() => { setShowAddMenu(!showAddMenu); setShowSortMenu(false); }}
          style={{ ...toolbarButtonStyle, backgroundColor: '#1d4ed8', color: 'white' }}
        >
          + Neu
        </button>
        {showAddMenu && (
          <div style={dropdownStyle}>
            {(['terminal', 'webchat', 'logs', 'blank'] as CellType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  const titles: Record<string, string> = {
                    terminal: 'Terminal',
                    webchat: 'WebChat',
                    logs: 'Logs',
                    blank: 'Leer',
                  };
                  state.addCell(type, titles[type] || type, CELL_COLORS[Math.floor(Math.random() * CELL_COLORS.length)]);
                  setShowAddMenu(false);
                }}
                style={dropdownItemStyle}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Layout Save ────────────────────────── */}
      <button
        style={{ ...toolbarButtonStyle, WebkitAppRegion: 'no-drag' as any }}
        onClick={() => {
          const layout = state.getLayout();
          console.log('Layout speichern:', layout);
          // TODO: Über IPC an DB senden
        }}
      >
        💾
      </button>

      {/* ── Window Controls ────────────────────────── */}
      <div style={{ display: 'flex', gap: '2px', marginLeft: '8px', WebkitAppRegion: 'no-drag' as any }}>
        <button onClick={() => (window as any).agentDeck?.window?.minimize()} style={windowButtonStyle}>─</button>
        <button onClick={() => (window as any).agentDeck?.window?.maximize()} style={windowButtonStyle}>□</button>
        <button
          onClick={() => (window as any).agentDeck?.window?.close()}
          style={{ ...windowButtonStyle, color: '#ef4444' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────

const toolbarButtonStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '4px',
  border: '1px solid #333',
  backgroundColor: '#1a1a1a',
  color: '#ccc',
  fontSize: '12px',
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
};

const windowButtonStyle: React.CSSProperties = {
  width: '28px',
  height: '24px',
  border: 'none',
  backgroundColor: 'transparent',
  color: '#888',
  fontSize: '11px',
  cursor: 'pointer',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: '4px',
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '6px',
  padding: '4px',
  zIndex: 1000,
  minWidth: '160px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
};

const dropdownItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  padding: '8px 12px',
  border: 'none',
  backgroundColor: 'transparent',
  color: '#ccc',
  fontSize: '13px',
  cursor: 'pointer',
  borderRadius: '4px',
  textAlign: 'left',
  fontFamily: 'Inter, sans-serif',
};
