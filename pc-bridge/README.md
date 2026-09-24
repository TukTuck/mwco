<!-- SPDX-License-Identifier: MIT -->
# Agent Deck – PC-Bridge

Desktop-App für das Agent Deck System. Verbindet lokale KI-Modelle (Paul + Orchestrator) mit einem Grid-basierten UI, einem MCP-Bus für Tool-Kommunikation, und einer SQLite-Datenbank für Persistenz.

> **Status:** Grundgerüst fertig, UI-Design noch Placeholder. Siehe [ROADMAP.md](docs/ROADMAP.md).

---

## Was ist das?

Agent Deck ist ein Multi-Agenten-Orchestrierungssystem. Die PC-Bridge ist der **lokale Server** der auf dem Windows-PC läuft und:

1. **Paul** bereitstellt – ein Allrounder-Assistent (Qwen2.5-7B) mit Terminal-, Datei- und Git-Zugriff
2. **Den Orchestrator** bereitstellt – ein spezialisiertes Modell (Qwen2.5-1.5B) das Blueprints in Tasks zerlegt
3. **Ein Grid-UI** bietet – 4×3 Layout mit verschiebbaren Fenstern (Paul, Terminal, Orchestrator, Logs, WebChat)
4. **Die Android-App** anbindet – WebSocket-Server empfängt Tasks vom Handy
5. **Hub/Worker** unterstützt – verteilte Task-Ausführung über Tailscale

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Desktop App                      │
├─────────────────────────────────────────────────────────────┤
│  React UI (Grid)  │  Paul (7B)  │  Orchestrator (1.5B)      │
│  4×3 Grid-Layout  │  MCP-Brücke │  Blueprint→Tasks          │
│  Auto-Sort        │  Voice I/O  │  Dependency-Graph         │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │     MCP-Bus       │
                    │  (9 Built-in      │
                    │   Tools)          │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
    │ SQLite DB      │ │ WebSocket │ │ Hub Service │
    │ (9 Tabellen)   │ │ (Port     │ │ (Port 8766) │
    │ optional       │ │ 8765)     │ │ Workers     │
    └────────────────┘ └─────┬─────┘ └─────────────┘
                             │
                    ┌────────▼────────┐
                    │  Android App    │
                    │  (Ktor Client)  │
                    └─────────────────┘
```

Siehe [docs/FINALE_ARCHITEKTUR.md](docs/FINALE_ARCHITEKTUR.md) für die ausführliche Architektur.

---

## Voraussetzungen

| Anforderung | Minimum | Empfohlen |
|-------------|---------|-----------|
| OS | Windows 10 | Windows 11 |
| RAM | 8 GB | 16 GB |
| VRAM (GPU) | 8 GB | 12 GB |
| Node.js | 20.x | 22.x LTS |
| Ollama | Latest | Latest |
| Build Tools | VS Build Tools | VS Build Tools |

### Windows Build Tools installieren

better-sqlite3 braucht C++ Compilation:

```powershell
# Option 1: Chocolatey
choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools"

# Option 2: Manuell
# https://visualstudio.microsoft.com/de/visual-cpp-build-tools/
# "Desktopentwicklung mit C++" auswählen
```

### Ollama + Modelle

```powershell
# Ollama installieren: https://ollama.com/download
ollama pull qwen2.5:7b-instruct-q4_K_M    # Paul (~4.5GB)
ollama pull qwen2.5:1.5b-instruct-q4_K_M   # Orchestrator (~900MB)
```

---

## Installation

```bash
# Repository klonen
git clone https://github.com/TukTuck/mwco.git
cd mwco/pc-bridge

# Dependencies installieren (kompiliert better-sqlite3 nativ)
npm install

# Prüfen ob alles funktioniert
npm test
```

---

## Nutzung

### Development

```bash
# Backend + UI parallel starten (Hot-Reload)
npm run dev

# Nur Backend (WebSocket-Server auf Port 8765)
npm run dev:server

# Nur UI (Vite Dev-Server auf Port 5173)
npm run dev:ui
```

### Production Build

```bash
# TypeScript + UI kompilieren
npm run build:all

# Electron starten
npm start

# Windows Installer erstellen (.exe + Portable)
npm run package
```

### Tests

```bash
npm test          # Alle Tests (16/25 bestanden)
npm run test:watch  # Watch-Mode
```

**Test-Ergebnisse:**
- MCP-Bus: 8/8 ✅
- Paul Engine: 5/5 ✅
- Hub Service: 3/3 ✅
- Database: 9/9 ⚠️ (brauchen native better-sqlite3 Bindings)

---

## Konfiguration

### config/default.json

```json
{
  "server": {
    "port": 8765,
    "host": "0.0.0.0",
    "maxConnections": 5
  },
  "security": {
    "requireAuth": true,
    "authToken": "",
    "blockedPaths": ["~/.ssh", "~/.gnupg", "~/.aws"],
    "allowShellExecution": true,
    "maxOutputSize": 1048576,
    "executionTimeout": 300000
  },
  "database": {
    "path": "data/agentdeck.db",
    "walMode": true
  }
}
```

### Überschreibungen

Erstelle `config/local.json` (nicht im Git):

```json
{
  "security": {
    "authToken": "mein-geheimer-token"
  }
}
```

---

## VRAM-Budget (8GB Minimum)

| Komponente | VRAM | Modell |
|-----------|------|--------|
| Paul | ~4.5 GB | Qwen2.5-7B-Instruct Q4_K_M |
| Orchestrator | ~0.9 GB | Qwen2.5-1.5B-Instruct Q4_K_M |
| Whisper STT | ~0.5 GB | faster-whisper small |
| UI + Reserve | ~2.1 GB | – |
| **Gesamt** | **~8.0 GB** | |

---

## Hotkey

`Ctrl+Shift+P` → Agent Deck fokussieren / Paul aktivieren

---

## Projektstruktur

Siehe [docs/CODE_MAP.md](docs/CODE_MAP.md) für eine vollständige Dateiliste mit Beschreibungen.

---

## Dokumentation

| Datei | Inhalt |
|-------|--------|
| [CODE_MAP.md](docs/CODE_MAP.md) | Jede Datei: was sie macht, warum sie existiert |
| [DECISIONS.md](docs/DECISIONS.md) | Design-Entscheidungen mit Begründung |
| [ROADMAP.md](docs/ROADMAP.md) | Status, was fertig ist, was als nächstes kommt |
| [PROTOCOL.md](docs/PROTOCOL.md) | WebSocket + MCP-Bus + IPC Protokoll-Spezifikation |
| [FINALE_ARCHITEKTUR.md](docs/FINALE_ARCHITEKTUR.md) | Gesamtarchitektur (frühe Planung) |
| [PAUL_SPEC.md](docs/PAUL_SPEC.md) | Paul-Spezifikation (LLM + Voice + MCP) |
| [UI_LAYOUT_SPEC.md](docs/UI_LAYOUT_SPEC.md) | Grid-Layout-Spezifikation |
| [VISION_ZUSAMMENFASSUNG.md](docs/VISION_ZUSAMMENFASSUNG.md) | Projektvision |

---

## Lizenz

MIT License – Copyright 2026 TukTuck

Siehe [LICENSE](../LICENSE) im Repository-Root.
