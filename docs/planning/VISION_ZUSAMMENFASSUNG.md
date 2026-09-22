# 🎯 Vision – Agent Deck PC-Bridge

## Zusammenfassung deiner Entscheidungen + meine Empfehlungen

---

## 1. Technologie: Electron (Node.js/TypeScript)

**Deine Wahl:** Electron, weil es mit Open WebUI zusammenpasst und cross-platform ist.

**Meine Einschätzung:** ✅ Passt perfekt.

**Warum Electron:**
- Web-Apps (ChatGPT, Claude, Arena etc.) lassen sich nativ als WebView einbetten
- Open WebUI kann direkt integriert werden
- Cross-platform (Windows, Linux, macOS)
- Riesiges npm-Ökosystem
- Desktop-App-Feeling mit eigenem Fenster, Tray-Icon, Installer

**Kompromiss:** Electron ist groß (~150MB), aber das ist akzeptabel für ein Desktop-Tool.

**.NET als Backend-Option:** Die Bridge-Logik (Terminal, Filesystem, WebSocket) könnte auch in .NET laufen, mit Electron als UI-Shell. Aber: TypeScript für alles ist einfacher und konsistenter.

**Empfehlung:** Electron + TypeScript für alles. .NET nur wenn wir später native Windows-Features brauchen (Registry, Windows Service).

---

## 2. UI: Vollständiges Dashboard

**Deine Wahl:** Dashboard mit Settings-Fenster, System-Tray.

**Konkrete UI-Struktur:**

```
┌─────────────────────────────────────────────────────────────┐
│  Agent Deck                                    _ □ X        │
├────────┬────────────────────────────────────────────────────┤
│        │                                                    │
│ 📊 Hub │   Hauptbereich (je nach Tab):                      │
│ 💬 Chat│   - Dashboard (Status, aktive Agenten, Tasks)      │
│ 🔧 Ag. │   - Chat-Panel (WebChat-Integration)               │
│ 📋 Log │   - Agenten-Verwaltung                             │
│ ⚙ Set. │   - Log-Viewer + Export                            │
│ 🧩 Plg │   - Einstellungen                                  │
│        │   - Plugins                                        │
│        │                                                    │
│        │   ┌─────────────────────────────────────────┐      │
│        │   │  WebChat-Fenster (eingebettet)           │      │
│        │   │  Claude / ChatGPT / Arena / Custom       │      │
│        │   │  ←→ Pop-out als eigenständiges Fenster   │      │
│        │   └─────────────────────────────────────────┘      │
│        │                                                    │
├────────┴────────────────────────────────────────────────────┤
│  🔗 Hub: verbunden │ Agenten: 3 aktiv │ Tasks: 2 laufend   │
└─────────────────────────────────────────────────────────────┘
```

**Tabs:**
1. **Dashboard** – Übersicht: verbundene Geräte, aktive Agenten, laufende Tasks
2. **Chat** – WebChats eingebettet (ChatGPT, Claude, Arena, etc.) mit Pop-out
3. **Agenten** – Agenten verwalten, konfigurieren, starten/stoppen
4. **Logs** – Vollständiger Log-Viewer mit Suche, Filter, Export, Vergleich
5. **Einstellungen** – Provider, Sicherheit, Hub-Konfiguration, UI-Theme
6. **Plugins** – Installierte Plugins, Plugin-Store

---

## 3. WebChat-Fenster-System (WebCatalog-Prinzip)

**Deine Idee:** WebChats als eigenständige Fenster rauspoppen und in vorbereitete Plätze einfügen.

**Gefundenes Tool:** [WebCatalog](https://webcatalog.io) macht genau das – verwandelt jede Web-App in ein eigenständiges Desktop-Fenster mit eigenem Login.

**Was wir bauen:**

```
┌─ Agent Deck Hauptfenster ──────────────────────────────────┐
│                                                             │
│  ┌── ChatGPT ──┐  ┌── Claude ──┐  ┌── Arena ──┐          │
│  │  (WebView)  │  │  (WebView)  │  │  (WebView) │          │
│  │  ↗ Pop-out  │  │  ↗ Pop-out  │  │  ↗ Pop-out │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Pop-out:
┌── ChatGPT (eigenständiges Fenster) ────────────┐
│                                                  │
│  WebChat läuft isoliert mit eigenem Login        │
│  Agent Deck injiziert API-Keys + Context         │
│  ↙ Zurück ins Hauptfenster docken                │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Technisch:** Electron `BrowserWindow` mit `webview` Tag. Jedes WebChat-Fenster ist eine eigene BrowserWindow-Instanz mit:
- Isoliertem Session/Cookie-Store
- Injizierten API-Keys über `preload` Script
- Drag-and-Dock zurück ins Hauptfenster

**VS Code Agent Host als Inspiration:** Microsoft hat 2026 den [Agent Host Protocol (AHP)](https://code.visualstudio.com/blogs/2026/08/26/agent-host-architecture) veröffentlicht. Das ist ein offenes Protokoll für Agenten-Sessions die über mehrere Clients hinweg synchronisiert werden. **Wir könnten AHP-kompatibel bauen**, damit VS Code Agents sich mit unserer Bridge verbinden können.

---

## 4. Hub-Architektur (Tailscale-basiert)

**Deine Idee:** Ein PC als Hub, andere melden sich an und werden ferngesteuert.

```
                    ┌─── Tailscale VPN ───┐
                    │                     │
    ┌──────────┐   │   ┌──────────┐     │   ┌──────────┐
    │ Android  │──▶│   │  HUB-PC  │     │   │ Worker-PC│
    │  App     │   │   │ (Bridge) │◀───▶│   │ (Bridge) │
    └──────────┘   │   └──────────┘     │   └──────────┘
                    │        │           │
                    │   ┌────┴────┐      │
                    │   │ Worker  │      │
                    │   │  PC-2   │      │
                    │   └─────────┘      │
                    └─────────────────────┘
```

**Hub-Features:**
- Registriert sich als Hub im Tailscale-Netzwerk
- Verwaltet verbundene Worker-PCs
- Dispatched Tasks an Workers
- Aggregiert Results
- Web-UI für Remote-Zugriff (über Tailscale-URL)

**Worker-Features:**
- Meldet sich beim Hub an
- Empfängt und führt Tasks aus
- Sendet Results zurück

**Protokoll:** WebSocket über Tailscale (already encrypted, no extra TLS needed).

---

## 5. Discovery: Tailscale + mDNS + Manuell

**Tailscale (Primär):**
- Sicheres VPN, kostenlos für bis zu 100 Geräte
- Automatische Device-Discovery im Tailnet
- Kein NAT-Traversal-Problem
- Funktioniert auch über verschiedene Netzwerke hinweg

**mDNS (Sekundär, im LAN):**
- Für User die kein Tailscale nutzen wollen
- Automatische Discovery im lokalen Netzwerk

**Manuell (Fallback):**
- IP:Port + Token eingeben

---

## 6. Sicherheit: Meine Empfehlung

**TLS + Token + Tailscale:**

| Ebene | Schutz |
|-------|--------|
| **Transport** | Tailscale verschlüsselt automatisch (WireGuard) |
| **Authentifizierung** | Shared Token pro Device + API-Keys im OS-Keystore |
| **Pfad-Schutz** | Blocklist für sensible Pfade (~/.ssh, ~/.aws, etc.) |
| **Befehls-Filter** | Dangerous-Command-Blocklist (rm -rf /, format, etc.) |
| **Rate-Limiting** | Max Requests/Minute pro Client |
| **Audit-Log** | Jede Aktion wird protokolliert (wer, was, wann) |

**Warum kein mTLS:** Tailscale übernimmt already die Verschlüsselung. mTLS wäre redundant und komplex.

**API-Key-Management:**
- Keys werden im OS-Keystore gespeichert (Windows Credential Manager, macOS Keychain, Linux Secret Service)
- Pro Agent/Provider separater Key
- User kann Keys in den Settings verwalten

---

## 7. GitHub als Universal-Connector

**Deine Idee:** GitHub als Connector für Coding-Agents, weil es überall verfügbar ist.

**Umsetzung:**

```
Agent Deck ──▶ GitHub API ──▶ Issues/PRs/Actions
                │
                ├── GitHub Copilot (via Agent Host Protocol)
                ├── Claude Code (via GitHub MCP)
                ├── Cursor (via GitHub Integration)
                └── Custom Agents (via GitHub Webhooks)
```

**Vorteile:**
- GitHub ist überall verfügbar
- Auth über OAuth (kein extra Key-Management)
- Repos, Issues, PRs als Kontext für Agenten
- Actions als Execution-Environment

---

## 8. Distribution: .exe + Installer + Winget

**Alle drei:**

| Format | Zweck |
|--------|-------|
| **Portable .exe** | Quick-Start, kein Installer nötig |
| **NSIS/Inno Installer** | Richtige Installation mit Registry, Startmenü, Uninstaller |
| **Winget** | `winget install agent-deck` – Package-Manager |

**Installer-Features:**
- Registry-Einträge (Auto-Start, File-Associations)
- Startmenü-Shortcut
- Desktop-Shortcut (optional)
- Uninstaller
- Windows Firewall-Regel für WebSocket-Port

---

## 9. Auto-Update: Check per Knopfdruck

**Umsetzung:**
- "Auf Updates prüfen" Button in den Einstellungen
- GitHub Releases API für Version-Check
- Download + stille Installation
- Changelog anzeigen

---

## 10. Logging: Vollständig + Exportierbar (KRITISCH)

**Deine Anforderungen:**
- ✅ Alles mitloggen
- ✅ Jeden Chat exportierbar
- ✅ Thinking/Reasoning mit exportieren
- ✅ JSON-Format
- ✅ Suchfunktion
- ✅ Vergleichsfunktion
- ✅ Im Programm anschauen (eigener Tab)

**Log-Tab im UI:**

```
┌─ Logs ──────────────────────────────────────────────────────┐
│ 🔍 [Suche...]  Filter: [Alle ▼]  Zeitraum: [Heute ▼]      │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 14:32:01  TASK_START  task_014  Agent: Claude            ││
│ │ 14:32:02  AGENT_CALL  Claude → Messages API              ││
│ │ 14:32:05  THINKING    "Lass mich die Architektur..."     ││
│ │ 14:32:08  RESPONSE    Code: MainActivity.kt (245 Zeilen) ││
│ │ 14:32:09  TASK_DONE   task_014  Success (8s)             ││
│ │                                                          ││
│ │ [Export JSON] [Export Markdown] [Vergleichen]            ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Chat-Export:                                                 │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Session: "Android-Projekt" │ 14 Messages │ 12,345 Tokens ││
│ │ [Export mit Thinking] [Export nur Response] [Diff]       ││
│ └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

**Log-Format (JSON Lines):**

```json
{"ts":"2026-09-22T14:32:01Z","type":"task_start","task_id":"task_014","agent":"claude","title":"Erstelle MainActivity.kt"}
{"ts":"2026-09-22T14:32:02Z","type":"agent_call","agent":"claude","model":"claude-3.5-sonnet","tokens_in":1250}
{"ts":"2026-09-22T14:32:05Z","type":"thinking","agent":"claude","content":"Lass mich die Architektur analysieren..."}
{"ts":"2026-09-22T14:32:08Z","type":"response","agent":"claude","content":"class MainActivity...","tokens_out":890}
{"ts":"2026-09-22T14:32:09Z","type":"task_done","task_id":"task_014","success":true,"duration_ms":8000}
```

**Export-Formate:**
- JSON (vollständig, maschinenlesbar)
- JSONL (eine Zeile pro Event, für grep/jq)
- Markdown (lesbar, für Dokumentation)
- CSV (für Tabellenkalkulation)

**Vergleichsfunktion:**
- Zwei Sessions nebeneinander
- Diff-Ansicht (was hat Agent A vs. Agent B gemacht?)
- Token-Verbrauch vergleichen
- Thinking-Vergleich

---

## 11. Hilfs-KI (Live-Sprach-Assistent)

**Deine Idee:** Eine LLM die sich mit dem Programm auskennt, live per Sprache erreichbar.

**Umsetzung:**

```
┌─ Hilfs-KI ─────────────────────────────────────┐
│                                                  │
│  🎤 "Wie erstelle ich einen neuen Blueprint?"    │
│                                                  │
│  🤖 "Du kannst einen Blueprint erstellen indem   │
│  du auf 'Neuer Blueprint' klickst oder..."       │
│                                                  │
│  Provider: [OpenAI GPT-4o ▼]                     │
│  Voice: [Whisper STT + TTS ▼]                    │
│                                                  │
│  Kontext: Programm-Dokumentation + aktuelle       │
│  Tasks + Chat-History                             │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Features:**
- Sprach-Eingabe (Whisper STT)
- Sprach-Ausgabe (TTS)
- Programm-Kontext (Dokumentation, aktuelle Tasks, Logs)
- API-Slot: User wählt Provider (OpenAI, Claude, lokal)
- Immer erreichbar (Floating-Button oder Hotkey)

---

## 12. Enterprise-Vorbereitung (nicht einbauen, aber vorbereiten)

**Architektur muss das unterstützen:**

| Feature | Vorbereitung |
|---------|-------------|
| **Multi-User** | User-Interface in der DB, Auth-System erweiterbar |
| **Audit-Log** | Logging-System speichert User pro Aktion |
| **Cluster** | Hub/Worker-Architektur already designed |
| **Plugin-System** | Plugin-API definieren, Registry vorbereiten |
| **RBAC** | Permission-Interface, aber nur eine Rolle im MVP |

---

## 13. Plugin-System

**Architektur:**

```
plugins/
├── github-connector/
│   ├── manifest.json
│   └── index.ts
├── ollama-local/
│   ├── manifest.json
│   └── index.ts
├── vscode-integration/
│   ├── manifest.json
│   └── index.ts
└── custom-plugin/
    ├── manifest.json
    └── index.ts
```

**Plugin-API:**
```typescript
interface AgentDeckPlugin {
  name: string;
  version: string;
  capabilities: PluginCapability[];

  // Lifecycle
  onActivate(context: PluginContext): Promise<void>;
  onDeactivate(): Promise<void>;

  // Optional: UI-Beiträge
  registerSidebarItem?(): SidebarItem;
  registerSettingsPanel?(): SettingsPanel;

  // Optional: Agent-Provider
  registerAgent?(): AgentProvider;

  // Optional: Tools für den Orchestrator
  registerTools?(): Tool[];
}
```

---

## 14. Design

**Dir wichtig:** Professionelles, modernes Design.

**Empfehlung:**
- **Dark Mode** als Default (Developer-Tool)
- **Material Design 3** oder **Shadcn/UI** Komponenten
- **Monospace** für Logs und Code
- **Accent-Farbe:** Blau (#1976D2) oder Lila (#7B1FA2)
- **Icons:** Lucide Icons oder Heroicons
- **Animationen:** Subtle, nicht übertrieben

---

## Zusammenfassung: Was wir bauen

### Agent Deck PC-Bridge = All-in-One Desktop-Tool

1. **AI Agent Cockpit** – Alle WebChats (ChatGPT, Claude, Arena) als eingebettete oder pop-out Fenster
2. **Hub-Server** – Tailscale-basiertes Netzwerk aus PCs
3. **Orchestrator** – Blueprint-gesteuerte Task-Verteilung
4. **Terminal/Filesystem-Bridge** – Remote-Ausführung auf verbundenen PCs
5. **Log-System** – Vollständiges Logging mit Export, Suche, Vergleich
6. **Hilfs-KI** – Live-Sprach-Assistent mit Programm-Kontext
7. **Plugin-System** – Erweiterbar für GitHub, Ollama, VS Code etc.

### Tech-Stack

| Schicht | Technologie |
|---------|------------|
| **UI** | Electron + React + TypeScript |
| **Backend** | Node.js + Express/WebSocket |
| **Database** | SQLite (better-sqlite3) |
| **Discovery** | Tailscale API + mDNS |
| **Security** | Tailscale (WireGuard) + Token + OS-Keystore |
| **Build** | electron-builder (Installer, .exe, Winget) |
| **Logging** | JSON Lines + SQLite für Suche |
| **Voice** | Whisper (STT) + OpenAI TTS |

### Phasen

| Phase | Scope | Dauer |
|-------|-------|-------|
| **1** | Electron Shell + Settings + Tray | 1 Woche |
| **2** | WebSocket-Bridge (Terminal, FS, Git) | 1 Woche |
| **3** | WebChat-Integration (Pop-out/Dock) | 1-2 Wochen |
| **4** | Tailscale Hub/Worker + Discovery | 1 Woche |
| **5** | Log-System + Export + Vergleich | 1 Woche |
| **6** | Hilfs-KI (Voice + Kontext) | 1 Woche |
| **7** | Plugin-System + GitHub-Connector | 1 Woche |
| **8** | Installer + Winget + Auto-Update | 3-5 Tage |

**Gesamt: ~8-9 Wochen**
