# Was fehlt noch? – Ehrliche Bestandsaufnahme

## 📊 Aktueller Stand

**26 Dateien, ~3.500 Zeilen Code**  
**Status: Architektur-Fundament gelegt, aber NICHT lauffähig**

---

## ✅ Was FERTIG ist (funktioniert)

### Domain-Modelle
- `Blueprint` – Master-Plan Entität
- `Task` – Task mit Status, Dependencies, Retry-Logik
- `Agent` – Agent mit Capabilities
- `OrchestratorState` – State Machine (sealed class)

### Interfaces & Abstraktionen
- `LLMProvider` – Interface für alle LLM-Provider
- `LLMProviderFactory` – Factory mit Auto-Detection
- `AgentClient` – Interface für Agent-Clients
- `AgentRegistry` – Registry mit Capability-Matching

### Infrastruktur
- `AppDatabase` – Room Schema mit Entities + DAOs
- `OrchestrationService` – Foreground Service (Grundgerüst)
- `TaskWorker` – WorkManager (Grundgerüst)
- `SecureKeyStore` – Android Keystore Integration
- `RateLimiter` – Rate Limiting Logik

### UI (Grundgerüst)
- `DashboardScreen` – Status, Tasks, Agenten
- `LLMSettingsScreen` – Provider-Auswahl, API-Keys

---

## ⚠️ Was nur STUB/MOCK ist (nicht funktional)

### LLM-Provider (alle haben TODOs)
- `ONNXLiteProvider` – **Kein echtes ONNX-Loading**, nur Mock-Inference
- `LlamaCppProvider` – **Kein JNI-Binding**, nur Mock-Inference
- `NvidiaNIMProvider` – Kein SSE-Streaming, aber basic HTTP funktioniert
- `OpenAIProvider` – Kein SSE-Streaming, aber basic HTTP funktioniert

### Agent-Clients
- `ArenaAgentClient` – **Keine echte Arena-API-Integration**, nur Mock

### Orchestrator
- `Orchestrator` – **Kein echtes JSON-Parsing** aus LLM-Output, **kein echtes Dispatching** zu Agenten

### Services
- `TaskWorker` – **Kein echtes Task-Execution**, nur Mock
- `OrchestrationService` – **Keine echte Orchestrierung**, nur Notification-Updates

---

## ❌ Was KOMPLETT FEHLT

### Build-System (KRITISCH – App kann nicht gebaut werden)
- [ ] `build.gradle.kts` (App-Modul)
- [ ] `build.gradle.kts` (Projekt-Root)
- [ ] `settings.gradle.kts`
- [ ] `gradle.properties`
- [ ] `gradlew` / `gradlew.bat`
- [ ] Gradle Wrapper JAR
- [ ] `proguard-rules.pro`

### Android-App-Grundgerüst
- [ ] `MainActivity.kt` – Entry Point
- [ ] `AgentDeckApp.kt` – Application-Klasse
- [ ] Navigation-Setup (Compose Navigation)
- [ ] Dependency Injection Setup (Koin Modules)

### UI-Screens (fehlen komplett)
- [ ] `BlueprintEditorScreen.kt` – Blueprint erstellen/bearbeiten
- [ ] `TaskGraphScreen.kt` – Task-Abhängigkeiten visualisieren
- [ ] `AgentDetailScreen.kt` – Agent-Konfiguration
- [ ] `OnboardingScreen.kt` – Erste Schritte
- [ ] `SplashScreen.kt` – Startbildschirm

### ViewModels (fehlen komplett)
- [ ] `DashboardViewModel.kt` – State Management für Dashboard
- [ ] `BlueprintViewModel.kt` – Blueprint-Logik
- [ ] `TasksViewModel.kt` – Task-Management
- [ ] `SettingsViewModel.kt` – Settings-Logik

### Repository-Layer (Datenzugriff)
- [ ] `BlueprintRepository.kt` – Blueprint CRUD
- [ ] `TaskRepository.kt` – Task CRUD + Status-Updates
- [ ] `AgentRepository.kt` – Agent-Verwaltung
- [ ] `LLMProviderRepository.kt` – Provider-Konfiguration laden/speichern

### Use Cases (Business-Logik)
- [ ] `LoadBlueprintUseCase.kt`
- [ ] `StartOrchestrationUseCase.kt`
- [ ] `DispatchTaskUseCase.kt`
- [ ] `HandleTaskResultUseCase.kt`
- [ ] `ResolveConflictUseCase.kt`

### Agent-Clients (fehlen komplett)
- [ ] `ClaudeAgentClient.kt` – Claude API Integration
- [ ] `ChatGPTAgentClient.kt` – OpenAI API Integration
- [ ] `WebSocketAgentClient.kt` – Generische WebSocket-Bridge
- [ ] `CustomRESTAgentClient.kt` – Custom Agent Endpoints

### PC-Bridge (eigenes Projekt)
- [ ] Desktop-Agent (Electron/Tauri/Rust)
- [ ] WebSocket-Server
- [ ] mDNS-Discovery
- [ ] File-System-Zugriff
- [ ] Terminal-Execution

### Lokale LLM-Integration (KRITISCH)
- [ ] ONNX Runtime JNI-Binding (für ONNXLiteProvider)
- [ ] llama.cpp JNI-Binding (für LlamaCppProvider)
- [ ] CMakeLists.txt für Native-Build
- [ ] Modell-Download-Logik (aus Assets oder Runtime-Download)
- [ ] Modell-Validierung (Checksum, Format)

### Orchestrierung (KRITISCH)
- [ ] JSON-Parsing für LLM-Output (Task-Liste aus LLM-Response)
- [ ] Echtes Task-Dispatching zu Agent-Clients
- [ ] Result-Merging (mehrere Agent-Ergebnisse zusammenführen)
- [ ] Conflict-Detection (widersprüchliche Ergebnisse)
- [ ] Context-Window-Management (Token-Budget für LLM)
- [ ] Blueprint-to-JSON-Normalisierung

### Sicherheit & Privacy
- [ ] Datenschutz-Konzept (welche Daten gehen wo hin?)
- [ ] User-Consent-Flow ("Diese Datei an Claude senden?")
- [ ] Lokale Datenbank-Verschlüsselung (SQLCipher?)
- [ ] Export/Delete-Funktion (DSGVO)

### Testing (komplett fehlt)
- [ ] Unit Tests für Domain-Modelle
- [ ] Unit Tests für Orchestrator State Machine
- [ ] Unit Tests für LLM-Provider (mit Mocks)
- [ ] Integration Tests für Database
- [ ] UI Tests für Compose Screens
- [ ] LLM Output Validation Tests (JSON Schema)

### CI/CD & DevOps
- [ ] GitHub Actions Workflow (Build, Test, Lint)
- [ ] Firebase Crashlytics Integration
- [ ] Firebase Analytics (optional)
- [ ] Sentry Integration (alternativ zu Crashlytics)
- [ ] Release-Signing (Keystore-Setup)
- [ ] Play Store Listing (Screenshots, Description)

### Assets & Resources
- [ ] App-Icon (mipmap-xxxhdpi, adaptive icon)
- [ ] Notification-Icon (vector drawable)
- [ ] Strings.xml (i18n: Deutsch, Englisch)
- [ ] Colors.xml (Material 3 Theme)
- [ ] Themes.xml (Light/Dark Mode)

### Dokumentation
- [ ] User-Manual (wie nutze ich die App?)
- [ ] Developer-Guide (wie erweitere ich Agenten/Provider?)
- [ ] API-Dokumentation (KDoc für alle public APIs)
- [ ] Architektur-Decision-Records (ADRs)

---

## 🔥 Kritische Pfade (was als nächstes gebaut werden muss)

### Pfad 1: **App lauffähig machen** (1-2 Tage)
1. Build-System aufsetzen (Gradle, Dependencies)
2. `MainActivity` + `AgentDeckApp` erstellen
3. Koin DI konfigurieren
4. Navigation einrichten
5. ViewModels für bestehende Screens

→ **Ergebnis:** App startet, zeigt Dashboard (noch ohne Funktionalität)

### Pfad 2: **Echte LLM-Integration** (3-5 Tage)
1. llama.cpp JNI-Binding bauen (CMake, Native-Code)
2. GGUF-Modell in Assets packen oder Runtime-Download
3. `LlamaCppProvider` mit echtem Inference-Code
4. JSON-Parsing für LLM-Output implementieren
5. Fallback zu Nvidia NIM testen

→ **Ergebnis:** Orchestrator kann Tasks aus Blueprint generieren

### Pfad 3: **Echte Agent-Integration** (2-3 Tage)
1. `ClaudeAgentClient` mit Anthropic API
2. `ChatGPTAgentClient` mit OpenAI API
3. WebSocket-Client für PC-Bridge (später)
4. Echtes Task-Dispatching im Orchestrator
5. Result-Handling + Error-Recovery

→ **Ergebnis:** Tasks werden an echte Agenten gesendet

### Pfad 4: **Blueprint-Workflow** (2-3 Tage)
1. `BlueprintEditorScreen` bauen (Text-Editor oder Form)
2. Blueprint in Room DB speichern
3. Orchestrierung starten (Button → Service → Orchestrator)
4. Task-Graph-View (Visualisierung der Dependencies)
5. User-Approval-Flow (bei Blockaden)

→ **Ergebnis:** End-to-End: Blueprint → Tasks → Agenten → Results

---

## 📋 Priorisierte TODO-Liste

### **P0 – Blockierend (App läuft nicht ohne)**
1. Build-System (Gradle-Files)
2. MainActivity + Application-Klasse
3. Navigation + DI Setup
4. ViewModels für UI

### **P1 – Kernfunktionalität (App ist nutzlos ohne)**
5. llama.cpp JNI-Binding + LLM-Integration
6. JSON-Parsing für LLM-Output
7. Claude/ChatGPT Agent-Clients
8. Echtes Task-Dispatching
9. Blueprint-Editor UI
10. Result-Merging

### **P2 – Wichtig für Production**
11. Testing (Unit + Integration)
12. Error-Handling + Crash-Reporting
13. Offline-Mode (was passiert ohne Netz?)
14. Battery-Optimization (Doze Mode Handling)
15. Datenschutz-Konzept + User-Consent

### **P3 – Nice-to-Have**
16. PC-Bridge (eigenes Projekt)
17. Task-Graph-Visualisierung
18. Analytics
19. Play Store Publishing
20. Multi-Language Support

---

## 💡 Empfehlung: Nächste Schritte

### Option A: **Schnell lauffähig machen** (empfohlen)
1. Build-System aufsetzen (30 Min)
2. MainActivity + Navigation (1 Std)
3. Koin DI + ViewModels (2 Std)
4. **→ App startet, zeigt leeres Dashboard**

Dann:
5. Nvidia NIM Provider testen (API-Key holen, 1 Std)
6. Blueprint-Editor bauen (2 Std)
7. Orchestrierung mit Remote-LLM starten (3 Std)
8. **→ Erster End-to-End Flow läuft (mit Remote-API)**

### Option B: **Lokales LLM zuerst** (schwieriger)
1. llama.cpp JNI-Binding bauen (1-2 Tage)
2. GGUF-Modell integrieren (2 Std)
3. LlamaCppProvider fertig machen (1 Tag)
4. **→ Lokale Inference läuft**

Dann:
5. Rest wie Option A

### Option C: **PC-Bridge zuerst** (anderes Projekt)
1. Electron/Tauri App für Desktop bauen
2. WebSocket-Server implementieren
3. Android WebSocket-Client
4. **→ Bridge läuft, aber ohne Orchestrierung**

---

## 🎯 Realistische Zeitplanung

| Phase | Scope | Aufwand |
|-------|-------|---------|
| **Woche 1** | Build-System + MainActivity + Navigation + DI + ViewModels | 2-3 Tage |
| **Woche 2** | Nvidia NIM Integration + Blueprint-Editor + erste Orchestrierung | 3-4 Tage |
| **Woche 3** | Claude/ChatGPT Clients + Result-Merging + Error-Handling | 3-4 Tage |
| **Woche 4** | llama.cpp JNI + lokales LLM (optional) | 3-5 Tage |
| **Woche 5** | Testing + Polish + Documentation | 3-4 Tage |
| **Woche 6+** | PC-Bridge (separates Projekt) | 2-4 Wochen |

**Gesamt: ~5-6 Wochen für MVP (ohne PC-Bridge)**

---

## 🔍 Was im aktuellen Code besonders problematisch ist

### 1. **Kein Build-System = App kann nicht gebaut werden**
Das ist der größte Blocker. Ohne `build.gradle.kts` kann Android Studio das Projekt nicht öffnen.

### 2. **LLM-Provider sind nur Mocks**
`ONNXLiteProvider` und `LlamaCppProvider` haben keine echte Inference-Logik. Sie returnen nur statische JSON-Strings.

### 3. **Orchestrator parst kein JSON**
Wenn das LLM Tasks als JSON zurückgibt, wird das nicht geparst. `parseTasksFromJSON()` ist leer.

### 4. **Kein echtes Dispatching**
`Orchestrator.dispatchNext()` markiert Tasks nur als "dispatching", aber sendet sie nicht an Agent-Clients.

### 5. **Keine ViewModels = UI hat keinen State**
Die Compose-Screens bekommen State als Parameter, aber es gibt keine ViewModels die den State managen.

### 6. **Keine Navigation**
Es gibt keine `NavHost` oder Navigation-Logik. Man kann nicht zwischen Screens wechseln.

---

## ✅ Fazit

**Aktueller Stand:** Architektur-Fundament ist solide, aber die App ist **nicht lauffähig** und **nicht funktional**.

**Was als nächstes:**
1. Build-System aufsetzen (P0)
2. MainActivity + Navigation (P0)
3. Nvidia NIM Integration (P1, einfacher als lokales LLM)
4. Blueprint-Editor (P1)
5. Erste Orchestrierung mit Remote-API (P1)

**Dann:**
6. Lokales LLM (optional, schwieriger)
7. Mehr Agent-Clients
8. Testing + Polish
