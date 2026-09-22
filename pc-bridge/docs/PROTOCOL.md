<!-- SPDX-License-Identifier: MIT -->
# Protokoll-Spezifikation – Agent Deck

Diese Datei spezifiziert alle Kommunikations-Protokolle zwischen den Komponenten.

---

## 1. WebSocket-Protokoll (Android ↔ PC-Bridge)

**Port:** 8765 (konfigurierbar in `config/default.json`)
**Format:** JSON über WebSocket (RFC 6455)
**Bibliothek:** `ws` (Node.js) / Ktor WebSocket (Android)

### Verbindungsaufbau

```
Client → Server:  {"type": "auth", "task_id": "", "payload": {"token": "..."}}
Server → Client:  {"type": "auth_ok", "task_id": "", "payload": {"bridge_version": "0.2.0", ...}}
                  ODER
Server → Client:  {"type": "auth_failed", "task_id": "", "payload": {"error": "..."}}
```

### Task-Request

```json
{
  "type": "task_request",
  "task_id": "task-uuid-123",
  "payload": {
    "title": "Datei erstellen",
    "description": "Erstelle eine README.md",
    "priority": "MEDIUM",
    "timeout_seconds": 300,
    "actions": [
      {"type": "terminal", "command": "mkdir -p /tmp/test"},
      {"type": "write_file", "path": "/tmp/test/README.md", "content": "# Hello"}
    ]
  }
}
```

### Progress-Update

```json
{
  "type": "progress",
  "task_id": "task-uuid-123",
  "payload": {
    "action_index": 0,
    "total_actions": 2,
    "message": "Führe aus: terminal mkdir -p /tmp/test"
  }
}
```

### Ergebnis

```json
{
  "type": "result",
  "task_id": "task-uuid-123",
  "payload": {
    "success": true,
    "content": "2 Aktionen erfolgreich ausgeführt",
    "result_type": "TEXT",
    "details": [
      {"action": "terminal", "success": true, "exitCode": 0, "stdout": ""},
      {"action": "write_file", "success": true, "bytesWritten": 8}
    ]
  }
}
```

### Fehler

```json
{
  "type": "error",
  "task_id": "task-uuid-123",
  "payload": {
    "error": "Pfad blockiert: ~/.ssh",
    "action_index": 1,
    "details": "..."
  }
}
```

### Heartbeat

```
Client → Server:  {"type": "ping", "task_id": "", "payload": {}}
Server → Client:  {"type": "pong", "task_id": "", "payload": {}}
```

Server sendet zusätzlich WebSocket-Ping-Frames alle 30 Sekunden.

### Aktionstypen

| Typ | Felder | Beschreibung |
|-----|--------|-------------|
| `terminal` | command, cwd?, timeout?, env? | Shell-Befehl ausführen |
| `write_file` | path, content, cwd? | Datei schreiben |
| `read_file` | path, cwd? | Datei lesen |
| `list_files` | path, recursive?, cwd? | Verzeichnis auflisten |
| `search_files` | pattern, path, cwd? | Dateien durchsuchen |
| `git` | action, args?, cwd? | Git-Operation (status/diff/log/add/commit/branch) |

---

## 2. MCP-Bus-Protokoll (Interne Kommunikation)

**Transport:** In-Process (EventEmitter)
**Bibliothek:** Eigenimplementierung (`src/mcp/MCPBus.ts`)

### Knoten-Registrierung

```typescript
bus.registerNode('paul', 'Paul', 'paul', '🔵');
// → emit('node:registered', node)
```

Knotentypen: `paul`, `orchestrator`, `terminal`, `webchat`, `log`, `custom`

### Tool-Registrierung

```typescript
bus.registerTool('paul', {
  name: 'execute_command',
  description: 'Führt einen Shell-Befehl aus',
  inputSchema: { type: 'object', properties: { command: { type: 'string' } } },
  handler: async (input) => { ... }
});
```

### Tool-Aufruf

```typescript
const result = await bus.callTool('orchestrator', 'paul', 'execute_command', {
  command: 'ls -la'
});
// → MCPToolResult { content: [{type: 'text', text: '...'}], isError?: boolean }
```

### BusMessage (intern geloggt)

```typescript
interface BusMessage {
  from: string;      // Knoten-ID des Aufrufers
  to: string;        // Knoten-ID des Ziels (oder '*' für Broadcast)
  type: 'tool_call' | 'tool_result' | 'event' | 'broadcast';
  payload: Record<string, unknown>;
  timestamp: number;  // Unix-Timestamp in ms
}
```

### Broadcast

```typescript
bus.broadcast('paul', 'status_update', { status: 'working', taskId: '123' });
// → emit('broadcast', message) – alle Knoten empfangen
```

### Regeln
- WebChat-Knoten haben **KEINEN** MCP-Zugriff (nur Chat-Interface)
- Nur Paul hat System-Tools (Terminal, FileSystem, Git)
- Fenster kommunizieren **NIE direkt**, nur über den Bus
- Message-Log ist auf 10.000 Einträge begrenzt

---

## 3. IPC-Protokoll (Electron Main ↔ Renderer)

**Transport:** Electron IPC (contextBridge)
**Sicherheit:** contextIsolation=true, nodeIntegration=false

### Window Controls

| Kanal | Richtung | Parameter | Rückgabe |
|-------|----------|-----------|----------|
| `window:minimize` | Renderer → Main | – | void |
| `window:maximize` | Renderer → Main | – | void |
| `window:close` | Renderer → Main | – | void |

### MCP-Bus

| Kanal | Richtung | Parameter | Rückgabe |
|-------|----------|-----------|----------|
| `bus:getNodes` | R→M | – | NodeInfo[] |
| `bus:getAllTools` | R→M | – | ToolInfo[] |
| `bus:callTool` | R→M | from, to, tool, input | MCPToolResult |
| `bus:getMessageLog` | R→M | limit? | BusMessage[] |

### Paul

| Kanal | Richtung | Parameter | Rückgabe |
|-------|----------|-----------|----------|
| `paul:chat` | R→M | message: string | PaulMessage |
| `paul:getHistory` | R→M | – | PaulMessage[] |
| `paul:clearHistory` | R→M | – | void |
| `paul:transcribe` | R→M | audioBase64: string | string |
| `paul:speak` | R→M | text: string | string (base64) \| null |

**Events (Main → Renderer):**
| Event | Payload | Beschreibung |
|-------|---------|-------------|
| `paul:thinking` | string | Paul verarbeitet Anfrage |
| `paul:message` | PaulMessage | Neue Antwort erhalten |
| `hotkey:paul` | – | Ctrl+Shift+P gedrückt |

### Orchestrator

| Kanal | Richtung | Parameter | Rückgabe |
|-------|----------|-----------|----------|
| `orch:decompose` | R→M | blueprintText: string | Blueprint \| {error} |
| `orch:execute` | R→M | – | {success, error?} |
| `orch:getTasks` | R→M | – | OrchestratorTask[] |

**Events (Main → Renderer):**
| Event | Payload | Beschreibung |
|-------|---------|-------------|
| `orch:status` | string | Status-Update |
| `orch:taskUpdate` | Task | Task-Status geändert |
| `orch:completed` | {total, done, failed} | Alle Tasks abgeschlossen |

### Hub/Worker

| Kanal | Richtung | Parameter | Rückgabe |
|-------|----------|-----------|----------|
| `hub:getWorkers` | R→M | – | WorkerInfo[] |
| `hub:getTasks` | R→M | – | HubTask[] |
| `hub:submitTask` | R→M | task | HubTask |

**Events (Main → Renderer):**
| Event | Payload | Beschreibung |
|-------|---------|-------------|
| `hub:workerOnline` | WorkerInfo | Neuer Worker verbunden |
| `hub:workerOffline` | WorkerInfo | Worker getrennt |
| `hub:taskDone` | HubTask | Task abgeschlossen |

### Database

| Kanal | Richtung | Rückgabe |
|-------|----------|----------|
| `db:layouts:list` | R→M | Layout[] |
| `db:layouts:save` | R→M | Layout[] |
| `db:layouts:delete` | R→M | Layout[] |
| `db:sessions:list` | R→M | Session[] |
| `db:sessions:messages` | R→M | Message[] |
| `db:tasks:list` | R→M | Task[] |
| `db:audit:query` | R→M | AuditEntry[] |
| `db:audit:export` | R→M | AuditEntry[] |

**Hinweis:** Alle DB-Kanäle geben `[]` zurück wenn die Datenbank nicht verfügbar ist.

---

## 4. Hub/Worker-Protokoll

**Port:** 8766 (Hub)
**Transport:** WebSocket (JSON)

### Worker-Registrierung

```json
// Worker → Hub
{
  "type": "register",
  "workerId": "worker-abc123",
  "name": "GPU-Worker",
  "hostname": "desktop-2",
  "platform": "win32",
  "capabilities": [
    {"type": "gpu", "name": "nvidia-rtx-4090", "details": {"vram": "24GB"}},
    {"type": "terminal", "name": "shell"}
  ]
}

// Hub → Worker
{"type": "registered", "workerId": "worker-abc123"}
```

### Task-Dispatch

```json
// Hub → Worker
{
  "type": "task",
  "taskId": "hub-task-123",
  "title": "Modell trainieren",
  "description": "...",
  "payload": {"model": "qwen2.5", "epochs": 10}
}
```

### Task-Ergebnis

```json
// Worker → Hub
{"type": "task_result", "taskId": "hub-task-123", "result": {"accuracy": 0.95}}
// ODER
{"type": "task_error", "taskId": "hub-task-123", "error": "OOM"}
```

### Heartbeat

```json
// Worker → Hub (alle 30 Sekunden)
{"type": "heartbeat"}
```

**Timeout:** 90 Sekunden ohne Heartbeat → Worker gilt als offline, Tasks werden re-queued.
