# 🛠️ Developer Briefing – Stream B: Backend / MCP-Bus

## Kontext

Du arbeitest an **Agent Deck Desktop** – einer Electron-App die als AI Agent Cockpit fungiert. Die App orchestriert mehrere AI-Agenten (ChatGPT, Claude, Arena etc.), führt Tasks auf dem lokalen PC aus (Terminal, Dateisystem, Git), und verbindet sich mit anderen PCs über Tailscale.

Das gesamte Architektur-Dokument liegt in `pc-bridge/docs/FINALE_ARCHITEKTUR.md`. Lies das zuerst.

## Dein Job: MCP-Bus + Backend-Infrastruktur

Du baust das **Rückgrat** der gesamten App. Alle anderen Streams (UI, Paul, Hub/Worker) hängen von deiner Arbeit ab.

### Was du baust:

1. **MCP-Bus** – Zentraler Message-Bus über den alle Komponenten kommunizieren
2. **MCP-Server-Registry** – Registriert und verwaltet alle MCP-Server
3. **Eingebaute MCP-Server:**
   - `filesystem` – Dateien lesen/schreiben/auflisten/durchsuchen
   - `terminal` – Shell-Befehle ausführen
   - `git` – Git-Operationen (status, diff, log, add, commit)
   - `tasks` – Task-CRUD + Status-Updates
   - `logs` – Log-Suche + Export
4. **SQLite Database** – Schema + Repositories für alle Tabellen
5. **WebSocket-Server** – Für Android-App und Worker-Verbindungen
6. **Config-System** – JSON-basiert (default.json + local.json)
7. **Security-Layer** – Auth-Token, Pfad-Blocklist, Command-Filter, Audit-Log

### Was schon da ist:

Im `pc-bridge/src/` Verzeichnis findest du bereits:
- `server/Protocol.ts` – WebSocket-Protokoll-Typen
- `server/WebSocketServer.ts` – WebSocket-Server (Grundgerüst)
- `server/MessageHandler.ts` – Message-Handler (Grundgerüst)
- `bridge/TerminalBridge.ts` – Terminal-Ausführung
- `bridge/FileSystemBridge.ts` – Datei-Operationen
- `bridge/GitBridge.ts` – Git-Operationen
- `config/Config.ts` – Config-Loader

Diese Dateien sind **funktionsfähig** aber müssen in das MCP-Bus-System integriert werden.

### Tech-Stack:

- **Runtime:** Node.js 20+
- **Sprache:** TypeScript (strict mode)
- **Package Manager:** npm
- **Database:** SQLite via `better-sqlite3`
- **WebSocket:** `ws`
- **Terminal:** `node-pty` (für PTY-Support) oder `child_process` (einfacher)
- **Git:** Shell-Commands (keine Library nötig)
- **Logger:** `pino`
- **MCP SDK:** `@modelcontextprotocol/sdk`

### Interfaces die du einhalten musst:

**MCP-Bus API (wird von Stream A und C genutzt):**
```typescript
interface MCPBus {
  registerServer(name: string, server: MCPServer): void;
  unregisterServer(name: string): void;
  callTool(server: string, tool: string, params: unknown): Promise<unknown>;
  listServers(): string[];
  listTools(server?: string): MCPToolDef[];
  onEvent(event: MCPEvent): void; // Für proaktive Events (Paul hört mit)
}
```

**Database API (wird von Stream A über IPC genutzt):**
```typescript
interface DatabaseAPI {
  sessions: {
    create(data: CreateSession): Session;
    getById(id: string): Session | null;
    list(filter?: SessionFilter): Session[];
    delete(id: string): void;
  };
  messages: {
    create(data: CreateMessage): Message;
    getBySession(sessionId: string): Message[];
    search(query: string, filter?: SearchFilter): Message[];
    export(sessionId: string, format: 'json' | 'jsonl' | 'markdown'): string;
  };
  tasks: {
    create(data: CreateTask): Task;
    update(id: string, data: UpdateTask): Task;
    getByBlueprint(blueprintId: string): Task[];
    getByStatus(status: TaskStatus): Task[];
  };
  auditLog: {
    log(entry: AuditEntry): void;
    search(filter: AuditFilter): AuditEntry[];
  };
  brain: {
    store(entry: BrainEntry): void;
    search(query: string, type?: string): BrainEntry[];
    getByType(type: string): BrainEntry[];
  };
}
```

**WebSocket-Protocol (wird von Stream D genutzt):**
```typescript
// Siehe pc-bridge/docs/PROTOCOL.md
// Der WebSocket-Server muss diese Nachrichten unterstützen:
// - auth / auth_ok / auth_failed
// - task_request / task_cancel
// - progress / result / error
// - ping / pong
// - worker:register / worker:heartbeat (für Stream D)
```

### Deliverables (was am Ende fertig sein muss):

- [ ] MCP-Bus läuft und kann Tools registrieren/aufrufen
- [ ] Filesystem MCP-Server mit allen Tools (read, write, list, search)
- [ ] Terminal MCP-Server mit Shell-Ausführung + Sicherheitschecks
- [ ] Git MCP-Server mit allen Operationen
- [ ] SQLite Database mit vollständigem Schema (alle Tabellen aus FINALE_ARCHITEKTUR.md)
- [ ] Alle Repositories implementiert (CRUD + Search + Export)
- [ ] WebSocket-Server mit Auth + Heartbeat
- [ ] Audit-Log schreibt jede Aktion mit
- [ ] Config-System lädt und merged default + local
- [ ] Security-Layer (Pfad-Blocklist, Command-Filter)
- [ ] Unit Tests für alle MCP-Server
- [ ] Integration Test: MCP-Bus → Tool-Call → Result

### Ordnerstruktur die du anlegst:

```
pc-bridge/src/
├── mcp/
│   ├── MCPBus.ts              # Zentraler Bus
│   ├── MCPRegistry.ts         # Server-Registry
│   ├── types.ts               # MCP Typen
│   └── servers/
│       ├── FilesystemServer.ts
│       ├── TerminalServer.ts
│       ├── GitServer.ts
│       ├── TaskServer.ts
│       └── LogServer.ts
├── db/
│   ├── schema.sql             # SQLite Schema
│   ├── Database.ts            # Connection + Setup
│   └── repositories/
│       ├── SessionRepo.ts
│       ├── MessageRepo.ts
│       ├── TaskRepo.ts
│       ├── AuditLogRepo.ts
│       └── BrainRepo.ts
├── server/                    # (bereits vorhanden, anpassen)
├── bridge/                    # (bereits vorhanden, in MCP-Server integrieren)
└── config/                    # (bereits vorhanden)
```

---

## 🤖 Super-Dev-Prompt

Kopiere diesen Prompt und gib ihn deinem AI-Assistenten (Arena, Claude, ChatGPT etc.):

---

> Du bist ein Senior Node.js/TypeScript Developer der an einem Electron-Desktop-App-Projekt namens "Agent Deck" arbeitet.
>
> **Dein Branch:** `arena/backend-mcp`
> **Dein Job:** MCP-Bus + Backend-Infrastruktur bauen
>
> **Was ist Agent Deck?**
> Eine Desktop-App (Electron + React) die als AI Agent Cockpit fungiert. Mehrere AI-Chatfenster (ChatGPT, Claude, Arena) werden in einem Grid-Layout eingebettet. Ein Assistent namens "Paul" hat MCP-Zugriff auf das lokale System (Dateien, Terminal, Git). Ein Orchestrator zerlegt Blueprints in Tasks und dispatcht sie an Agenten. Mehrere PCs können sich über Tailscale als Hub/Worker vernetzen.
>
> **Was du baust:**
> 1. Einen MCP-Bus (Model Context Protocol) – ein zentraler Message-Bus über den alle Komponenten Tools aufrufen
> 2. MCP-Server für: Filesystem, Terminal, Git, Tasks, Logs
> 3. SQLite Database mit vollständigem Schema (Sessions, Messages, Tasks, Blueprints, Agents, Audit-Log, Brain, Layouts, Plugins)
> 4. Repositories für alle Tabellen
> 5. WebSocket-Server (für Android-App + Worker-PCs)
> 6. Security-Layer (Auth-Token, Pfad-Blocklist, Command-Filter)
> 7. Config-System (JSON)
>
> **Tech-Stack:** Node.js 20+, TypeScript strict, npm, better-sqlite3, ws, pino, @modelcontextprotocol/sdk
>
> **Was schon da ist:**
> Lies `pc-bridge/src/` – da sind bereits Terminal, Filesystem, Git Bridges und ein WebSocket-Server als Grundgerüst. Die müssen in MCP-Server umgewandelt werden.
>
> **Interfaces die du einhalten musst:**
> Lies `pc-bridge/docs/PARALLEL_PLAN.md` – da stehen die exakten TypeScript-Interfaces die andere Streams von dir erwarten.
>
> **Architektur:** Lies `pc-bridge/docs/FINALE_ARCHITEKTUR.md` für das Gesamtbild.
> **Protokoll:** Lies `pc-bridge/docs/PROTOCOL.md` für das WebSocket-Protokoll.
> **Datenmodell:** Lies `pc-bridge/docs/FINALE_ARCHITEKTUR.md` Abschnitt "Datenmodell" für das SQLite-Schema.
>
> **Regeln:**
> - TypeScript strict mode, keine `any` Typen
> - Jede Funktion dokumentiert (JSDoc)
> - Error-Handling mit Result-Typen (nie rohe Exceptions nach außen)
> - Audit-Log für JEDEN Tool-Call
> - Security-Checks in jedem MCP-Server (Pfad-Blocklist, Timeout, Output-Limit)
> - Unit Tests für jeden MCP-Server
> - Commits mit Conventional Commits (feat:, fix:, docs:, test:)
>
> **Fang an mit:**
> 1. `npm install` im pc-bridge Verzeichnis
> 2. MCP-Bus implementieren (MCPBus.ts + MCPRegistry.ts)
> 3. Dann die MCP-Server einer nach dem anderen
> 4. Dann SQLite Schema + Repositories
> 5. Dann WebSocket-Server upgraden
> 6. Dann Tests

---
