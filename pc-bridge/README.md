# Agent Deck PC-Bridge

Desktop-App für Agent Deck – Electron + React + TypeScript.

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Desktop App                      │
├─────────────────────────────────────────────────────────────┤
│  React UI (Grid)  │  Paul (7B)  │  Orchestrator (1.5B)      │
│  4×3 Grid-Layout  │  MCP-Brücke │  Blueprint→Tasks          │
│  Auto-Sort        │  Voice I/O  │  Dependency-Graph         │
│  Dark Mode        │  Tool-Calls │  Dispatch                 │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │     MCP-Bus       │
                    │  (Tool Registry)  │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
    │ SQLite DB      │ │ WebSocket │ │ Hub Service │
    │ (9 Tabellen)   │ │ (Port     │ │ (Port 8766) │
    │ Audit-Log      │ │ 8765)     │ │ Workers     │
    └────────────────┘ └─────┬─────┘ └─────────────┘
                             │
                    ┌────────▼────────┐
                    │  Android App    │
                    └─────────────────┘
```

## Features

### Stream A: Electron + Grid UI
- 4×3 CSS-Grid mit Drag&Drop, Resize, Pin, Minimize
- Auto-Sort Presets: Vollbild, 50/50, 2+1, 2×2
- Farbcodierung: 🔵🟣🟢🟡🟠🔴⚪ pro Zelle
- Dark Mode (Shadcn-Style), Inter + JetBrains Mono
- Custom Titlebar mit Window Controls

### Stream B: SQLite + MCP-Bus
- 9 Tabellen: sessions, messages, tasks, blueprints, agents, audit_log, layouts, plugins, brain
- MCP-Bus: Event-basierte Kommunikation zwischen Fenster-Knoten
- 9 Built-in Tools: execute_command, read_file, write_file, list_files, search_files, git_status, git_diff, git_log, git_commit

### Stream C: Paul + Orchestrator
- **Paul**: Qwen2.5-7B Q4 (~4.5GB VRAM), MCP-Brücke, Whisper STT, Piper TTS
- **Orchestrator**: Qwen2.5-1.5B Q4 (~900MB VRAM), Blueprint→Task-Decomposition
- Tool-Call Parsing: `[TOOL:name]{...}[/TOOL]`
- Chat-History mit Thinking-Anzeige

### Stream D: Hub/Worker
- Hub Service: WebSocket-Server für verteilte Task-Dispatch
- Worker Registration mit Capability-Advertisement
- Task Queue mit Capability-Matching, Heartbeat-Monitoring
- Tailscale-ready (bindet auf 0.0.0.0)

## Installation

```bash
npm install
```

**Hinweis**: `better-sqlite3` braucht native Compilation (node-gyp). Auf Windows: Visual Studio Build Tools installieren.

## Development

```bash
# Backend + UI parallel starten
npm run dev

# Nur Backend
npm run dev:server

# Nur UI
npm run dev:ui
```

## Build

```bash
# TypeScript kompilieren
npm run build

# UI bauen (Vite)
npm run build:ui

# Electron starten
npm run start

# Windows Installer (.exe + Portable)
npm run package
```

## Tests

```bash
npm test
```

**16/25 Tests bestanden** (DB-Tests brauchen native better-sqlite3 Bindings)

## Konfiguration

`config/default.json` ( überschreibbar mit `config/local.json`):

```json
{
  "server": { "port": 8765, "host": "0.0.0.0" },
  "security": { "requireAuth": true, "authToken": "" },
  "database": { "path": "data/agentdeck.db", "walMode": true }
}
```

## VRAM-Budget (8GB Minimum)

- 4.5GB Paul (Qwen2.5-7B Q4)
- 0.5GB Whisper STT
- 1.0GB Orchestrator (Qwen2.5-1.5B Q4)
- 2.0GB UI + Reserve

## Hotkey

`Ctrl+Shift+P` → Paul fokussieren / togglen

## Lizenz

MIT License – Copyright 2026 TukTuck
