# 🛠️ Developer Briefing – Stream C: Paul (Assistent + Voice + MCP)

## Kontext

Du arbeitest an **Agent Deck Desktop** – einer Electron-App die als AI Agent Cockpit fungiert. Lies `pc-bridge/docs/PAUL_SPEC.md` für Pauls vollständige Spezifikation.

## Wer ist Paul?

Paul ist der **zentrale Assistent** in Agent Deck. Er ist:
- 🎤 Sprachassistent (immer erreichbar per Hotkey oder Klick)
- 🔌 MCP-Brücke (er hat Zugriff auf ALLE System-Tools)
- 🧠 Kontext-bewusst (kennt Tasks, Chats, Logs, Blueprints)
- 🏠 Immer da (eigenes Fenster, Always-on-Top optional)

**Paul ist NICHT der Orchestrator.** Der Orchestrator ist ein separates spezialisiertes Modell das Tasks zerlegt und dispatcht. Paul interagiert mit dem Orchestrator, ersetzt ihn aber nicht (außer im Notfall).

## Dein Job: Paul komplett bauen

### Was du baust:

1. **LLM-Integration**
   - Lokale Modelle (Qwen2.5-7B Q4 als Default, via Ollama oder llama.cpp)
   - Remote APIs (OpenAI, Anthropic, Nvidia NIM, Custom)
   - Provider-Auswahl (User konfiguriert welches Modell Paul nutzt)
   - Function-Calling / Tool-Use Support
   - Kontext-Management (Tasks, Logs, Blueprint in den Prompt einbetten)

2. **Voice-Stack**
   - STT: Whisper (lokal via whisper.cpp oder remote via OpenAI API)
   - TTS: Piper (lokal) oder OpenAI TTS (remote)
   - Push-to-Talk (Hotkey Ctrl+Shift+P)
   - Optional: Wake-Word "Hey Paul" (via Porcupine)
   - Audio-Visualisierung (Welle während Paul spricht)

3. **MCP-Client**
   - Verbindet sich mit dem MCP-Bus (von Stream B)
   - Ruft Tools auf (Filesystem, Terminal, Git, Browser, Tasks, Logs, Agenten)
   - Streaming-Responses (User sieht Tool-Calls live)

4. **Pauls Chat-Interface**
   - Chat-Fenster im Grid (immer 🔵 Blau)
   - Text-Input + Voice-Button
   - Tool-Call-Anzeige (welches Tool, welches Resultat)
   - Thinking-Anzeige (wenn Modell Thinking unterstützt)
   - Mini-Modus (kleiner Button am Bildschirmrand)
   - Always-on-Top Toggle

5. **Notfall-Modus**
   - Wenn Orchestrator nicht erreichbar: Paul orchestriert selbst
   - Loggt alles mit `orchestrator: "paul_fallback"`
   - Warnt den User

6. **Proaktive Events**
   - Hört auf System-Events (Task fertig, Agent offline, Fehler)
   - Informiert den User proaktiv
   - Schlägt nächste Schritte vor

### Tech-Stack:

- **LLM Local:** Ollama API (HTTP, einfach) oder llama.cpp (via node-llama-cpp)
- **LLM Remote:** OpenAI SDK, Anthropic SDK
- **STT:** `node-whisper` (lokal) oder OpenAI API
- **TTS:** `piper-tts` (lokal, Node.js binding) oder OpenAI API
- **Wake-Word:** `porcupine-node` (optional)
- **Audio:** `node-audio` oder Web Audio API (im Renderer)
- **Framework:** React (für Pauls UI) + TypeScript

### Interfaces die du einhalten musst:

**Zu Stream B (MCP-Bus):**
```typescript
// Paul nutzt den MCP-Bus von Stream B:
class PaulMCPClient {
  constructor(private mcpBus: MCPBus) {}

  async callTool(server: string, tool: string, params: unknown): Promise<unknown> {
    return this.mcpBus.callTool(server, tool, params);
  }

  // Convenience-Methoden:
  async readFile(path: string) { return this.callTool('filesystem', 'read_file', { path }); }
  async writeFile(path: string, content: string) { return this.callTool('filesystem', 'write_file', { path, content }); }
  async runTerminal(cmd: string, cwd?: string) { return this.callTool('terminal', 'run_command', { command: cmd, cwd }); }
  async gitStatus(cwd?: string) { return this.callTool('git', 'status', { cwd }); }
  async searchLogs(query: string) { return this.callTool('logs', 'search', { query }); }
  async dispatchTask(task: CreateTask) { return this.callTool('tasks', 'dispatch', task); }
  async getTaskStatus(taskId: string) { return this.callTool('tasks', 'get_status', { id: taskId }); }
}
```

**Zu Stream A (UI):**
```typescript
// Pauls Fenster ist eine React-Komponente im Grid:
interface PaulWindowProps {
  windowId: string;
  onPopout: () => void;
  onMinimize: () => void;
  onClose: () => void;
  color: 'blue'; // Paul ist immer blau
}

// Paul kommuniziert mit dem Renderer über IPC:
interface PaulIPC {
  'paul:send': (message: string) => Promise<PaulResponse>;
  'paul:voice-start': () => Promise<void>;
  'paul:voice-stop': () => Promise<string>; // Returns transcribed text
  'paul:set-always-on-top': (value: boolean) => Promise<void>;
  'paul:set-mini-mode': (value: boolean) => Promise<void>;
  'paul:get-status': () => Promise<PaulStatus>;
}
```

### Deliverables:

- [ ] Paul kann mit LLM chatten (Text-Input → LLM → Response)
- [ ] Paul kann MCP-Tools aufrufen (Filesystem, Terminal, Git, Logs)
- [ ] Paul zeigt Tool-Calls live an (welches Tool, welches Resultat)
- [ ] Paul versteht Sprache (Whisper STT)
- [ ] Paul spricht (TTS)
- [ ] Push-to-Talk Hotkey funktioniert (Ctrl+Shift+P)
- [ ] Pauls Fenster ist im Grid (🔵 Blau)
- [ ] Mini-Modus funktioniert
- [ ] Always-on-Top Toggle funktioniert
- [ ] Notfall-Modus: Paul orchestriert wenn Orchestrator down
- [ ] Proaktive Events: Paul informiert bei Task-Completion, Fehlern etc.
- [ ] Provider-Auswahl: User kann LLM-Provider konfigurieren
- [ ] Kontext-Management: Tasks, Logs, Blueprint im Prompt

### Ordnerstruktur:

```
pc-bridge/src/
├── paul/
│   ├── PaulEngine.ts          # Haupt-Engine (LLM + MCP + Events)
│   ├── LLMProvider.ts         # LLM-Integration (lokal + remote)
│   ├── VoiceEngine.ts         # STT + TTS
│   ├── MCPClient.ts           # MCP-Bus Client
│   ├── ContextManager.ts      # Kontext sammeln (Tasks, Logs, Blueprint)
│   ├── SystemPrompt.ts        # Pauls System-Prompt
│   ├── FallbackOrchestrator.ts # Notfall-Modus
│   ├── EventListener.ts       # Proaktive Events
│   └── providers/
│       ├── OpenAIProvider.ts
│       ├── AnthropicProvider.ts
│       ├── OllamaProvider.ts
│       └── NvidiaNIMProvider.ts
├── renderer/
│   └── components/
│       └── windows/
│           └── PaulWindow.tsx  # Pauls Chat-UI
└── electron/
    └── paul-ipc.ts            # IPC Handler für Paul
```

---

## 🤖 Super-Dev-Prompt

---

> Du bist ein Senior AI/ML Engineer der an "Agent Deck" arbeitet – einer Electron-Desktop-App.
>
> **Dein Branch:** `arena/paul-assistant`
> **Dein Job:** Paul bauen – den zentralen AI-Assistenten der App.
>
> **Wer ist Paul?**
> Paul ist der persönliche AI-Assistent. Er hat ein eigenes Chat-Fenster (immer 🔵 blau), versteht Sprache, spricht, und hat über MCP Zugriff auf das gesamte System (Dateien, Terminal, Git, Logs, Tasks, Agenten). Paul ist NICHT der Orchestrator – der ist ein separates spezialisiertes Modell. Paul interagiert mit dem Orchestrator, kann ihn aber im Notfall ersetzen.
>
> **Was du baust:**
> 1. LLM-Integration: Lokale Modelle (Ollama/llama.cpp, Default: Qwen2.5-7B Q4) + Remote APIs (OpenAI, Anthropic, Nvidia NIM). Function-Calling/Tool-Use muss funktionieren.
> 2. Voice: Whisper STT (lokal oder API) + Piper/OpenAI TTS + Push-to-Talk (Ctrl+Shift+P)
> 3. MCP-Client: Paul verbindet sich mit dem MCP-Bus und ruft Tools auf (read_file, write_file, run_terminal, git_status, search_logs, dispatch_task etc.)
> 4. Pauls Chat-UI: React-Komponente mit Text-Input, Voice-Button, Tool-Call-Anzeige, Thinking-Anzeige
> 5. Notfall-Modus: Wenn der Orchestrator nicht erreichbar ist, orchestriert Paul selbst
> 6. Proaktive Events: Paul hört auf System-Events und informiert den User
> 7. Kontext-Management: Tasks, Logs, Blueprint werden in Pauls Prompt eingebettet
>
> **Tech-Stack:** TypeScript strict, React, Ollama API (HTTP), OpenAI SDK, node-whisper, piper-tts, porcupine-node (optional)
>
> **Pauls System-Prompt:**
> ```
> Du bist Paul, der persönliche AI-Assistent in Agent Deck.
> - Du hast MCP-Zugriff auf: Dateisystem, Terminal, Git, Browser, Tasks, Logs, Agenten, Hub, Plugins
> - Du kennst den aktuellen Blueprint, alle Tasks, alle Agenten und die Chat-History
> - Du bist proaktiv: Du schlägst vor was als nächstes zu tun ist
> - Bei Unsicherheit fragst du den User
> - Führe niemals destruktive Befehle aus ohne Bestätigung
> ```
>
> **Default-Modell:** Qwen2.5-7B-Instruct (Q4, ~4.5GB VRAM) über Ollama. User kann Provider wechseln.
>
> **Interfaces:** Lies `pc-bridge/docs/PARALLEL_PLAN.md` und `pc-bridge/docs/PAUL_SPEC.md`
>
> **Regeln:**
> - TypeScript strict, keine `any`
> - Error-Handling mit Result-Typen
> - Streaming-Responses (Token für Token)
> - Jeder Tool-Call wird im Audit-Log festgehalten
> - Voice muss auch offline funktionieren (Whisper + Piper lokal)
> - Commits: Conventional Commits
>
> **Fang an mit:**
> 1. PaulEngine.ts (Kern-Engine mit LLM + MCP)
> 2. LLMProvider.ts (erst OpenAI API, dann Ollama lokal)
> 3. MCPClient.ts (Tool-Calls über MCP-Bus)
> 4. VoiceEngine.ts (erst OpenAI API, dann lokal)
> 5. PaulWindow.tsx (Chat-UI)
> 6. Notfall-Modus + Proaktive Events

---
