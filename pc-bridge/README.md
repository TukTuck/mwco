# Agent Deck PC-Bridge

WebSocket-Server für Windows/Linux/macOS, der Tasks von der Agent Deck Android-App empfängt und lokal ausführt.

## Was macht die Bridge?

Die Bridge ist der **Arm der Android-App auf dem PC**. Das Handy orchestriert, der PC führt aus.

```
Android App  ──WebSocket──▶  PC-Bridge  ──▶  Terminal, Dateisystem, Git
```

## Features

| Feature | Beschreibung |
|---------|--------------|
| **Terminal** | Shell-Befehle ausführen (PowerShell, cmd, bash) |
| **Dateisystem** | Dateien lesen, schreiben, auflisten, durchsuchen |
| **Git** | Status, Diff, Log, Add, Commit |
| **Sicherheit** | Blockierte Pfade (~/.ssh etc.), Auth-Token, Timeout |
| **Discovery** | mDNS – Android-App findet Bridge automatisch im LAN |

## Schnellstart

### 1. Installieren

```bash
cd pc-bridge
npm install
```

### 2. Konfigurieren

Auth-Token setzen in `config/local.json`:

```json
{
  "security": {
    "authToken": "mein-geheimer-token"
  },
  "workspace": {
    "defaultPath": "C:\\Users\\DeinName\\Projekte"
  }
}
```

### 3. Starten

```bash
# Development (mit Hot-Reload)
npm run dev

# Production
npm run build
npm start
```

### 4. Verbinden

In der Android-App: Settings → PC-Bridge → IP-Adresse des PCs eingeben (oder automatisch via mDNS).

## Technologie-Entscheidung

**Warum Node.js + TypeScript?**

| Option | Warum nicht? |
|--------|-------------|
| Rust | Beste Wahl für Performance, aber komplexeres Setup |
| Python | Braucht Runtime-Installation auf Windows |
| Electron | Zu groß (~150MB), Bridge braucht kein UI |
| C#/.NET | Weniger cross-platform |

Node.js ist:
- ✅ Auf allen Plattformen verfügbar
- ✅ Hervorragende WebSocket-Unterstützung (`ws`)
- ✅ `node-pty` für Terminal-Emulation
- ✅ Kann später in Electron/Tauri eingebettet werden
- ✅ npm-Ökosystem für alle nötigen Tools

## Sicherheit

Die Bridge hat mehrere Sicherheitsebenen:

1. **Auth-Token** – Nur autorisierte Geräte können verbinden
2. **Blockierte Pfade** – `~/.ssh`, `~/.aws`, `~/.gnupg` etc. sind tabu
3. **Shell-Toggle** – Shell-Ausführung kann komplett deaktiviert werden
4. **Output-Limit** – Max 1MB Output pro Befehl
5. **Timeout** – Max 5 Minuten pro Befehl
6. **Max Connections** – Max 5 gleichzeitige Verbindungen

## Protokoll

Siehe [`docs/PROTOCOL.md`](docs/PROTOCOL.md) für die vollständige WebSocket-Protokoll-Spezifikation.

## Projektstruktur

```
pc-bridge/
├── src/
│   ├── index.ts              # Entry Point + Logger
│   ├── config/
│   │   └── Config.ts         # Konfiguration laden
│   ├── server/
│   │   ├── WebSocketServer.ts # WebSocket-Server + Auth
│   │   ├── MessageHandler.ts  # Task-Verarbeitung
│   │   └── Protocol.ts       # Typisierte Protokoll-Definitionen
│   └── bridge/
│       ├── TerminalBridge.ts  # Shell-Befehle ausführen
│       ├── FileSystemBridge.ts # Datei-Operationen
│       └── GitBridge.ts       # Git-Operationen
├── config/
│   ├── default.json          # Default-Konfiguration
│   └── local.json            # Lokale Overrides (nicht im Git)
└── docs/
    └── PROTOCOL.md           # WebSocket-Protokoll-Spezifikation
```

## Build für Windows

Für eine standalone `.exe` (ohne Node.js-Installation):

```bash
# Option 1: pkg (einfach)
npx pkg . --targets node22-win-x64 --output agent-deck-bridge.exe

# Option 2: nexe (kleiner)
npx nexe --build --target windows-x64 --output agent-deck-bridge.exe
```

## Roadmap

- [ ] System-Tray Icon (Windows)
- [ ] Auto-Start mit Windows
- [ ] TLS/WSS Support
- [ ] Ollama-Integration (lokale LLMs auf dem PC)
- [ ] Code-Execution Sandbox
- [ ] Screen-Sharing für Debugging
