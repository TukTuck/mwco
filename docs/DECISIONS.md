# Architecture Decision Records (ADRs)

Dieses Dokument erklärt **warum** welche Entscheidungen getroffen wurden.

---

## ADR-001: Interface-basiertes LLM-Provider-System

**Entscheidung:** Alle LLM-Provider implementieren ein gemeinsames `LLMProvider` Interface.

**Warum:**
- Der originale Blueprint sah ein festes lokales Modell (SmolLM2 135M) vor
- Problem: 135M-Modelle sind zu schwach für zuverlässige JSON-Generierung
- Lösung: Provider austauschbar machen → User kann stärkeres Modell wählen
- Remote-APIs (Nvidia NIM, OpenAI) sind immer verfügbar und leistungsstärker

**Trade-off:**
- ✅ Flexibilität: User wählt Modell basierend auf RAM/Use-Case
- ✅ Fallback: Wenn lokales Modell failt → Remote-API
- ❌ Komplexität: Mehr Code für Provider-Abstraktion

**Implementierung:** `LLMProvider.kt`, `LLMProviderFactory.kt`

---

## ADR-002: Hybrid-Orchestrator (Regeln + LLM)

**Entscheidung:** Deterministische State Machine als Kern + optionales LLM für weiche Aufgaben.

**Warum:**
- Reines LLM: Zu unzuverlässig, halluziniert Tasks, kein deterministischer State
- Reine Regeln: Zu starr, kann keine intelligenten Task-Zerlegungen
- Hybrid: Regeln für State-Transitions (zuverlässig) + LLM für Task-Formulierung (flexibel)

**Was macht die Regel-Engine:**
- State-Transitions (Idle → Planning → Dispatching → Monitoring → ...)
- Dependency-Checking (Task B wartet auf Task A)
- Retry-Logik (max. 3 Versuche)
- Timeout-Handling

**Was macht das LLM:**
- Blueprint in Tasks zerlegen (intelligente Decomposition)
- Task-Beschreibungen formulieren
- Agent-Auswahl basierend auf Capabilities

**Trade-off:**
- ✅ Zuverlässig: State Machine bricht nicht
- ✅ Flexibel: LLM kann komplexe Blueprints verstehen
- ❌ LLM-Fehler: Wenn LLM failt → Fallback auf regelbasierte Zerlegung

**Implementierung:** `Orchestrator.kt`, `OrchestratorState.kt`

---

## ADR-003: Kotlin + Jetpack Compose (nicht Flutter/React Native)

**Entscheidung:** Native Android-Entwicklung mit Kotlin und Jetpack Compose.

**Warum:**
- Originaler Blueprint sah Kotlin/Compose vor
- Native Performance für LLM-Inferenz (JNI-Binding nötig)
- Besserer Zugriff auf Android-spezifische APIs (WorkManager, Foreground Service, Keystore)
- Compose ist moderner als XML-Layouts

**Trade-off:**
- ✅ Performance: Native Code für LLM-Inferenz
- ✅ Android-Integration: Voller Zugriff auf Platform-APIs
- ❌ Nur Android: Kein iOS-Support (Flutter/React Native wären cross-platform)

**Alternativen verworfen:**
- Flutter: Kein JNI-Support für llama.cpp
- React Native: Schlechtere Performance, komplexeres Native-Binding

---

## ADR-004: Koin statt Hilt/Dagger

**Entscheidung:** Koin für Dependency Injection.

**Warum:**
- Einfacher als Hilt/Dagger (kein Code-Generation, keine Annotations)
- Besser für Compose (native Compose-Integration)
- Schnellerer Build (kein Annotation-Processing)

**Trade-off:**
- ✅ Einfach: DSL-basiert, leicht zu verstehen
- ✅ Compose-freundlich: `koinViewModel()` direkt in Composables
- ❌ Runtime-Errors: DI-Fehler erst zur Laufzeit (Hilt: Compile-Time)

**Implementierung:** `AppModule.kt`

---

## ADR-005: Room statt Realm/SQLite direkt

**Entscheidung:** Room Database für Persistenz.

**Warum:**
- Google-Standard für Android-Datenbanken
- Compile-Time-SQL-Validation (weniger Runtime-Errors)
- Kotlin Coroutines Support (`Flow<List<Task>>`)
- Migration-Support für Schema-Updates

**Trade-off:**
- ✅ Typsicher: DAO-Interfaces statt rohe SQL-Strings
- ✅ Reactive: Flow-basiert für Live-Updates
- ❌ Overhead: Etwas mehr Code als raw SQLite

**Implementierung:** `AppDatabase.kt`, Repositories

---

## ADR-006: Ktor statt OkHttp/Retrofit

**Entscheidung:** Ktor Client für HTTP/WebSocket.

**Warum:**
- Kotlin-first (Coroutines-native)
- Einheitliche API für HTTP + WebSocket
- Besser für Streaming (SSE für LLM-Responses)
- Multiplatform-fähig (falls später iOS-Support)

**Trade-off:**
- ✅ Coroutines: Native `suspend fun` Support
- ✅ Streaming: ByteReadChannel für SSE
- ❌ Weniger verbreitet: OkHttp/Retrofit haben mehr Community-Resources

**Implementierung:** Alle Agent-Clients, LLM-Provider

---

## ADR-007: Foreground Service für Orchestrierung

**Entscheidung:** OrchestrationService als Foreground Service.

**Warum:**
- Android killt Background-Prozesse aggressiv (Doze Mode, App Standby)
- Orchestrierung läuft langfristig (Tasks dauern Minuten)
- Foreground Service = persistente Notification = Android killt nicht

**Trade-off:**
- ✅ Zuverlässig: Service überlebt Screen-Off
- ✅ User-sichtbar: Notification zeigt Status
- ❌ Battery: Konstanter Wake Lock verbraucht Akku

**Alternativen verworfen:**
- Nur WorkManager: Zu unzuverlässig für langlaufende Tasks
- Background Service: Wird von Android gekillt

**Implementierung:** `OrchestrationService.kt`

---

## ADR-008: EncryptedSharedPreferences für API-Keys

**Entscheidung:** Android Keystore + EncryptedSharedPreferences.

**Warum:**
- API-Keys sind sensibel (Claude, OpenAI, Nvidia NIM)
- Normale SharedPreferences = Klartext (root-Zugriff kann lesen)
- Android Keystore = Hardware-backed Encryption

**Trade-off:**
- ✅ Sicher: Keys sind verschlüsselt (AES256-GCM)
- ✅ Einfach: Drop-in Replacement für SharedPreferences
- ❌ Langsamer: Encryption/Decryption bei jedem Zugriff

**Implementierung:** `SecureKeyStore.kt`

---

## ADR-009: JSON-Only Output für Orchestrator

**Entscheidung:** Orchestrator gibt nur strukturiertes JSON aus (keine Freitext-Antworten).

**Warum:**
- Freitext: Schwer zu parsen, LLM halluziniert Format
- JSON: Maschinell lesbar, Schema-validierbar
- Reduziert Output-Space für schwache LLMs (135M-Modelle)

**Trade-off:**
- ✅ Deterministisch: JSON ist parsbar oder failt klar
- ✅ Validierbar: Schema-Checks möglich
- ❌ Unflexibel: Keine "Erklärungen" vom Orchestrator

**Implementierung:** `Orchestrator.kt` (JSON-Parsing mit kotlinx.serialization)

---

## ADR-010: Kein lokales LLM im MVP

**Entscheidung:** Lokale LLM-Provider (ONNX, llama.cpp) sind nur Mocks im MVP.

**Warum:**
- JNI-Binding für llama.cpp = 2-3 Tage额外 Arbeit (CMake, C++ Code)
- ONNX Runtime Integration = 1-2 Tage
- Modell-Download-Logik (Assets oder Runtime) = 1 Tag
- MVP soll schnell lauffähig sein → Remote-APIs zuerst

**Trade-off:**
- ✅ Schneller MVP: App läuft in 1 Woche
- ✅ Remote-APIs funktionieren sofort
- ❌ Kein Offline-Mode: Internet nötig
- ❌ Privacy: Daten gehen an Cloud-APIs

**Zukunft:** Lokale Provider in Phase 2 implementieren (wenn MVP validiert)

**Implementierung:** `ONNXLiteProvider.kt`, `LlamaCppProvider.kt` (Mock-Code markiert mit TODO)

---

## ADR-011: Blueprint als Freitext (nicht Formular)

**Entscheidung:** Blueprint-Editor ist ein Freitext-Feld, kein strukturiertes Formular.

**Warum:**
- Formular: Zu starr, User muss alle Felder ausfüllen
- Freitext: Flexibel, User schreibt natürlich
- Parser extrahiert Struktur automatisch (Projekt, Ziel, Module, Flow)

**Trade-off:**
- ✅ User-friendly: Natürliches Schreiben
- ✅ Flexibel: Beliebig komplexe Blueprints
- ❌ Parser-Fehler: Wenn User nicht strukturiert schreibt → Fallback auf Regel-Engine

**Implementierung:** `BlueprintEditorScreen.kt`, `BlueprintEditorViewModel.kt` (Parser-Logik)

---

## ADR-012: Task-Dependencies als DAG (Directed Acyclic Graph)

**Entscheidung:** Tasks haben `dependsOn: List<String>` für Abhängigkeiten.

**Warum:**
- Lineare Tasks: Zu starr (Task B muss nicht immer nach Task A)
- DAG: Flexibel (Task C wartet auf A + B, Task D nur auf A)
- Orchestrator dispatched nur Tasks deren Dependencies erfüllt sind

**Trade-off:**
- ✅ Parallelisierung: Unabhängige Tasks laufen parallel
- ✅ Flexibel: Komplexe Workflows möglich
- ❌ Komplexität: Cycle-Detection nötig (verhindert Deadlocks)

**Implementierung:** `Task.kt` (dependsOn), `Orchestrator.kt` (Dependency-Checking)

---

## ADR-013: Rate Limiting pro Agent

**Entscheidung:** RateLimiter trackt Requests/Tokens pro Agent.

**Warum:**
- Claude: 50 req/min (Free), 1000 req/min (Team)
- OpenAI: Variabel nach Plan
- Ohne Limiting: API-Keys werden gebannt, Kosten explodieren

**Trade-off:**
- ✅ Kostenkontrolle: Budget-Limits möglich
- ✅ API-Schutz: Keine Bans durch zu viele Requests
- ❌ Komplexität: Tracking pro Agent + Time-Window

**Implementierung:** `RateLimiter.kt`

---

## ADR-014: Unit Tests nur für Kernlogik

**Entscheidung:** Unit Tests für Domain + Orchestrator, keine Integration/UI Tests im MVP.

**Warum:**
- Integration Tests: Brauchen MockWebServer, Room in-memory DB → aufwendig
- UI Tests: Compose Testing ist komplex (Semantics, Matchers)
- MVP-Fokus: Kernlogik muss funktionieren, UI ist zweitrangig

**Trade-off:**
- ✅ Schnell: 37 Tests in Sekunden
- ✅ Fokussiert: Kritische Logik ist getestet
- ❌ Lücken: Database, Network, UI nicht getestet

**Zukunft:** Integration/UI Tests in Phase 2 (vor Production-Release)

**Implementierung:** `app/src/test/kotlin/` (6 Test-Suites)

---

## Zusammenfassung der Kernentscheidungen

| Bereich | Entscheidung | Hauptgrund |
|---------|--------------|------------|
| **LLM** | Interface-basiert | Flexibilität (lokal/remote) |
| **Orchestrierung** | Hybrid (Regeln + LLM) | Zuverlässigkeit + Flexibilität |
| **Platform** | Native Kotlin | Performance + Android-Integration |
| **DI** | Koin | Einfachheit + Compose-Support |
| **Database** | Room | Typsicherheit + Coroutines |
| **Network** | Ktor | Coroutines + Streaming |
| **Background** | Foreground Service | Zuverlässigkeit (Android killt nicht) |
| **Security** | Android Keystore | Hardware-backed Encryption |
| **Output** | JSON-Only | Deterministisch + validierbar |
| **MVP-Scope** | Kein lokales LLM | Schneller MVP mit Remote-APIs |

---

## Was wurde verworfen?

### Lokales LLM als Primary (verworfen)
**Grund:** 135M-Modelle zu schwach, 1.5B-Modelle zu groß für viele Devices  
**Stattdessen:** Remote-APIs als Primary, lokales LLM als Optional

### Flutter/React Native (verworfen)
**Grund:** Kein JNI-Support für llama.cpp, schlechtere Performance  
**Stattdessen:** Native Kotlin

### Hilt/Dagger (verworfen)
**Grund:** Zu komplex, Code-Generation verlangsamt Build  
**Stattdessen:** Koin (DSL-basiert, runtime)

### Realm Database (verworfen)
**Grund:** Proprietär, weniger Android-Integration  
**Stattdessen:** Room (Google-Standard)

### OkHttp/Retrofit (verworfen)
**Grund:** Kein natives Streaming, Callback-basiert  
**Stattdessen:** Ktor (Coroutines-native, Streaming)

---

## Offene Entscheidungen (für Phase 2)

1. **Lokales LLM:** ONNX Runtime oder llama.cpp? (oder beide?)
2. **Result-Merging:** Wie mehrere Agent-Ergebnisse zusammenführen?
3. **Context-Window:** Token-Budget-Management für LLM-Calls?
4. **Offline-Mode:** Task-Queue ohne Internet?
5. **PC-Bridge:** Eigenes Projekt (Electron/Tauri/Rust)?

Diese Entscheidungen werden getroffen wenn MVP validiert ist und Phase 2 startet.
