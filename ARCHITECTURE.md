# Agent Deck Mobile - Architektur

## Core Principles

1. **Interface-basiert**: Alle Komponenten hinter Abstraktionen
2. **LLM-Provider austauschbar**: Lokal (ONNX/GGUF) oder Remote (Nvidia NIM, OpenAI, etc.)
3. **Android-native**: WorkManager, Foreground Service, Room, Keystore
4. **Minimal Viable**: Läuft mit kleinstem Modell, skalierbar nach oben
5. **Rule-First**: Deterministische State Machine, LLM nur für weiche Logik

## Module

```
app/
├── core/
│   ├── domain/          # Use Cases, Entities (pure Kotlin)
│   ├── orchestration/   # State Machine, Rule Engine
│   └── common/          # Shared utilities
├── llm/
│   ├── api/             # LLMProvider Interface
│   ├── local/           # ONNX Runtime, llama.cpp Implementations
│   └── remote/          # Nvidia NIM, OpenAI, Custom REST
├── agents/
│   ├── api/             # AgentClient Interface
│   ├── arena/           # Arena AI Integration
│   ├── claude/          # Claude API
│   └── websocket/       # Generic WebSocket Agent
├── data/
│   ├── database/        # Room Database
│   ├── repository/      # Data Layer
│   └── network/         # Ktor HTTP + WebSocket
├── ui/
│   ├── dashboard/       # Main Dashboard
│   ├── blueprint/       # Blueprint Editor
│   ├── tasks/           # Task Graph View
│   └── settings/        # LLM Provider Config
└── service/
    ├── OrchestrationService.kt  # Foreground Service
    └── TaskWorker.kt            # WorkManager
```

## LLM Provider Strategy

```
┌─────────────────────────────────────────┐
│         LLMProvider Interface           │
│  suspend fun complete(prompt): String   │
│  suspend fun stream(prompt): Flow<...>  │
└─────────────────────────────────────────┘
                    ↓
    ┌───────────────┴───────────────┐
    ↓                               ↓
┌──────────┐                  ┌──────────┐
│  Local   │                  │  Remote  │
│ Provider │                  │ Provider │
└──────────┘                  └──────────┘
    ↓                               ↓
- ONNX Runtime              - Nvidia NIM API
- llama.cpp (GGUF)         - OpenAI API
- Tensorflow Lite          - Custom REST
- MiniLM (intent only)     - Claude API
```

## Default Configuration

**Out-of-the-box (minimal):**
- LLM: MiniLM-L6-v2 (~80MB, ONNX, intent classification only)
- Orchestration: Pure rule-based state machine
- Fallback: User prompted for remote API key

**Power user:**
- LLM: Qwen2.5-1.5B-Instruct-GGUF-Q4 (~900MB, llama.cpp)
- Orchestration: Hybrid (rules + local LLM for task formulation)

**Cloud user:**
- LLM: Nvidia NIM API (any model)
- Orchestration: Full LLM-driven with rule validation

## State Machine

```
Idle → Planning → Dispatching → Monitoring → Reviewing → Completed
  ↑                                                        ↓
  └────────────── Failed ←── Blocked ←────────────────────┘
```
