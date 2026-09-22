# 🎨 UI-Layout & Fenster-System – Detail-Spezifikation

## 1. Grundfenster mit Grid-Layout

**Konzept:** Ein flexibles Grid wo Fenster reingepinnt und frei skaliert werden können.

```
┌─ Agent Deck ──────────────────────────────────────────────────────────┐
│  📊 Dashboard  💬 Chats  🔧 Agenten  📋 Logs  ⚙ Settings  🧩 Plugins│
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌── ChatGPT ────────┐  ┌── Claude ────────────────────────┐         │
│  │                    │  │                                   │         │
│  │  (50% Breite)      │  │  (50% Breite)                     │         │
│  │  🔵 Blau           │  │  🟣 Lila                          │         │
│  │  📌 Gepinnt        │  │  📌 Gepinnt                       │         │
│  │                    │  │                                   │         │
│  ├────────────────────┤  │                                   │         │
│  │                    │  │                                   │         │
│  │  Arena             │  │                                   │         │
│  │  (50% Breite)      │  ├───────────────────────────────────┤         │
│  │  🟢 Grün           │  │  📋 Logs                          │         │
│  │  📌 Gepinnt        │  │  (50% Breite, unter Claude)       │         │
│  │                    │  │  🟡 Gelb                          │         │
│  └────────────────────┘  └───────────────────────────────────┘         │
│                                                                        │
│  [📐 Auto-Sortieren]  [+ Fenster hinzufügen]  [💾 Layout speichern]   │
│                                                                        │
├───────────────────────────────────────────────────────────────────────┤
│  🔗 Hub: 3 Worker │ Agenten: 5 aktiv │ Tasks: 2 │ NPC: 🟢 aktiv      │
└───────────────────────────────────────────────────────────────────────┘
```

### Features:

**Fenster-Management:**
- **Drag & Drop** – Fenster frei positionieren
- **Resize** – Größe an allen Kanten und Ecken änderbar
- **Snap** – Automatisches Einrasten an Grid-Punkten (25%, 33%, 50%, 66%, 75%, 100%)
- **Pin/Unpin** – Fenster im Layout fixieren oder lösen
- **Minimize** – In die Sidebar einklappen
- **Pop-out** → Eigenständiges OS-Fenster
- **Pop-in** → Zurück ins Grid docken

**Auto-Sortieren (📐 Knopf):**
```
1 Fenster:    100% Breite, 100% Höhe
2 Fenster:    50/50 nebeneinander
3 Fenster:    2 oben (50/50), 1 unten (100%)
4 Fenster:    2x2 Grid
5+ Fenster:   Intelligentes Grid basierend auf Priorität und Größe
```

**Farbcodierung:**
- Jedes Fenster hat eine Akzentfarbe (Titelbar + Rand)
- Farben: 🔵 Blau, 🟣 Lila, 🟢 Grün, 🟡 Gelb, 🟠 Orange, 🔴 Rot, ⚪ Grau
- User wählt Farbe beim Erstellen oder in den Fenster-Einstellungen
- Farben helfen bei der Orientierung (z.B. alle Coding-Agenten = Grün, alle Chat = Blau)

**Layouts speichern:**
- "Layout speichern" → Name eingeben (z.B. "Coding-Setup", "Research-Setup")
- "Layout laden" → Aus Liste wählen
- Default-Layout wird automatisch gespeichert

---

## 2. WebChat-Fenster mit MCP/Plugin-Zugriff

**Deine Idee:** Wenn ein WebChat-Fenster schon rausgepoppt ist, soll es auch als Windows-Assistent fungieren können – mit MCP-Zugriff auf lokale Tools.

**Konzept:**

```
┌── ChatGPT (Pop-out) ──────────────────────────────────┐
│                                                         │
│  ┌─ Agent Deck Toolbar ─────────────────────────────┐ │
│  │ 🔌 MCP: Aktiv │ 📁 Dateien │ 🖥 Terminal │ 🎤 Voice│ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ ChatGPT WebChat ────────────────────────────────┐ │
│  │                                                    │ │
│  │  User: "Erstelle eine React-Komponente für..."    │ │
│  │                                                    │ │
│  │  ChatGPT: "Hier ist die Komponente..."            │ │
│  │                                                    │ │
│  │  ┌─ MCP Tool Call ─────────────────────────────┐ │ │
│  │  │ 📁 write_file("Button.tsx", "...")            │ │ │
│  │  │ ✅ Geschrieben (245 bytes)                    │ │ │
│  │  │ 🖥 terminal("npm run build")                  │ │ │
│  │  │ ✅ Build erfolgreich                          │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  📌 Pin  🎨 Farbe  ↗ Pop-out  ❌ Schließen             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### MCP-Integration im WebChat-Fenster:

**Was ist MCP?**  
Model Context Protocol – ein offenes Protokoll das AI-Modellen Zugriff auf lokale Tools gibt (Dateisystem, Terminal, Datenbank, etc.)

**Was wir machen:**
- Jedes WebChat-Fenster hat eine **MCP-Toolbar**
- Wenn der WebChat MCP unterstützt (Claude, ChatGPT mit Plugins), injizieren wir die MCP-Tools
- Der Chat kann dann direkt Dateien schreiben, Terminal-Befehle ausführen, etc.

**Technisch:**
```
WebChat (BrowserWindow)
    │
    ├── preload.js (injiziert MCP-Client)
    │
    ├── MCP Server (läuft in der Bridge)
    │   ├── FilesystemTool (read/write/list/search)
    │   ├── TerminalTool (execute commands)
    │   ├── GitTool (status/diff/commit)
    │   ├── BrowserTool (navigate/click/screenshot)
    │   └── CustomPluginTools (von Plugins registriert)
    │
    └── Agent Deck API (Kontext, Logs, Tasks)
```

**Windows-Assistent-Modus:**
- WebChat-Fenster kann als **Always-on-Top** gesetzt werden
- Hotkey zum Ein-/Ausblenden (z.B. Ctrl+Shift+A)
- Funktioniert wie Cortana/Copilot, aber mit DEINEM bevorzugten AI-Modell

---

## 3. NPC MCP Pack – Der Allround-Agent

**Deine Idee:** Ein NPC (Non-Player Character) der als Allround-Agent agiert, sich mit allem auskennt und selbstständig arbeitet.

**Konzept:**

```
┌── NPC Assistent ──────────────────────────────────┐
│                                                     │
│  🤖 "Hallo! Ich bin dein NPC-Assistent."           │
│                                                     │
│  "Ich sehe du hast 3 Tasks offen:"                 │
│  "  1. MainActivity.kt erstellen (Claude)"         │
│  "  2. API-Protokoll definieren (ChatGPT)"         │
│  "  3. Tests schreiben (Arena)"                    │
│                                                     │
│  "Soll ich Claude bitten mit Task 1 anzufangen?"   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🎤 Sprich oder tippe...                     │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  MCP Tools:                                         │
│  ✅ Dateisystem  ✅ Terminal  ✅ Git  ✅ Browser    │
│  ✅ WebChats     ✅ Logs      ✅ Tasks  ✅ Plugins  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Was der NPC kann:

**Kontext-Bewusstsein:**
- Kennt alle offenen Tasks
- Kennt alle verbundenen Agenten
- Kennt den aktuellen Blueprint
- Kennt die Chat-History aller WebChats
- Kennt die Logs

**Selbstständige Aktionen:**
- Tasks an passende Agenten dispatchen
- Ergebnisse prüfen und zusammenführen
- Bei Problemen nachfragen oder neu formulieren
- Logs durchsuchen und analysieren
- Dateien erstellen/bearbeiten
- Terminal-Befehle ausführen
- Git-Operationen durchführen

**MCP Tools für den NPC:**

| Tool | Beschreibung |
|------|-------------|
| `filesystem` | Dateien lesen/schreiben/suchen |
| `terminal` | Shell-Befehle ausführen |
| `git` | Git-Operationen |
| `browser` | Webseiten navigieren, Screenshots |
| `webchats` | Mit eingebetteten WebChats interagieren |
| `tasks` | Tasks erstellen/dispatchen/überwachen |
| `logs` | Logs durchsuchen, exportieren |
| `plugins` | Plugin-Funktionen aufrufen |
| `agents` | Agenten starten/stoppen/konfigurieren |
| `hub` | Worker-PCs verwalten |

**NPC-Verhalten:**
```
User: "Hey NPC, bau mir das Android-Projekt auf."

NPC: "Alles klar! Ich sehe du hast diesen Blueprint:
      [zeigt Blueprint]

      Ich schlage vor:
      1. Claude fragt die Architektur prüfen
      2. Arena die Projektstruktur erstellen lassen
      3. ChatGPT das JSON-Protokoll definieren

      Soll ich anfangen?"

User: "Ja, leg los."

NPC: "Perfekt. Ich dispatche jetzt:
      → Claude: Architektur-Review (Task #1)
      → ChatGPT: Protokoll-Design (Task #2)
      
      [zeigt Live-Status]
      
      Claude ist fertig! Ergebnis:
      [zeigt Review]
      
      Dispatche jetzt Arena für die Projektstruktur...
      [zeigt Fortschritt]"
```

### NPC-Konfiguration:

```json
{
  "npc": {
    "enabled": true,
    "provider": "openai",
    "model": "gpt-4o",
    "voice": {
      "stt": "whisper-large-v3",
      "tts": "openai-tts-1",
      "voice_id": "nova"
    },
    "context": {
      "include_tasks": true,
      "include_logs": true,
      "include_chats": true,
      "include_blueprint": true
    },
    "mcp_tools": [
      "filesystem",
      "terminal",
      "git",
      "browser",
      "webchats",
      "tasks",
      "logs",
      "plugins",
      "agents",
      "hub"
    ],
    "hotkey": "Ctrl+Shift+N",
    "always_on_top": false
  }
}
```

---

## 4. Technische Umsetzung

### Fenster-System (Grid-Layout):

**Library:** `react-grid-layout` oder `react-resizable-panels`

```typescript
interface WindowPanel {
  id: string;
  type: 'webchat' | 'logs' | 'terminal' | 'npc' | 'dashboard' | 'settings';
  title: string;
  color: PanelColor;
  position: { x: number; y: number; w: number; h: number };
  pinned: boolean;
  minimized: boolean;
  poppedOut: boolean;
  config: Record<string, unknown>;
}

type PanelColor = 'blue' | 'purple' | 'green' | 'yellow' | 'orange' | 'red' | 'gray';
```

### MCP-Server in der Bridge:

```typescript
class MCPBridgeServer {
  private tools: Map<string, MCPTool> = new Map();

  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  async executeTool(name: string, params: unknown): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return tool.execute(params);
  }
}

// Registrierte Tools:
mcpServer.registerTool(new FilesystemTool(config));
mcpServer.registerTool(new TerminalTool(config));
mcpServer.registerTool(new GitTool(config));
// ... etc
```

### NPC-Agent:

```typescript
class NPCAgent {
  constructor(
    private llmProvider: LLMProvider,
    private mcpServer: MCPBridgeServer,
    private context: NPCContext
  ) {}

  async handleUserInput(input: string): Promise<string> {
    const context = await this.gatherContext();
    const tools = this.mcpServer.getAvailableTools();
    
    const response = await this.llmProvider.complete({
      systemPrompt: NPC_SYSTEM_PROMPT,
      userMessage: input,
      context: context,
      tools: tools,
    });

    if (response.toolCalls) {
      for (const call of response.toolCalls) {
        const result = await this.mcpServer.executeTool(call.name, call.params);
        // Feed result back to LLM
      }
    }

    return response.text;
  }
}
```

---

## 5. Zusammenfassung der neuen Features

| Feature | Beschreibung | Aufwand |
|---------|-------------|---------|
| **Grid-Layout** | Fenster frei positionieren + skalieren | Mittel |
| **Auto-Sortieren** | Logische Anordnung per Knopfdruck | Niedrig |
| **Farbcodierung** | Fenster einfärben zur Orientierung | Niedrig |
| **Layout speichern** | Layouts als Presets speichern/laden | Niedrig |
| **MCP in WebChat** | Pop-out Fenster mit MCP-Tool-Zugriff | Hoch |
| **Windows-Assistent** | Always-on-Top + Hotkey | Niedrig |
| **NPC Agent** | Allround-Assistent mit vollem MCP-Zugriff | Hoch |
| **NPC Voice** | Spracheingabe + Sprachausgabe | Mittel |

---

## 6. Aktualisierte Phasen

| Phase | Scope | Dauer |
|-------|-------|-------|
| **1** | Electron Shell + Grid-Layout + Tray | 1.5 Wochen |
| **2** | WebSocket-Bridge (Terminal, FS, Git) | 1 Woche |
| **3** | WebChat-Integration (Pop-out/Dock/Farben) | 1.5 Wochen |
| **4** | MCP-Server + Tool-Registry | 1 Woche |
| **5** | Tailscale Hub/Worker + Discovery | 1 Woche |
| **6** | Log-System + Export + Vergleich | 1 Woche |
| **7** | NPC Agent + Voice | 1.5 Wochen |
| **8** | Plugin-System + GitHub-Connector | 1 Woche |
| **9** | Installer + Winget + Auto-Update | 3-5 Tage |

**Gesamt: ~10 Wochen**
