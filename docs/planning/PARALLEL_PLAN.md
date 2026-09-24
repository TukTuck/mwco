# 🔄 Parallel-Plan – Wer macht was auf welchem Branch

## Streams (unabhängige Arbeitspakete)

Die Arbeit ist in **4 Streams** aufgeteilt. Jeder Stream kann auf einem eigenen Branch bearbeitet werden. Die Streams kommunizieren über **definierte Interfaces** – dadurch können sie parallel entwickelt werden.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Agent Deck Desktop                            │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────┐ │
│  │  STREAM A    │  │  STREAM B    │  │ STREAM C │  │  STREAM D  │ │
│  │  UI/Frontend │  │  Backend/    │  │  Paul    │  │  Hub/      │ │
│  │              │  │  MCP-Bus     │  │  (LLM +  │  │  Worker    │ │
│  │  Electron    │  │  WebSocket   │  │  Voice + │  │  Tailscale │ │
│  │  React       │  │  Terminal    │  │  MCP     │  │  Discovery │ │
│  │  Grid-Layout │  │  FS + Git    │  │  Tools)  │  │            │ │
│  │  Design      │  │  SQLite      │  │          │  │            │ │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  └─────┬──────┘ │
│         │                 │                │               │        │
│         └───── IPC ───────┘                │               │        │
│         └──────── MCP-Bus ─────────────────┘               │        │
│         └──────── WebSocket ────────────────────────────────┘        │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Stream A: UI/Frontend (Branch: `arena/ui-frontend`)

**Scope:** Alles was der User sieht und anfasst.

**Enthält:**
- Electron Shell (Hauptfenster, Tray-Icon)
- React App mit Grid-Layout (react-grid-layout oder react-resizable-panels)
- Design-System (Shadcn/UI + Tailwind + Dark Mode)
- Fenster-System (Pop-out, Pop-in, Farben, Pin, Auto-Sort)
- Layout-Speicherung
- Settings-UI
- Log-Viewer UI (nur Frontend – Backend kommt von Stream B)

**Interface zu Stream B:**
```typescript
// Electron IPC: Renderer → Main Process
interface RendererToMain {
  'mcp:call': (server: string, tool: string, params: unknown) => Promise<unknown>;
  'mcp:list-servers': () => Promise<string[]>;
  'layout:save': (layout: WindowLayout) => Promise<void>;
  'layout:load': (name: string) => Promise<WindowLayout>;
  'window:popout': (windowId: string) => Promise<void>;
  'window:popin': (windowId: string) => Promise<void>;
}
```

**Deliverables:**
1. Electron-App startet und zeigt leeres Grid
2. Fenster können hinzugefügt, verschoben, skaliert werden
3. Pop-out/Pop-in funktioniert
4. Auto-Sort Knopf funktioniert
5. Layouts speichern/laden
6. Settings-Seite (erstmal nur UI, ohne Funktionalität)
7. Log-Viewer (erstmal nur UI mit Mock-Daten)

---

## Stream B: Backend/MCP-Bus (Branch: `arena/backend-mcp`)

**Scope:** Die gesamte Server-Logik, MCP-Bus, Bridges, Datenbank.

**Enthält:**
- MCP-Bus (zentraler Message-Bus für alle MCP-Server)
- MCP-Server-Registry (registriert/verwaltet MCP-Server)
- Eingebaute MCP-Server:
  - Filesystem (read/write/list/search)
  - Terminal (Shell-Befehle)
  - Git (status/diff/log/add/commit)
  - Tasks (CRUD + Status)
  - Logs (Search + Export)
- WebSocket-Server (für Android-App + Worker)
- SQLite Database (Schema + Repositories)
- Config-System (default.json + local.json)
- Security (Auth-Token, Pfad-Blocklist, Command-Filter)

**Interface zu Stream A:**
```typescript
// MCP-Bus API (wird über IPC exponiert)
interface MCPBus {
  registerServer(name: string, server: MCPServer): void;
  callTool(server: string, tool: string, params: unknown): Promise<unknown>;
  listServers(): string[];
  listTools(server: string): MCPToolDef[];
}

// Database API (wird über IPC exponiert)
interface DatabaseAPI {
  sessions: SessionRepository;
  messages: MessageRepository;
  tasks: TaskRepository;
  blueprints: BlueprintRepository;
  auditLog: AuditLogRepository;
}
```

**Interface zu Stream C:**
```typescript
// Paul nutzt den MCP-Bus
interface PaulToMCP {
  callTool(server: string, tool: string, params: unknown): Promise<unknown>;
  listServers(): string[];
  listTools(server: string): MCPToolDef[];
}
```

**Interface zu Stream D:**
```typescript
// Hub/Worker kommuniziert über WebSocket
interface HubProtocol {
  'worker:register': WorkerRegistration;
  'task:dispatch': TaskAssignment;
  'task:result': TaskResult;
  'hub:status': HubStatus;
}
```

**Deliverables:**
1. MCP-Bus läuft und kann Tools registrieren/aufrufen
2. Filesystem MCP-Server funktioniert
3. Terminal MCP-Server funktioniert
4. Git MCP-Server funktioniert
5. SQLite Database mit allen Tabellen
6. WebSocket-Server akzeptiert Verbindungen
7. Config-System lädt default.json + local.json
8. Security-Checks funktionieren

---

## Stream C: Paul (Branch: `arena/paul-assistant`)

**Scope:** Paul als Assistent – LLM, Voice, MCP-Tools.

**Enthält:**
- LLM-Integration (lokal via ONNX/llama.cpp oder remote via API)
- Voice-Stack (Whisper STT + TTS)
- Pauls MCP-Client (verbindet sich mit MCP-Bus)
- Pauls System-Prompt + Kontext-Management
- Pauls Fenster-UI (Chat-Interface)
- Notfall-Modus (Paul orchestriert direkt)
- Proaktive Events (hört auf System-Events)

**Interface zu Stream B:**
```typescript
// Paul nutzt den MCP-Bus von Stream B
class PaulMCPClient {
  constructor(private mcpBus: MCPBus) {}

  async readFile(path: string): Promise<string> {
    return this.mcpBus.callTool('filesystem', 'read_file', { path });
  }

  async runTerminal(command: string, cwd?: string): Promise<TerminalResult> {
    return this.mcpBus.callTool('terminal', 'run_command', { command, cwd });
  }

  // ... weitere Tool-Calls
}
```

**Interface zu Stream A:**
```typescript
// Pauls UI ist ein Fenster im Grid
interface PaulWindow {
  type: 'paul';
  component: React.ComponentType;
  mcpServerName: 'paul';
}
```

**Deliverables:**
1. Paul kann mit einem LLM sprechen (lokal oder remote)
2. Paul kann MCP-Tools aufrufen (Filesystem, Terminal)
3. Paul versteht Sprache (Whisper STT)
4. Paul spricht (TTS)
5. Paul hat ein Chat-Fenster im Grid
6. Notfall-Modus funktioniert
7. Paul hört auf System-Events

---

## Stream D: Hub/Worker + Tailscale (Branch: `arena/hub-worker`)

**Scope:** Multi-PC-Architektur.

**Enthält:**
- Tailscale-Integration (Device-Discovery, VPN)
- Hub-Modus (registriert Workers, dispatcht Tasks)
- Worker-Modus (meldet sich bei Hub, führt Tasks aus)
- Worker-Registrierung (Capability-Advertisement)
- Task-Dispatch über Netzwerk
- Result-Sync
- GitHub-Sync (Worker pushed Code, Hub prüft)

**Interface zu Stream B:**
```typescript
// Hub/Worker nutzt den WebSocket-Server von Stream B
interface HubWebSocket {
  onConnection(ws: WebSocket, clientInfo: ClientInfo): void;
  broadcast(message: BridgeMessage): void;
}
```

**Deliverables:**
1. Tailscale Device-Discovery funktioniert
2. Hub-Modus akzeptiert Worker-Registrierungen
3. Worker-Modus meldet sich beim Hub an
4. Task-Dispatch über Netzwerk funktioniert
5. Results werden korrekt zurückgesendet
6. GitHub-Sync funktioniert

---

## Abhängigkeiten

```
Stream A (UI)      ← keine Abhängigkeiten, kann sofort starten
Stream B (Backend) ← keine Abhängigkeiten, kann sofort starten
Stream C (Paul)    ← braucht MCP-Bus von Stream B (Interface definiert)
Stream D (Hub)     ← braucht WebSocket-Server von Stream B (Interface definiert)
```

**Kritischer Pfad:** Stream B (Backend) muss zuerst die MCP-Bus + WebSocket-Interfaces liefern, damit Stream C und D andocken können.

**Empfohlene Reihenfolge:**
1. **Woche 1-2:** Stream A + Stream B starten parallel
2. **Woche 2-3:** Stream C startet (nutzt MCP-Bus Interface von B)
3. **Woche 4-5:** Stream D startet (nutzt WebSocket Interface von B)
4. **Woche 6+:** Integration + Testing

---

## Branches

| Branch | Stream | Beschreibung |
|--------|--------|-------------|
| `arena/ui-frontend` | A | Electron + React + Grid + Design |
| `arena/backend-mcp` | B | MCP-Bus + Bridges + SQLite + WebSocket |
| `arena/paul-assistant` | C | Paul LLM + Voice + MCP-Client |
| `arena/hub-worker` | D | Tailscale + Hub/Worker + Discovery |
| `arena/01a0c3a9-mwco` | Hauptbranch | Architektur-Docs + bestehender Code |

---

## Merge-Strategie

1. Stream B merged zuerst in den Hauptbranch (weil A, C, D von B abhängen)
2. Stream A merged danach (UI + Backend zusammen)
3. Stream C merged (Paul an MCP-Bus andocken)
4. Stream D merged (Hub/Worker an WebSocket andocken)
5. Integration-Testing auf dem Hauptbranch
