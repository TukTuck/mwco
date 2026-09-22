<!-- SPDX-License-Identifier: MIT -->
# Roadmap – Agent Deck PC-Bridge

Stand: 22. September 2026

---

## Status-Übersicht

| Stream | Beschreibung | Status | Branch |
|--------|-------------|--------|--------|
| **A** | Electron + **Kartentisch-UI** (ersetzt Grid) | ✅ Neue UI gebaut, testbar | `arena/01a0c3a9-mwco` |
| **B** | SQLite + MCP-Bus | ✅ Fertig | `arena/01a0c3a9-mwco` |
| **C** | Paul + Orchestrator | ✅ Grundgerüst fertig | `arena/01a0c3a9-mwco` |
| **D** | Hub / Worker | ✅ Grundgerüst fertig | `arena/01a0c3a9-mwco` |
| **Mobile** | Android-App (Kotlin) | ✅ Grundgerüst fertig | `arena/01a0c3a9-mwco` |

---

## Was FERTIG ist ✅

### Backend (Stream B)
- SQLite-Datenbank mit 9 Tabellen (sessions, messages, tasks, blueprints, agents, audit_log, layouts, plugins, brain)
- 6 Repositories (Session, Message, Task, Blueprint, Audit, Layout) mit CRUD + Spezialfunktionen
- MCP-Bus mit Event-System, Tool-Registry, Message-Log
- 9 Built-in MCP-Tools (Terminal, FileSystem, Git)
- WebSocket-Server (Port 8765) für Android-App
- Graceful Degradation: Server läuft auch ohne SQLite
- Audit-Logging für alle Aktionen
- 16/25 Tests bestanden

### UI (Stream A)
- Electron Main Process mit IPC
- Preload Script mit sicherer Context Bridge
- 4×3 CSS-Grid Layout-System
- Auto-Sort Presets (Vollbild, 50/50, 2+1, 2×2)
- Farbcodierung pro Zelle (7 Farben)
- Dark Mode (Shadcn-Style)
- Custom Titlebar (frameless)
- Vite Build (158KB JS + 5.7KB CSS)
- Tailwind CSS mit Custom Utilities

### Paul + Orchestrator (Stream C)
- PaulEngine: Ollama LLM Chat (Qwen2.5-7B Q4)
- Tool-Call Parsing: `[TOOL:name]{...}[/TOOL]` → MCP-Bus
- Whisper STT + Piper TTS (Interface, Services separat)
- Chat-History mit Thinking-Anzeige
- OrchestratorEngine: Blueprint → Task-Decomposition (Qwen2.5-1.5B Q4)
- Dependency-Graph Execution mit Retry-Logik
- PaulPanel: Chat-Interface mit IPC-Integration

### Hub / Worker (Stream D)
- HubService: WebSocket-Server (Port 8766) für verteilte Worker
- Worker-Registrierung mit Capability-Advertisement
- Task-Queue mit Capability-Matching
- Heartbeat-Monitoring (90s Timeout → Re-Queue)
- WorkerClient: Auto-Reconnect, Task-Ausführung
- Tailscale-ready (bindet auf 0.0.0.0)

### Android-App
- Dashboard mit Schnellzugriff (6 Tiles)
- AgentConfigScreen (API-Key-Management mit SecureKeyStore)
- ResultViewerScreen (CODE/JSON/TEXT/FILE/ERROR)
- LogViewerScreen (Level-Filter + Suche)
- Blueprint Editor
- Task Graph Viewer
- LLM Settings (Provider-Auswahl)
- Orchestration Engine + State Machine
- 6 Unit-Test-Klassen

### Build-System
- TypeScript kompiliert fehlerfrei (strict mode)
- Vite Production Build funktioniert
- Backend startet erfolgreich (auch ohne native DB)
- Dependencies vollständig deklariert
- electron-builder Config für Windows Installer

---

## Was als NÄCHSTES kommt 🔜

### Phase 1: Lauffähig machen (aktuell)
- [ ] `npm install` auf Windows testen (better-sqlite3 native Compilation)
- [ ] Ollama lokal installieren + Qwen2.5-7B und 1.5B laden
- [ ] `npm run dev` End-to-End testen (Vite + Backend + Electron)
- [ ] UI-Design Rework mit User zusammen (aktuell nur Placeholder-Design)

### Phase 2: Drag&Drop + Resize
- [ ] Echte Drag&Drop-Implementierung (react-dnd oder @dnd-kit)
- [ ] Resize-Handles an Grid-Zellen
- [ ] Layout-Speicherung über IPC → SQLite
- [ ] Layout-Laden beim Start

### Phase 3: Paul voll funktionsfähig
- [ ] Ollama-Integration testen und debuggen
- [ ] Whisper STT Service aufsetzen (faster-whisper lokal)
- [ ] Piper TTS Service aufsetzen
- [ ] Voice-Toggle im UI (Mikrofon-Button)
- [ ] Tool-Call-Ergebnisse schön darstellen (nicht nur JSON)

### Phase 4: Orchestrator voll funktionsfähig
- [ ] Blueprint-Editor im UI (Markdown oder strukturiert)
- [ ] Task-Graph Visualisierung (Knoten + Kanten)
- [ ] Retry-UI (fehlgeschlagene Tasks nochmal versuchen)
- [ ] Blockade-UI (User-Fragen bei Unklarheit)

### Phase 5: Hub/Worker produktiv
- [ ] Worker auf zweitem PC testen
- [ ] Tailscale-Setup dokumentieren
- [ ] Worker-Capability-Detection (automatisch GPU/CPU erkennen)
- [ ] Task-Fortschritt im UI anzeigen

### Phase 6: Polish + Distribution
- [ ] Auto-Update Mechanismus
- [ ] Windows Installer testen (.exe + NSIS)
- [ ] Portable .exe testen
- [ ] Winget Package vorbereiten
- [ ] Tray-Icon mit Status-Anzeige
- [ ] Settings-Dialog (Config bearbeiten ohne JSON-Datei)

---

## Bekannte Probleme / Schulden

1. **UI-Design ist Placeholder** – muss mit User zusammen überarbeitet werden (Farben, Layout, Typografie). Design entstand nicht durch Zweck, sondern durch Code-Struktur. → Rework nötig.

2. **Drag&Drop nur Placeholder** – Grid-Zellen können noch nicht wirklich verschoben oder resized werden.

3. **Whisper/Piper sind nur Interfaces** – die eigentlichen Services (faster-whisper, piper) müssen separat aufgesetzt werden.

4. **Kein Error Boundary in React** – wenn eine Komponente crasht, crasht die ganze UI.

5. **better-sqlite3 braucht Build Tools** – auf Windows müssen Visual Studio Build Tools installiert sein. Könnte durch prebuilt binaries oder sql.js Fallback verbessert werden.

6. **Terminal ist kein echtes PTY** – nutzt `child_process.exec` (one-shot), kein persistentes Terminal mit node-pty. Für echte interaktive Shells müsste node-pty eingebaut werden.
