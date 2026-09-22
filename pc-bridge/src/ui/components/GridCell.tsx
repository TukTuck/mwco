// SPDX-License-Identifier: MIT
/**
 * GridCell – einzelne Zelle im Grid.
 *
 * Features:
 * - Farbcodierter Header (Cell-Color)
 * - Pin/Minimize/Close Buttons
 * - Drag-Handle am Header
 * - Resize-Handle unten rechts
 * - Content je nach Cell-Type (Paul, Terminal, WebChat, Logs)
 */

import React from 'react';
import {
  type GridCell,
  COLOR_HEX,
  GRID_COLS,
  GRID_ROWS,
} from '../store/gridStore';
import { PaulPanel } from './PaulPanel';

interface GridCellProps {
  cell: GridCell;
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
  onPin: () => void;
  onMinimize: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}

export function GridCellComponent({
  cell,
  isSelected,
  onSelect,
  onClose,
  onPin,
  onMinimize,
  onDragStart,
}: GridCellProps) {
  const borderColor = COLOR_HEX[cell.color];

  return (
    <div
      onClick={onSelect}
      style={{
        gridColumn: `${cell.col + 1} / span ${cell.colSpan}`,
        gridRow: `${cell.row + 1} / span ${cell.rowSpan}`,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '8px',
        overflow: 'hidden',
        border: `2px solid ${isSelected ? borderColor : '#1f1f1f'}`,
        backgroundColor: '#111111',
        transition: 'border-color 0.15s ease',
        cursor: 'default',
      }}
    >
      {/* ── Header ────────────────────────── */}
      <div
        onMouseDown={onDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 10px',
          backgroundColor: '#1a1a1a',
          borderBottom: `1px solid ${borderColor}40`,
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        {/* Color Indicator */}
        <span style={{ marginRight: '8px', fontSize: '12px' }}>{cell.color}</span>

        {/* Title */}
        <span
          style={{
            flex: 1,
            fontSize: '12px',
            fontWeight: 600,
            color: '#e0e0e0',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {cell.title}
        </span>

        {/* Pin Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onPin(); }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            fontSize: '12px',
            color: cell.pinned ? borderColor : '#555',
            opacity: cell.pinned ? 1 : 0.5,
          }}
          title={cell.pinned ? 'Entpinnen' : 'Anpinnen'}
        >
          📌
        </button>

        {/* Minimize Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onMinimize(); }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            fontSize: '11px',
            color: '#666',
          }}
          title="Minimieren"
        >
          ─
        </button>

        {/* Close Button (nicht für gepinnte) */}
        {!cell.pinned && (
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
              fontSize: '11px',
              color: '#666',
            }}
            title="Schließen"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Content ────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        <CellContent cell={cell} />
      </div>
    </div>
  );
}

// ── Cell Content je nach Typ ──────────────────────────────────

function CellContent({ cell }: { cell: GridCell }) {
  switch (cell.type) {
    case 'paul':
      return <PaulContent />;
    case 'orchestrator':
      return <OrchestratorContent />;
    case 'terminal':
      return <TerminalContent />;
    case 'webchat':
      return <WebChatContent cell={cell} />;
    case 'logs':
      return <LogsContent />;
    default:
      return (
        <div style={{ color: '#555', fontSize: '13px', textAlign: 'center', paddingTop: '20px' }}>
          Leeres Fenster
        </div>
      );
  }
}

function PaulContent() {
  return <PaulPanel />;
}

function OrchestratorContent() {
  return (
    <div style={{ fontSize: '13px', color: '#ccc' }}>
      <div style={{ padding: '8px', backgroundColor: '#1a1a1a', borderRadius: '6px', marginBottom: '8px' }}>
        <span style={{ color: '#8b5cf6', fontWeight: 600 }}>Orchestrator:</span> Bereit.
        Warte auf Blueprint...
      </div>
      <div style={{ color: '#666', fontSize: '11px' }}>
        Task-Graph: Keine aktiven Tasks
      </div>
    </div>
  );
}

function TerminalContent() {
  return (
    <div
      style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '12px',
        color: '#22c55e',
        backgroundColor: '#0a0a0a',
        padding: '8px',
        borderRadius: '4px',
        height: '100%',
        overflow: 'auto',
      }}
    >
      <div>$ agent-deck --status</div>
      <div style={{ color: '#666' }}>Bridge: Online | MCP-Bus: 9 Tools | DB: Connected</div>
      <div>$ <span style={{ animation: 'blink 1s step-end infinite' }}>▊</span></div>
    </div>
  );
}

function WebChatContent({ cell }: { cell: GridCell }) {
  return (
    <div style={{ fontSize: '13px', color: '#ccc' }}>
      <div
        style={{
          padding: '8px',
          backgroundColor: '#1a1a1a',
          borderRadius: '6px',
          border: '1px solid #333',
        }}
      >
        <span style={{ color: '#eab308' }}>⚠️ WebChat</span> – Kein MCP-Zugriff.
        Nur Chat-Interface.
      </div>
      <div style={{ marginTop: '8px', color: '#666', fontSize: '11px' }}>
        Provider: {(cell.config.provider as string) || 'Nicht konfiguriert'}
      </div>
    </div>
  );
}

function LogsContent() {
  const demoLogs = [
    { level: 'INFO', time: '00:40:12', msg: 'Bridge Server läuft auf ws://0.0.0.0:8765' },
    { level: 'INFO', time: '00:40:12', msg: 'MCP-Bus bereit (9 Tools auf Pauls Knoten)' },
    { level: 'INFO', time: '00:40:11', msg: 'SQLite-Datenbank bereit (WAL-Mode)' },
    { level: 'INFO', time: '00:40:11', msg: 'Konfiguration geladen (Port: 8765)' },
    { level: 'INFO', time: '00:40:11', msg: 'Agent Deck PC-Bridge startet...' },
  ];

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
      {demoLogs.map((log, i) => (
        <div key={i} style={{ display: 'flex', gap: '8px', padding: '2px 0' }}>
          <span style={{ color: '#555' }}>{log.time}</span>
          <span
            style={{
              color: log.level === 'ERROR' ? '#ef4444' : log.level === 'WARN' ? '#eab308' : '#3b82f6',
              width: '40px',
            }}
          >
            {log.level}
          </span>
          <span style={{ color: '#aaa' }}>{log.msg}</span>
        </div>
      ))}
    </div>
  );
}
