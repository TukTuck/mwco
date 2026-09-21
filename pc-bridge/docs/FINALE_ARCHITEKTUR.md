# 🏗️ Finale Architektur – Agent Deck Desktop

## Kern-Prinzip: MCP-Server pro Fenster

**Inspiration:** [Terminal Grid](https://marketplace.visualstudio.com/items?itemName=koenma.terminal-grid) – eine VS Code Extension die Terminals in einem Grid anordnet, jedes mit eigenem MCP-Server.

**Unser System:** Das gleiche Prinzip, aber nicht nur Terminals – **alle** Fenster haben einen eigenen MCP-Server.

```
┌─ Agent Deck Desktop ──────────────────────────────────────────────────┐
│                                                                        │
│  ┌── MCP Bus ─────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  Paul ◀──▶ [MCP-Server: Filesystem, Terminal, Git, Browser]    │  │
│  │                                                                  │  │
│  │  ChatGPT Window  ◀──▶ [MCP-Server: Chat, Context]              │  │
│  │  Claude Window   ◀──▶ [MCP-Server: Chat, Context]              │  │
│  │  Arena Window    ◀──▶ [MCP-Server: Chat, Context]              │  │
│  │  Terminal Grid   ◀──▶ [MCP-Server: Grid, Cells, Commands]      │  │
│  │  Log Viewer      ◀──▶ [MCP-Server: Search, Export, Filter]     │  │
│  │  Orchestrator    ◀──▶ [MCP-Server: Tasks, Agents, Status]      │  │
│  │  Plugin: GitHub  ◀──▶ [MCP-Server: Issues, PRs, Actions]       │  │
│  │  Plugin: Ollama  ◀──▶ [MCP-Server: Models, Inference]          │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Wer spricht mit wem:                                                  │
│  • Paul → Alle MCP-Server (allmächtig)                                 │
│  • Orchestrator → Agent-MCP-Server + Task-MCP-Server (spezialisiert)   │
│  • Fenster untereinander → nur über MCP-Bus (nie direkt)              │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Warum MCP-Server pro Fenster?**
- **Modularität:** Jedes Fenster ist eigenständig, kann einzeln entwickelt/getestet werden
- **Erweiterbarkeit:** Plugins sind einfach weitere MCP-Server
- **Sicherheit:** Paul entscheidet wer auf was zugreifen darf
- **Standard:** MCP ist ein offenes Protokoll – bestehende Tools können sich einklinken
- **Terminal Grid Kompatibilität:** Die VS Code Extension kann direkt mit unserem System sprechen

---

## Modell-Konfiguration

### Paul (Allrounder)

| Aspekt | Default | Konfigurierbar |
|--------|---------|----------------|
| **Modell** | Qwen2.5-7B-Instruct (Q4, ~4.5GB) | Ja – jedes Modell mit Tool-Use |
| **VRAM** | ~5 GB | Skaliert mit Modellgröße |
| **Fallback** | Nvidia NIM API (Llama 3.1 8B) | Ja – jede OpenAI-kompatible API |
| **Voice STT** | Whisper small (lokal, ~500MB) | Ja – OpenAI Whisper API als Alternative |
| **Voice TTS** | Piper (lokal, ~50MB) | Ja – OpenAI TTS als Alternative |
| **Mindest-VRAM** | 8 GB | – |

**Warum Qwen2.5-7B als Default für Paul?**
- ~4.5 GB VRAM (Q4-Quantisierung) – passt in 8 GB VRAM
- Exzellentes Tool-Use / Function-Calling
- Deutsch + Englisch
- Schnell genug für Echtzeit-Interaktion
- Open Source – keine API-Kosten

### Orchestrator (Spezialist)

| Aspekt | Default | Konfigurierbar |
|--------|---------|----------------|
| **Modell** | Qwen2.5-1.5B-Instruct (Q4, ~900MB) | Ja – jedes Orchestrierungs-fähige Modell |
| **VRAM** | ~1 GB | Skaliert mit Modellgröße |
| **Kontext** | 4K Tokens reicht | Konfigurierbar |
| **Aufgabe** | NUR: Blueprint → Tasks → Dispatch → Monitor | – |

**Warum Qwen2.5-1.5B als Default für den Orchestrator?**
- ~900 MB VRAM – läuft auf jedem System
- Braucht keinen großen Kontext (nur Blueprint + Task-Liste)
- Spezialisiert auf strukturierte JSON-Ausgabe
- Schnell (< 1 Sekunde pro Decision)

### Gesamt-VRAM-Budget (Minimum 8 GB)

| Komponente | VRAM |
|------------|------|
| Paul (Qwen2.5-7B Q4) | ~4.5 GB |
| Orchestrator (Qwen2.5-1.5B Q4) | ~1 GB |
| Whisper STT (small) | ~0.5 GB |
| Electron + UI | ~1 GB |
| Reserve | ~1 GB |
| **Gesamt** | **~8 GB** |

**Mehr VRAM = mehr Möglichkeiten:**
- 12 GB → Paul mit größerem Modell (14B statt 7B)
- 16 GB → Paul + Orchestrator + lokales Code-Modell
- 24 GB → Alles lokal, keine API-Keys nötig

---

## Datenmodell: Erweiterbar + Brain-ready

**Datenbank:** SQLite (schnell, portabel, erweiterbar)

### Kern-Tabellen

```sql
-- Sessions (Paul-Gespräche, Orchestrierung-Läufe)
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,          -- 'paul_chat', 'orchestration', 'agent_chat'
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    metadata TEXT DEFAULT '{}',  -- JSON: erweiterbar für beliebige Zusatzdaten
    model TEXT,                  -- Welches Modell wurde genutzt
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0
);

-- Messages (in Sessions)
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL,           -- 'user', 'assistant', 'system', 'tool'
    content TEXT NOT NULL,
    thinking TEXT,                -- Thinking/Reasoning (wenn verfügbar)
    tool_calls TEXT,              -- JSON: Tool-Calls die gemacht wurden
    tool_results TEXT,            -- JSON: Ergebnisse der Tool-Calls
    model TEXT,
    tokens_in INTEGER,
    tokens_out INTEGER,
    created_at INTEGER NOT NULL,
    metadata TEXT DEFAULT '{}'    -- JSON: erweiterbar
);

-- Tasks (Orchestrator)
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    blueprint_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    agent_id TEXT,
    status TEXT NOT NULL,          -- 'queued', 'working', 'done', 'failed'
    priority TEXT DEFAULT 'medium',
    depends_on TEXT DEFAULT '[]',  -- JSON: Task-IDs
    result TEXT,                   -- JSON: Task-Ergebnis
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    orchestrator TEXT DEFAULT 'main', -- 'main' oder 'paul_fallback'
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    metadata TEXT DEFAULT '{}'     -- JSON: erweiterbar
);

-- Blueprints
CREATE TABLE blueprints (
    id TEXT PRIMARY KEY,
    project TEXT NOT NULL,
    goal TEXT NOT NULL,
    content TEXT,                  -- Freitext-Blueprint
    parsed TEXT,                   -- JSON: geparste Struktur
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    metadata TEXT DEFAULT '{}'
);

-- Agents
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,            -- 'claude', 'chatgpt', 'arena', 'websocket', 'custom'
    config TEXT NOT NULL,          -- JSON: Agent-spezifische Konfiguration
    capabilities TEXT DEFAULT '[]',-- JSON: Liste von Capabilities
    status TEXT DEFAULT 'offline',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    metadata TEXT DEFAULT '{}'
);

-- Audit Log (jede Aktion)
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    actor TEXT NOT NULL,           -- 'paul', 'orchestrator', 'user', 'system', 'plugin:xyz'
    action TEXT NOT NULL,          -- 'task_dispatch', 'file_write', 'terminal_exec', etc.
    target TEXT,                   -- Was wurde bearbeitet
    details TEXT,                  -- JSON: Details
    success INTEGER NOT NULL       -- 1 = Erfolg, 0 = Fehler
);

-- Brain (Wissensspeicher, erweiterbar)
CREATE TABLE brain (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,            -- 'fact', 'decision', 'preference', 'context', 'memory'
    content TEXT NOT NULL,
    embedding BLOB,               -- Vektor-Embedding für semantische Suche (optional)
    source TEXT,                   -- Woher kommt diese Info
    relevance REAL DEFAULT 1.0,   -- Relevanz-Score
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    metadata TEXT DEFAULT '{}'
);

-- Window Layouts
CREATE TABLE layouts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    windows TEXT NOT NULL,         -- JSON: Array von WindowPanel-Objekten
    is_default INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);

-- Plugins
CREATE TABLE plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT,
    enabled INTEGER DEFAULT 1,
    config TEXT DEFAULT '{}',      -- JSON
    mcp_endpoint TEXT,             -- MCP-Server Endpoint
    installed_at INTEGER NOT NULL
);

-- Indizes für Performance
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_blueprint ON tasks(blueprint_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_actor ON audit_log(actor);
CREATE INDEX idx_brain_type ON brain(type);
CREATE INDEX idx_brain_embedding ON brain(embedding); -- Für Vektor-Suche
```

**Warum `metadata TEXT DEFAULT '{}'` überall?**
- Jede Tabelle hat ein JSON-Feld für beliebige Erweiterungen
- Plugins können eigene Daten anhängen ohne Schema-Migration
- Brain-Embeddings können nachträglich hinzugefügt werden
- Future-proof: Neue Features brauchen keine DB-Migration

---

## Hub / Worker Architektur

```
                    Tailscale VPN
                    ┌──────────────────────────────┐
                    │                                │
    ┌──────────┐   │   ┌──────────┐              │   ┌──────────┐
    │ Android  │──▶│   │  HUB     │              │   │ Worker-1 │
    │  App     │   │   │ (Bridge  │◀─── MCP ───▶│   │ (Bridge  │
    └──────────┘   │   │ + Paul   │              │   │ + Terminal│
                    │   │ + Orch.) │              │   │ + FS)    │
                    │   └──────────┘              │   └──────────┘
                    │        │                      │
                    │   ┌────┴────┐                 │   ┌──────────┐
                    │   │ Worker-2│                 │   │ Worker-3 │
                    │   │ (Bridge │                 │   │ (Bridge  │
                    │   │ + Git)  │                 │   │ + Code)  │
                    │   └─────────┘                 │   └──────────┘
                    └────────────────────────────────┘
```

**Worker-Registrierung:**
1. Worker startet Bridge mit `--hub-url wss://hub-ip:8765`
2. Hub authentifiziert Worker über Tailscale-Identity
3. Worker registriert seine Capabilities (Terminal, Git, Filesystem, Code)
4. Hub fügt Worker zur Registry hinzu
5. Orchestrator kann Worker für passende Tasks nutzen

**Task-Flow über Hub:**
```
Orchestrator: "Task X braucht Terminal → Worker-1 hat Terminal"
    → Dispatch an Worker-1 via MCP
    → Worker-1 führt aus
    → Result zurück an Hub
    → Hub an Orchestrator
    → Paul informiert User
```

**GitHub-Sync:**
```
Worker kriegt Auftrag: "Erstelle React-Komponente"
    → Worker schreibt Code lokal
    → Worker pushed zu GitHub Branch
    → Orchestrator prüft: "Ist der Push da?"
    → Paul informiert User: "Code ist auf Branch feature/task-014"
```

---

## Design-System

**Empfehlung: Shadcn/UI + Tailwind CSS**

| Aspekt | Wahl |
|--------|------|
| **Framework** | Shadcn/UI (React-Komponenten, headless, anpassbar) |
| **CSS** | Tailwind CSS |
| **Dark Mode** | Default (Developer-Tool) |
| **Accent-Farbe** | Blau (#3B82F6) für Paul, konfigurierbar pro Fenster |
| **Schrift** | Inter (UI) + JetBrains Mono (Code/Logs) |
| **Icons** | Lucide Icons |
| **Animationen** | Framer Motion (subtle) |

**Warum Shadcn?**
- Nicht vorgefertigt – wir designen selbst, Shadcn gibt die Basis
- Headless = volle Kontrolle über das Aussehen
- Accessibility eingebaut
- Open Source
- Passt perfekt zu Tailwind

---

## Offene Punkte (für später)

Diese Punkte sind noch nicht final entschieden, aber die Architektur ist so gebaut dass sie nachträglich eingebaut werden können:

1. **Genauer Worker-Sync-Mechanismus** – Wie genau werden Worker-Ergebnisse mit dem Hub abgeglichen?
2. **Brain-Embedding-Modell** – Welches Modell für Vektor-Embeddings? (MiniLM, Nomic-Embed?)
3. **Plugin-Store** – Wo werden Plugins gehostet? (GitHub, eigener Server?)
4. **WebChat-Details** – Welche WebChats zuerst? (ChatGPT, Claude, Arena, Perplexity?)
5. **Voice Wake-Word** – "Hey Paul" mit Porcupine oder offen?

---

## Phasen (aktualisiert)

| Phase | Scope | Dauer |
|-------|-------|-------|
| **1** | Electron Shell + Grid-Layout + Tray + Design-System | 1.5 Wochen |
| **2** | MCP-Bus + MCP-Server-Registry | 1 Woche |
| **3** | Paul (LLM + Voice + MCP-Tools + Fenster) | 2 Wochen |
| **4** | Orchestrator (lokal + State Machine + Modell-Loader) | 1.5 Wochen |
| **5** | WebChat-Fenster (Einbetten + Pop-out + Farben) | 1.5 Wochen |
| **6** | Terminal Grid (MCP-Server + Grid-Layout) | 1 Woche |
| **7** | Log-System + Export + Vergleich + SQLite | 1 Woche |
| **8** | Tailscale Hub/Worker + Discovery | 1.5 Wochen |
| **9** | Plugin-System + GitHub-Connector | 1.5 Wochen |
| **10** | Installer + Winget + Auto-Update | 1 Woche |
| **11** | Brain (Wissensspeicher + Embeddings) | 1 Woche |

**Gesamt: ~14 Wochen**
