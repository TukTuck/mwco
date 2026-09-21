# Agent Deck Mobile

## Blueprint-gesteuerte Agenten-Orchestrierung für Android

**Agent Deck Mobile** ist eine Android-App, die als mobiler Bauleiter für AI-Agenten fungiert.  
Sie zerlegt Blueprints in Tasks, dispatcht sie an passende Agenten, überwacht den Fortschritt und führt Ergebnisse zusammen.

---

## Architektur-Prinzip

```
┌─────────────────────────────────────────────────────────┐
│                    User / Blueprint                       │
│              (Master-Plan kommt von außen)                │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              Orchestrator (Android App)                   │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Rule Engine │  │ State Machine│  │ Rate Limiter   │ │
│  │ (Kotlin)    │  │ (DAG)        │  │ (Pro Agent)    │ │
│  └──────┬──────┘  └──────┬───────┘  └────────────────┘ │
│         │                │                               │
│         ↓                ↓                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │           LLM Provider (Interface)                │    │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────────┐ │    │
│  │   │ ONNX     │  │llama.cpp │  │ Remote API   │ │    │
│  │   │ MiniLM   │  │ GGUF     │  │ (NIM/OpenAI) │ │    │
│  │   │ (~80MB)  │  │(~350-900)│  │              │ │    │
│  │   └──────────┘  └──────────┘  └──────────────┘ │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────┐  ┌──────────────────────────────────┐ │
│  │ WorkManager  │  │ Foreground Service               │ │
│  │ (Background  │  │ (Persistent Monitoring,           │ │
│  │  Tasks)      │  │  Notifications)                  │ │
│  └──────────────┘  └──────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        ↓
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
   ┌─────────┐   ┌──────────┐   ┌──────────┐
   │ Arena   │   │ Claude   │   │ ChatGPT  │
   │ Agent   │   │ Agent    │   │ Agent    │
   └─────────┘   └──────────┘   └──────────┘
```

---

## LLM Provider – Konfigurierbar

### Lokale Modelle (Offline, Privacy)

| Modell | Größe | RAM | Fähigkeiten | Empfohlen für |
|--------|-------|-----|-------------|---------------|
| **MiniLM-L6-v2** (ONNX) | ~80 MB | ~150 MB | Intent-Classification | Minimum, läuft überall |
| **Qwen2.5-0.5B** (GGUF Q4) | ~350 MB | ~600 MB | Task-Formulierung, JSON | Budget-Geräte |
| **Qwen2.5-1.5B** (GGUF Q4) | ~900 MB | ~1.5 GB | Volle Orchestrierung | Empfohlen lokal |
| **Eigenes Modell** (GGUF) | variabel | variabel | beliebig | Power-User |

### Remote APIs (Cloud, immer verfügbar)

| Provider | Modelle | Hinweis |
|----------|---------|---------|
| **Nvidia NIM** | Llama 3.1, Nemotron, Gemma | Kostenlos mit Nvidia-Account |
| **OpenAI** | GPT-4o, GPT-4o-mini | OpenAI-kompatible Endpoints |
| **Custom REST** | beliebig | OpenAI-kompatibles Format |

### Provider-Wechsel

Der Provider ist über ein Interface abstrahiert. Wechsel zur Laufzeit:

```kotlin
// Interface – alle Provider implementieren das gleiche
interface LLMProvider {
    suspend fun complete(prompt: String, options: CompletionOptions): Result<String>
    fun stream(prompt: String, options: CompletionOptions): Flow<Result<String>>
    fun canHandle(tokenCount: Int): Boolean
}

// Lokales ONNX-Modell
val local = LLMProviderFactory.create(context, ProviderConfig.ONNXLite(
    modelPath = "models/minilm-l6-v2.onnx"
))

// Nvidia NIM (Fallback wenn kein lokales Modell)
val remote = LLMProviderFactory.create(context, ProviderConfig.NvidiaNIM(
    apiKey = keyStore.getApiKey("nvidia_nim"),
    model = "meta/llama-3.1-8b-instruct"
))

// Oder: Eigenes GGUF-Modell laden
val custom = LLMProviderFactory.create(context, ProviderConfig.LlamaCpp(
    modelPath = "models/my-custom-model.gguf",
    contextSize = 4096,
    gpuLayers = 10
))
```

### Fallback-Strategie

```
1. Versuche lokales Modell
2. Wenn nicht geladen → Versuche Remote-API (Nvidia NIM)
3. Wenn kein API-Key → Frage Nutzer
4. Wenn abgelehnt → Nur Regel-Engine (kein LLM)
```

---

## Projektstruktur

```
app/src/main/kotlin/com/agentdeck/
├── core/
│   ├── domain/
│   │   ├── Blueprint.kt          # Master-Plan Entität
│   │   ├── Task.kt               # Task mit Status, Dependencies
│   │   └── Agent.kt              # Agent mit Capabilities
│   ├── orchestration/
│   │   ├── OrchestratorState.kt  # State Machine (sealed class)
│   │   └── Orchestrator.kt       # Haupt-Orchestrierungslogik
│   └── common/
│       ├── SecureKeyStore.kt     # API-Keys im Android Keystore
│       └── RateLimiter.kt        # Rate Limiting pro Agent
├── llm/
│   ├── api/
│   │   ├── LLMProvider.kt        # Interface für alle LLM-Provider
│   │   └── LLMProviderFactory.kt # Factory mit Auto-Detection
│   ├── local/
│   │   ├── ONNXLiteProvider.kt   # MiniLM via ONNX Runtime
│   │   └── LlamaCppProvider.kt   # GGUF-Modelle via llama.cpp
│   └── remote/
│       ├── NvidiaNIMProvider.kt  # Nvidia NIM API
│       └── OpenAIProvider.kt     # OpenAI + kompatible APIs
├── agents/
│   ├── api/
│   │   ├── AgentClient.kt        # Interface für alle Agent-Clients
│   │   └── AgentRegistry.kt      # Registry mit Capability-Matching
│   ├── arena/
│   │   └── ArenaAgentClient.kt   # Arena AI Integration
│   ├── claude/
│   │   └── ClaudeAgentClient.kt  # (TODO)
│   └── websocket/
│       └── WebSocketAgentClient.kt # (TODO)
├── data/
│   └── database/
│       └── AppDatabase.kt        # Room DB mit allen Entities + DAOs
├── ui/
│   ├── dashboard/
│   │   └── DashboardScreen.kt    # Haupt-Dashboard
│   ├── settings/
│   │   └── LLMSettingsScreen.kt  # LLM-Provider Konfiguration
│   ├── blueprint/                 # (TODO)
│   └── tasks/                     # (TODO)
└── service/
    ├── OrchestrationService.kt   # Foreground Service
    └── TaskWorker.kt             # WorkManager für Background-Tasks
```

---

## Build & Run

### Voraussetzungen
- Android Studio Ladybug+
- JDK 17+
- Android SDK 34+
- minSdk 26 (Android 8.0, für NNAPI)

### LLM-Modelle herunterladen

```bash
# Minimal (80MB)
wget -O app/src/main/assets/models/minilm-l6-v2.onnx \
  https://huggingface.co/optimum/all-MiniLM-L6-v2/resolve/main/model.onnx

# Empfohlen lokal (900MB)
wget -O app/src/main/assets/models/qwen2.5-1.5b-q4.gguf \
  https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf
```

---

## Phasen

| Phase | Scope | Status |
|-------|-------|--------|
| **1** | Architektur + Interfaces + LLM-Provider | ✅ Fundament gelegt |
| **2** | Dashboard UI + manueller Dispatch | ⏳ Als nächstes |
| **3** | Agent-Clients (Arena, WebSocket) | ⏳ |
| **4** | Orchestrierung + State Machine | ⏳ |
| **5** | Room DB + Persistenz | ⏳ |
| **6** | Lokales LLM (ONNX + llama.cpp JNI) | ⏳ |
| **7** | PC-Bridge (separates Projekt) | ⏳ |

---

## License

Siehe LICENSE
