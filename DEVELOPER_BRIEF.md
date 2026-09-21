# 🛠️ Developer Briefing – Stream A: UI / Frontend

## Kontext

Du arbeitest an **Agent Deck Desktop** – einer Electron-App die als AI Agent Cockpit fungiert. Lies `pc-bridge/docs/FINALE_ARCHITEKTUR.md` und `pc-bridge/docs/UI_LAYOUT_SPEC.md` für das Gesamtbild.

## Dein Job: Electron Shell + React UI + Grid-Layout

Du baust alles was der User **sieht und anfasst**. Die gesamte UI-Schicht.

### Was du baust:

1. **Electron Shell**
   - Hauptfenster (BrowserWindow)
   - System-Tray Icon mit Kontextmenü
   - Window-Management (Pop-out, Pop-in, Always-on-Top)
   - Auto-Start, Graceful Shutdown
   - IPC-Bridge zwischen Renderer und Main Process

2. **React App**
   - App-Shell mit Sidebar-Navigation
   - Grid-Layout System (drag & drop, resize, snap)
   - Fenster-Komponenten (WebChat, Terminal, Logs, Paul, Settings, Dashboard)
   - Auto-Sort Algorithmus (1→Vollbild, 2→50/50, 3→2+1, 4→2×2)
   - Farb-Codierung pro Fenster
   - Layout Speichern/Laden

3. **Design-System**
   - Shadcn/UI Komponenten
   - Tailwind CSS
   - Dark Mode (Default)
   - Inter (UI) + JetBrains Mono (Code/Logs)
   - Lucide Icons
   - Framer Motion (subtle Animationen)

4. **Einstellungen-UI**
   - LLM-Provider Konfiguration (Paul, Orchestrator)
   - API-Key Management
   - Sicherheits-Einstellungen
   - Hub/Worker Konfiguration
   - Plugin-Verwaltung

5. **Log-Viewer UI**
   - Suchfunktion + Filter
   - JSON/JSONL/Markdown Export-Buttons
   - Vergleichsfunktion (2 Sessions nebeneinander)
   - Syntax-Highlighting für Code in Logs

### Tech-Stack:

- **Shell:** Electron 33+
- **UI:** React 18 + TypeScript strict
- **Styling:** Tailwind CSS 3 + Shadcn/UI
- **Grid:** react-grid-layout ODER react-resizable-panels
- **Icons:** Lucide React
- **Animation:** Framer Motion
- **Build:** Vite (für React) + electron-builder (für Installer)
- **State:** Zustand (lightweight) oder React Context

### Interfaces die du einhalten musst:

**IPC zu Stream B (Backend):**
```typescript
// Diese Channels musst du im Renderer nutzen:
interface RendererToMain {
  'mcp:call': (server: string, tool: string, params: unknown) => Promise<unknown>;
  'mcp:list-servers': () => Promise<string[]>;
  'mcp:list-tools': (server?: string) => Promise<MCPToolDef[]>;
  'db:sessions:list': (filter?: SessionFilter) => Promise<Session[]>;
  'db:messages:search': (query: string) => Promise<Message[]>;
  'db:messages:export': (sessionId: string, format: string) => Promise<string>;
  'db:tasks:list': (filter?: TaskFilter) => Promise<Task[]>;
  'db:audit:search': (filter: AuditFilter) => Promise<AuditEntry[]>;
  'layout:save': (name: string, layout: WindowLayout) => Promise<void>;
  'layout:load': (name: string) => Promise<WindowLayout | null>;
  'layout:list': () => Promise<string[]>;
  'config:get': (key: string) => Promise<unknown>;
  'config:set': (key: string, value: unknown) => Promise<void>;
  'window:popout': (windowId: string) => Promise<void>;
  'window:popin': (windowId: string) => Promise<void>;
  'window:set-always-on-top': (windowId: string, value: boolean) => Promise<void>;
}

// Diese Channels kommen vom Main Process:
interface MainToRenderer {
  'paul:message': (message: PaulMessage) => void;
  'orchestrator:status': (status: OrchestratorStatus) => void;
  'task:updated': (task: Task) => void;
  'agent:status-changed': (agentId: string, status: AgentStatus) => void;
  'system:event': (event: SystemEvent) => void;
}
```

**Fenster-Typen die du unterstützen musst:**
```typescript
type WindowType =
  | 'webchat'      // ChatGPT, Claude, Arena etc. (WebView)
  | 'terminal'     // Terminal Grid
  | 'paul'         // Paul Assistent
  | 'logs'         // Log-Viewer
  | 'settings'     // Einstellungen
  | 'dashboard';   // Dashboard/Übersicht

interface WindowPanel {
  id: string;
  type: WindowType;
  title: string;
  color: 'blue' | 'purple' | 'green' | 'yellow' | 'orange' | 'red' | 'gray';
  position: { x: number; y: number; w: number; h: number };
  pinned: boolean;
  minimized: boolean;
  poppedOut: boolean;
  config: Record<string, unknown>; // Typ-spezifisch
}
```

### Deliverables:

- [ ] Electron-App startet und zeigt Grid-Layout
- [ ] Fenster können hinzugefügt, verschoben, skaliert werden
- [ ] Pop-out (eigenständiges OS-Fenster) funktioniert
- [ ] Pop-in (zurück ins Grid) funktioniert
- [ ] Auto-Sort Knopf sortiert logisch
- [ ] Farb-Codierung pro Fenster
- [ ] Layouts speichern/laden (über IPC an Backend)
- [ ] System-Tray Icon mit Menü (Status, Beenden)
- [ ] Settings-Seite (alle Konfigurations-Optionen)
- [ ] Log-Viewer mit Suche + Filter + Export-Buttons
- [ ] Dashboard mit Status-Übersicht
- [ ] Dark Mode + Design-System konsistent
- [ ] Responsive (Grid passt sich an Fenstergröße an)

### Ordnerstruktur:

```
pc-bridge/src/
├── electron/
│   ├── main.ts              # Electron Main Process
│   ├── preload.ts           # Preload Script (IPC-Bridge)
│   ├── tray.ts              # System-Tray
│   ├── windowManager.ts     # BrowserWindow Management
│   └── ipcHandlers.ts       # IPC Handler (brücken zu Backend)
├── renderer/
│   ├── App.tsx              # React App Root
│   ├── main.tsx             # React Entry Point
│   ├── components/
│   │   ├── layout/
│   │   │   ├── GridLayout.tsx
│   │   │   ├── WindowPanel.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── AutoSort.ts
│   │   ├── windows/
│   │   │   ├── WebChatWindow.tsx
│   │   │   ├── TerminalWindow.tsx
│   │   │   ├── PaulWindow.tsx
│   │   │   ├── LogViewerWindow.tsx
│   │   │   ├── SettingsWindow.tsx
│   │   │   └── DashboardWindow.tsx
│   │   ├── ui/              # Shadcn-Komponenten
│   │   └── common/          # Shared Components
│   ├── hooks/
│   │   ├── useMCP.ts        # MCP-Bus Hook
│   │   ├── useLayout.ts     # Layout Management Hook
│   │   └── useIPC.ts        # IPC Communication Hook
│   ├── store/
│   │   └── appStore.ts      # Zustand Store
│   └── styles/
│       └── globals.css      # Tailwind Imports + Custom Styles
├── shared/
│   └── types.ts             # Shared Types (Renderer + Main)
└── index.html
```

---

## 🤖 Super-Dev-Prompt

---

> Du bist ein Senior React/Electron Developer der an einem Desktop-App-Projekt namens "Agent Deck" arbeitet.
>
> **Dein Branch:** `arena/ui-frontend`
> **Dein Job:** Electron Shell + React UI + Grid-Layout bauen
>
> **Was ist Agent Deck?**
> Eine Desktop-App die als AI Agent Cockpit fungiert. Mehrere AI-Chatfenster (ChatGPT, Claude, Arena) werden in einem flexiblen Grid-Layout eingebettet. Ein Assistent namens "Paul" hat ein eigenes Fenster. Es gibt Terminal-Grid, Log-Viewer, Dashboard, Settings – alles in einem Grid das der User frei anordnen kann. Fenster können rausgepoppt werden als eigenständige OS-Fenster, und wieder reingedockt.
>
> **Was du baust:**
> 1. Electron Main Process (BrowserWindow, Tray, IPC, Window-Management)
> 2. React App mit Grid-Layout (drag & drop, resize, snap, auto-sort)
> 3. Design-System (Shadcn/UI + Tailwind, Dark Mode Default)
> 4. Fenster-Komponenten für: WebChat (WebView), Terminal, Paul, Logs, Settings, Dashboard
> 5. Pop-out/Pop-in System (BrowserWindow erstellen/zerstören)
> 6. Layout Speichern/Laden (über IPC an Backend)
> 7. Log-Viewer mit Suche, Filter, Export, Vergleichsfunktion
>
> **Tech-Stack:** Electron 33+, React 18, TypeScript strict, Tailwind CSS, Shadcn/UI, Vite, Zustand, Framer Motion, Lucide Icons
>
> **Grid-Layout Anforderungen:**
> - Fenster frei positionierbar per Drag & Drop
> - Größe an allen Kanten und Ecken änderbar
> - Snap an Grid-Punkten (25%, 33%, 50%, 66%, 75%, 100%)
> - Pin/Unpin (im Layout fixieren)
> - Minimize (in Sidebar einklappen)
> - Auto-Sort Knopf: 1=Vollbild, 2=50/50, 3=2+1, 4=2×2, 5+=intelligent
> - Farb-Codierung: 🔵🟣🟢🟡🟠🔴⚪
> - Layouts als Presets speichern/laden
>
> **Interfaces:** Lies `pc-bridge/docs/PARALLEL_PLAN.md` für die exakten IPC-Channels die du anbieten musst und die du vom Backend erwarten kannst.
>
> **UI-Specs:** Lies `pc-bridge/docs/UI_LAYOUT_SPEC.md` für Layout-Details und `pc-bridge/docs/PAUL_SPEC.md` für Pauls Fenster.
>
> **Design:**
> - Dark Mode Default (Developer-Tool)
> - Shadcn/UI Komponenten (nicht vorgefertigt, wir designen selbst)
> - Inter (UI-Text) + JetBrains Mono (Code/Logs)
> - Accent: Blau (#3B82F6) für Paul, konfigurierbar pro Fenster
> - Lucide Icons
> - Subtle Animationen mit Framer Motion
>
> **Regeln:**
> - TypeScript strict, keine `any`
> - Alle Komponenten in eigene Dateien
> - Accessibility (aria-labels, keyboard navigation)
> - Electron Security Best Practices (contextIsolation, nodeIntegration=false)
> - Commits mit Conventional Commits
>
> **Fang an mit:**
> 1. `npm create vite@latest` im renderer Ordner (React + TypeScript)
> 2. Electron Main Process aufsetzen (main.ts + preload.ts)
> 3. Shadcn/UI initialisieren (`npx shadcn-ui@latest init`)
> 4. Tailwind konfigurieren + Dark Mode
> 5. Grid-Layout Komponente bauen (erst statisch, dann drag & drop)
> 6. Erstes Fenster (Dashboard) als Proof of Concept
> 7. Dann die restlichen Fenster

---
