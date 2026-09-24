# Code-Map – Wo ist was?

Diese Datei ist ein Wegweiser durch den Codebase. Sie erklärt welche Datei was macht und wie die Komponenten zusammenhängen.

---

## 📂 Projektstruktur

```
mwco/
├── app/
│   ├── build.gradle.kts              # Dependencies + Build-Config
│   ├── proguard-rules.pro            # ProGuard-Regeln für Release-Build
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml   # Permissions + Service-Deklaration
│       │   ├── kotlin/com/agentdeck/
│       │   │   ├── AgentDeckApp.kt   # Application-Klasse (Koin + Timber Init)
│       │   │   ├── MainActivity.kt   # Entry Point (Compose)
│       │   │   ├── agents/           # Agent-Clients
│       │   │   ├── core/             # Domain + Orchestrierung + Security
│       │   │   ├── data/             # Database + Repositories
│       │   │   ├── di/               # Koin Dependency Injection
│       │   │   ├── llm/              # LLM-Provider
│       │   │   ├── service/          # Android Services
│       │   │   └── ui/               # Compose UI
│       │   └── res/                  # Android Resources
│       └── test/                     # Unit Tests
├── docs/
│   └── DECISIONS.md                  # Architecture Decision Records
├── build.gradle.kts                  # Root Build-File (Plugin-Versionen)
├── settings.gradle.kts               # Gradle Settings
└── gradle/                           # Gradle Wrapper
```

---

## 🧭 Komponentendiagramm

```
User
 │
 ▼
┌──────────────────────────────────────────────────────────────────┐
│                         UI Layer (Compose)                        │
│                                                                   │
│  DashboardScreen ──┐                                              │
│  BlueprintEditor ──┤                                              │
│  TaskGraphScreen ──┤── ViewModels ──┐                             │
│  LLMSettings ──────┘                │                             │
└──────────────────────────────────────┼───────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Domain Layer (pure Kotlin)                  │
│                                                                   │
│  Blueprint ─── Task ─── Agent ─── OrchestratorState              │
│                                                                   │
│  Orchestrator (State Machine + LLM + Agent Dispatch)             │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│   LLM Providers  │  │  Agent Clients   │  │   Data Layer       │
│                  │  │                  │  │                    │
│ NvidiaNIM ──────┐│  │ Claude ─────────┐│  │ Room Database     │
│ OpenAI ─────────┤│  │ ChatGPT ────────┤│  │ (Blueprint, Task, │
│ ONNXLite ───────┤│  │ Arena (Mock) ───┤│  │  Agent, Project)  │
│ LlamaCpp ───────┘│  │ WebSocket ──────┘│  │                    │
│                  │  │                  │  │ Repositories        │
│ Interface:       │  │ Interface:       │  │ (CRUD + Flows)      │
│ LLMProvider      │  │ AgentClient      │  │                    │
└──────────────────┘  └──────────────────┘  └────────────────────┘
              │                    │
              ▼                    ▼
         Remote APIs          Remote APIs
     (Nvidia, OpenAI)    (Anthropic, OpenAI)
```

---

## 📁 Detail: Core Layer

### `core/domain/`

| Datei | Zweck | Warum |
|-------|-------|-------|
| `Blueprint.kt` | Master-Plan Entität | Treibt die gesamte Orchestrierung an |
| `Task.kt` | Unit of Work mit Dependencies | DAG-Struktur für parallele Ausführung |
| `Agent.kt` | Agent mit Capabilities | Capability-Matching für Task-Zuweisung |

### `core/orchestration/`

| Datei | Zweck | Warum |
|-------|-------|-------|
| `OrchestratorState.kt` | State Machine (sealed class) | Deterministischer Kern – kein LLM nötig |
| `Orchestrator.kt` | Koordiniert alles | Hybrid: Regeln + LLM |

### `core/common/`

| Datei | Zweck | Warum |
|-------|-------|-------|
| `SecureKeyStore.kt` | API-Keys verschlüsselt speichern | Security: AES256-GCM via Android Keystore |
| `RateLimiter.kt` | Rate Limits pro Agent | Kostenkontrolle + API-Schutz |

---

## 📁 Detail: LLM Layer

### `llm/api/`

| Datei | Zweck | Warum |
|-------|-------|-------|
| `LLMProvider.kt` | Interface für alle Provider | Austauschbarkeit (lokal/remote) |
| `LLMProviderFactory.kt` | Factory + Auto-Detection | Wählt besten Provider basierend auf RAM/API-Key |

### `llm/local/`

| Datei | Zweck | Status |
|-------|-------|--------|
| `ONNXLiteProvider.kt` | MiniLM (~80MB) | ⚠️ Mock – kein echtes ONNX-Loading |
| `LlamaCppProvider.kt` | GGUF-Modelle | ⚠️ Mock – kein JNI-Binding |

### `llm/remote/`

| Datei | Zweck | Status |
|-------|-------|--------|
| `NvidiaNIMProvider.kt` | Nvidia NIM API | ✅ Echt (mit SSE-Streaming) |
| `OpenAIProvider.kt` | OpenAI + kompatible | ✅ Echt (mit SSE-Streaming) |

---

## 📁 Detail: Agents Layer

### `agents/api/`

| Datei | Zweck | Warum |
|-------|-------|-------|
| `AgentClient.kt` | Interface für alle Clients | Einheitliche API für Orchestrator |
| `AgentRegistry.kt` | Registry + Capability-Matching | Findet besten Agenten für Task |

### `agents/` (Implementierungen)

| Datei | Agent | API | Status |
|-------|-------|-----|--------|
| `claude/ClaudeAgentClient.kt` | Claude | Anthropic Messages | ✅ Echt |
| `chatgpt/ChatGPTAgentClient.kt` | ChatGPT | OpenAI Chat Completions | ✅ Echt |
| `arena/ArenaAgentClient.kt` | Arena | (keine) | ⚠️ Mock |
| `websocket/WebSocketAgentClient.kt` | PC-Bridge | WebSocket | ✅ Implementiert (keine Bridge zum Testen) |
| `AgentClientFactory.kt` | Factory | – | ✅ Erstellt alle Clients aus Keystore |

---

## 📁 Detail: Data Layer

### `data/database/`

| Datei | Zweck |
|-------|-------|
| `AppDatabase.kt` | Room Database mit 4 Entities (Blueprint, Task, Agent, Project) + 4 DAOs |

### `data/repository/`

| Datei | Zweck |
|-------|-------|
| `BlueprintRepository.kt` | CRUD für Blueprints + JSON-Konvertierung |
| `TaskRepository.kt` | CRUD für Tasks + Status-Updates |
| `AgentRepository.kt` | CRUD für Agenten-Konfiguration |

---

## 📁 Detail: UI Layer

### `ui/`

| Datei | Screen | Navigation |
|-------|--------|------------|
| `dashboard/DashboardScreen.kt` | Haupt-Dashboard | Start-Screen |
| `blueprint/BlueprintEditorScreen.kt` | Blueprint erstellen | Von Dashboard |
| `tasks/TaskGraphScreen.kt` | Task-Übersicht | Von Dashboard |
| `settings/LLMSettingsScreen.kt` | LLM-Provider Config | Von Dashboard |
| `navigation/AgentDeckNavHost.kt` | Navigation-Setup | – |
| `navigation/DashboardViewModel.kt` | State für Dashboard | – |
| `navigation/BlueprintEditorViewModel.kt` | Blueprint-Parsing | – |
| `navigation/TaskGraphViewModel.kt` | Task-Daten | – |
| `theme/Theme.kt` | Material 3 Theme | – |

---

## 📁 Detail: Service Layer

| Datei | Zweck | Warum |
|-------|-------|-------|
| `OrchestrationService.kt` | Foreground Service | Hält Orchestrierung am Leben (Android killt Background) |
| `TaskWorker.kt` | WorkManager Worker | Zuverlässige Background-Execution mit Retry + Backoff |

---

## 📁 Detail: DI Layer

| Datei | Zweck |
|-------|-------|
| `AppModule.kt` | Koin Module – definiert alle Dependencies (Database, Repos, ViewModels, Orchestrator, LLM) |

---

## 📁 Detail: Tests

| Datei | Testet |
|-------|--------|
| `TaskTest.kt` | Task Status + Retry-Logik |
| `BlueprintTest.kt` | Blueprint toPromptString |
| `AgentTest.kt` | Capability-Matching |
| `OrchestratorTest.kt` | State Machine + Decomposition |
| `RateLimiterTest.kt` | Rate Limiting Logik |
| `BlueprintParserTest.kt` | Blueprint Text-Parser |

---

## 📁 Detail: Dokumentation

| Datei | Inhalt |
|-------|--------|
| `README.md` | Projektübersicht |
| `ARCHITECTURE.md` | Architektur-Diagramme |
| `docs/DECISIONS.md` | Architecture Decision Records (WARUM) |
| `docs/CODE_MAP.md` | Diese Datei (WO) |
| `ANALYSE_AGENT_DECK_MOBILE.md` | Senior-Level Review des Original-Konzepts |
| `EHRLICHE_BEGUTACHTUNG.md` | Ehrliche Funktionsfähigkeits-Analyse |
| `WAS_FEHLT.md` | Vollständige Bestandsaufnahme offener Punkte |
| `PROGRESS.md` | Fortschritts-Tracking |

---

## 🔄 Datenfluss: Blueprint → Orchestrierung → Agent → Resultat

```
1. User schreibt Blueprint (BlueprintEditorScreen)
   │
   ▼
2. BlueprintEditorViewModel parst Text → Blueprint-Objekt
   │
   ▼
3. BlueprintRepository speichert in Room DB
   │
   ▼
4. User klickt "Starten" → Orchestrator.start(blueprint)
   │
   ▼
5. Orchestrator decomposed Blueprint in Tasks:
   ├── Mit LLM (wenn vorhanden): Intelligente Zerlegung
   └── Ohne LLM: Regelbasiert (1 Modul = 1 Task)
   │
   ▼
6. Orchestrator dispatched Tasks an Agenten:
   ├── Prüft Dependencies (sind alle Vorgänger fertig?)
   ├── Wählt Agent basierend auf Capabilities
   └── Sendet Task an AgentClient.executeTask()
   │
   ▼
7. Agent führt Task aus:
   ├── Claude: HTTP POST an api.anthropic.com
   ├── ChatGPT: HTTP POST an api.openai.com
   └── WebSocket: Sendet JSON über WebSocket
   │
   ▼
8. Agent-Resultat kommt zurück:
   ├── Success → Orchestrator.onTaskCompleted()
   └── Failure → Orchestrator.onTaskFailed() → Retry?
   │
   ▼
9. Orchestrator prüft ob alle Tasks fertig:
   ├── Ja → State = Completed → UI zeigt Zusammenfassung
   └── Nein → dispatchNext() für nächste Tasks
   │
   ▼
10. Dashboard zeigt finalen Status + alle Resultate
```
