<!-- SPDX-License-Identifier: MIT -->
# Code Map – Agent Deck PC-Bridge

Diese Datei dokumentiert **jede Datei** im Projekt: Was sie macht, warum sie existiert, und wie sie mit anderen zusammenhängt.

## Verzeichnisstruktur

```
pc-bridge/
├── config/                    # Konfigurationsdateien
│   └── default.json           # Default-Config (Ports, Security, DB-Pfad)
├── src/
│   ├── index.ts               # Entry Point: startet Server + DB + MCP-Bus
│   ├── bridge/                # Bridges zu PC-Ressourcen
│   │   ├── TerminalBridge.ts  # Shell-Befehle ausführen
│   │   ├── FileSystemBridge.ts # Dateien lesen/schreiben/suchen
│   │   └── GitBridge.ts       # Git-Operationen (nutzt TerminalBridge)
│   ├── config/
│   │   └── Config.ts          # Config laden (default.json + local.json merge)
│   ├── database/              # SQLite-Persistenz
│   │   ├── Database.ts        # Connection + Schema (9 Tabellen)
│   │   ├── DatabaseService.ts # Zentraler Zugriff, instantiiert Repositories
│   │   └── repositories/      # CRUD pro Tabelle
│   │       ├── SessionRepository.ts
│   │       ├── MessageRepository.ts
│   │       ├── TaskRepository.ts
│   │       ├── BlueprintRepository.ts
│   │       ├── AuditRepository.ts
│   │       └── LayoutRepository.ts
│   ├── electron/              # Electron Desktop-App
│   │   ├── main.ts            # Main Process: Window, IPC, Services starten
│   │   └── preload.ts         # Context Bridge: sichere IPC-Kanäle
│   ├── hub/                   # Verteilte Task-Ausführung
│   │   ├── index.ts           # Re-Exports
│   │   ├── HubService.ts      # Hub: Worker-Registrierung + Task-Dispatch
│   │   └── WorkerClient.ts    # Worker: verbindet sich mit Hub
│   ├── mcp/                   # Model Context Protocol Bus
│   │   ├── MCPBus.ts          # Event-Bus: Knoten registrieren, Tools aufrufen
│   │   └── BuiltinTools.ts    # Wraps Bridges als MCP-Tools
│   ├── paul/                  # LLM-Engines
│   │   ├── PaulEngine.ts      # Paul: Chat + Voice + MCP-Tool-Calls
│   │   └── OrchestratorEngine.ts # Orchestrator: Blueprint→Tasks
│   ├── server/                # WebSocket-Server (Android-App)
│   │   ├── WebSocketServer.ts # Connection-Handling, Auth, Heartbeat
│   │   ├── MessageHandler.ts  # Task-Verarbeitung + DB-Persistenz
│   │   └── Protocol.ts        # TypeScript-Typen für das WS-Protokoll
│   └── ui/                    # React Frontend (Vite)
│       ├── index.html         # Entry HTML
│       ├── main.tsx           # React Root + CSS Import
│       ├── index.css          # Tailwind CSS + Custom Utilities
│       ├── App.tsx            # Root-Komponente (Grid + Toolbar)
│       ├── components/
│       │   ├── Grid.tsx       # CSS-Grid Container
│       │   ├── GridCell.tsx   # Einzelne Zelle + Content-Renderer
│       │   ├── Toolbar.tsx    # Top-Bar: Sort, Add, Layout, Window Controls
│       │   └── PaulPanel.tsx  # Paul Chat-Interface mit IPC
│       ├── store/
│       │   └── gridStore.ts   # Grid-State: Zellen, Auto-Sort, Layouts
│       └── types/
│           └── global.d.ts    # window.agentDeck API Typen
├── tests/                     # Vitest Tests
│   ├── database/              # DB-Tests (brauchen native better-sqlite3)
│   ├── mcp/                   # MCP-Bus Tests (8/8 ✅)
│   ├── paul/                  # Paul Engine Tests (5/5 ✅)
│   └── hub/                   # Hub Service Tests (3/3 ✅)
├── docs/                      # Dokumentation
│   ├── CODE_MAP.md            # ← diese Datei
│   ├── PROTOCOL.md            # WebSocket + MCP-Bus + IPC Protokolle
│   ├── ROADMAP.md             # Status + nächste Schritte
│   ├── DECISIONS.md           # Design-Entscheidungen mit Begründung
│   ├── FINALE_ARCHITEKTUR.md  # Gesamtarchitektur (frühe Planung)
│   ├── PARALLEL_PLAN.md       # 4-Stream Entwicklungsplan
│   ├── PAUL_SPEC.md           # Paul-Spezifikation
│   ├── UI_LAYOUT_SPEC.md      # Grid-Layout-Spezifikation
│   └── VISION_ZUSAMMENFASSUNG.md # Projektvision
├── assets/
│   ├── icon.png               # App-Icon (256×256, für electron-builder)
│   └── icon.svg               # SVG-Vorlage
├── package.json               # Dependencies + Scripts + electron-builder Config
├── tsconfig.json              # Backend TypeScript (NodeNext, strict)
├── vite.config.ts             # Vite für UI (React, Port 5173)
├── vitest.config.ts           # Vitest Test-Runner
├── tailwind.config.js         # Tailwind CSS Config
└── postcss.config.js          # PostCSS Config (Tailwind + Autoprefixer)
```

## Abhängigkeiten zwischen Modulen

```
index.ts (Entry Point)
  ├── Config.ts (Config laden)
  ├── DatabaseService.ts → Database.ts → Repositories
  ├── MCPBus.ts ← BuiltinTools.ts ← Bridges (Terminal, FileSystem, Git)
  └── WebSocketServer.ts → MessageHandler.ts → Bridges

electron/main.ts (Electron Entry)
  ├── alles von index.ts +
  ├── PaulEngine.ts → MCPBus (Tool-Calls)
  ├── OrchestratorEngine.ts → MCPBus (Task-Dispatch)
  └── HubService.ts (verteilte Worker)

ui/ (React Frontend)
  └── kommuniziert NUR über IPC (preload.ts) mit Main Process
      → kein direkter Zugriff auf DB, Bus, oder Bridges
```
