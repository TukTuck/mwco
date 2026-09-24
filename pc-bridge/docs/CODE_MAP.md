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
│   └── ui/                    # React Frontend (Vite) – Kartentisch-UI
│       ├── index.html         # Entry HTML
│       ├── main.tsx           # React Root + CSS Import
│       ├── index.css          # Gesamtes Theme (warmes Dunkel, Glas, eckig)
│       ├── App.tsx            # Root: Sidebar + Topbar + Ansicht + Launcher-Hotkey
│       ├── data.ts            # Karten-Metadaten + Demo-Daten (Logs, Tasks, Routen)
│       ├── bridge.ts          # EIN Modul UI↔Backend (agentDeck/IPC, sonst Stub-Fallback)
│       ├── useBridge.ts       # Hook: lädt echte Daten über bridge, sonst Fallback
│       ├── assets/
│       │   └── paul.png       # Paul-Avatar (Alien-Platzhalter)
│       ├── components/
│       │   ├── Sidebar.tsx    # Linke Leiste: Navigation + Paul-Profil
│       │   ├── Topbar.tsx     # Obere Leiste: Titel, Zoom, Verbindung, Paul-Button
│       │   ├── Launcher.tsx   # Paul-Launcher (Ctrl+Shift+P Overlay)
│       │   └── tisch/
│       │       ├── TischView.tsx # Kartentisch: zoom/pan, Karten, Fenster, Linien
│       │       └── CardBody.tsx  # Karten-Inhalt (kompakt + voll)
│       │       └── Live.tsx      # Stateful Paul-Chat + Terminal (an bridge)
│       ├── store/
│       │   └── deck.ts        # zustand-Store: Ansicht, Karten, Fenster, Zoom
│       ├── views/             # Menü-Ansichten
│       │   ├── ProtokolleView.tsx
│       │   ├── EinstellungenView.tsx
│       │   ├── AustauschView.tsx
│       │   ├── TasksView.tsx
│       │   └── ZeitplanView.tsx
│       └── types/
│           ├── global.d.ts    # window.agentDeck API Typen
│           └── assets.d.ts    # Bild-Import-Deklarationen (*.png/*.svg)
├── design/                    # Eingefrorener Design-Prototyp (Referenz)
│   ├── index.html             # Kartentisch-Prototyp (Browser, kein Build)
│   ├── DESIGN_SPEC.md         # Design-Spec + offene Punkte
│   └── assets/paul.png        # Paul-Avatar
├── tests/                     # Vitest Tests
│   ├── database/              # DB-Tests (brauchen native better-sqlite3)
│   ├── mcp/                   # MCP-Bus Tests (8/8 ✅)
│   ├── paul/                  # Paul Engine Tests (5/5 ✅)
│   └── hub/                   # Hub Service Tests (3/3 ✅)
├── docs/                      # Dokumentation
│   ├── CODE_MAP.md            # ← diese Datei
│   ├── PROTOCOL.md            # WebSocket + MCP-Bus + IPC Protokolle
│   ├── ROADMAP.md             # Status + nächste Schritte
│   └── DECISIONS.md           # Design-Entscheidungen mit Begründung
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

> **Hinweis (22.09.2026):** Die frühere Grid-UI (`Grid.tsx`, `GridCell.tsx`, `Toolbar.tsx`,
> `PaulPanel.tsx`, `gridStore.ts`) wurde durch die **Kartentisch-UI** ersetzt und entfernt.
> Die alte Planung (`FINALE_ARCHITEKTUR.md`, `UI_LAYOUT_SPEC.md` etc.) liegt unter `docs/planning/`.

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

ui/ (React Frontend – Kartentisch)
  ├── App.tsx → Sidebar / Topbar / Launcher / views/* / tisch/TischView
  ├── store/deck.ts (zustand) ← alle Komponenten
  ├── tisch/TischView.tsx → data.ts (Karten, Linien) + CardBody.tsx
  └── kommuniziert später über IPC (preload.ts) bzw. WebSocket mit dem Backend
      → aktuell Demo-Daten aus data.ts, keine direkte DB/Bus-Anbindung
```
