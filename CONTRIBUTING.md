# 📋 CONTRIBUTING.md – Regeln für alle Entwickler

**Lies diese Datei BEVOR du anfängst zu coden.** Hier steht alles was du wissen musst.

---

## 🚨 KRITISCHE REGELN (Nicht verhandelbar)

### 1. NIEMALS den PR #1 mergen oder auf `main` pushen

> **Warum?** Der Hauptbranch `arena/01a0c3a9-mwco` ist mit einer Arena.ai Session verbunden.
> Ein Merge auf `main` schließt die Session und der leitende Entwickler verliert Zugriff auf das Repo.
> **Das gesamte Projekt steht still wenn das passiert.**

| Aktion | Erlaubt? |
|--------|----------|
| PR #1 mergen | ❌ **NEIN – Niemals!** |
| Auf `main` pushen | ❌ **NEIN** |
| `main` löschen/umbenennen | ❌ **NEIN** |
| Auf `arena/*` Branches arbeiten | ✅ Ja |
| Neue Branches von `arena/*` erstellen | ✅ Ja |

### 2. Branch-Struktur respektieren

Jeder Stream hat seinen eigenen Branch. **Arbeite NUR auf deinem zugewiesenen Branch.**

| Branch | Stream | Zuständig |
|--------|--------|-----------|
| `arena/01a0c3a9-mwco` | Hauptbranch (Architektur + Docs) | Projektleitung |
| `arena/backend-mcp` | B: Backend/MCP-Bus | Backend-Entwickler |
| `arena/ui-frontend` | A: UI/Frontend | Frontend-Entwickler |
| `arena/paul-assistant` | C: Paul (AI-Assistent) | AI/ML-Entwickler |
| `arena/hub-worker` | D: Hub/Worker/Tailscale | Infrastructure-Entwickler |

### 3. Keine direkten Commits auf fremde Branches

- Arbeite auf **deinem** Branch
- Wenn du etwas von einem anderen Branch brauchst: **Cherry-pick**, nicht merge
- Cross-Stream-Änderungen immer mit dem zuständigen Entwickler absprechen

---

## 📂 Projektstruktur

```
mwco/
├── app/                          # Android-App (Kotlin)
│   ├── build.gradle.kts
│   ├── src/main/kotlin/com/agentdeck/
│   │   ├── core/                 # Domain + Orchestrierung
│   │   ├── llm/                  # LLM-Provider (Interface-basiert)
│   │   ├── agents/               # Agent-Clients (Claude, ChatGPT, etc.)
│   │   ├── data/                 # Room Database + Repositories
│   │   ├── service/              # Foreground Service + WorkManager
│   │   └── ui/                   # Compose UI
│   └── src/test/                 # Unit Tests
│
├── pc-bridge/                    # PC-Bridge (Node.js + TypeScript)
│   ├── src/
│   │   ├── server/               # WebSocket + Protocol
│   │   ├── bridge/               # Terminal, Filesystem, Git
│   │   ├── config/               # Konfiguration
│   │   └── index.ts              # Entry Point
│   └── docs/                     # PC-Bridge Dokumentation
│
├── docs/                         # Gesamt-Dokumentation
│   ├── DECISIONS.md              # Architecture Decision Records
│   └── CODE_MAP.md               # Wo ist was im Code
│
├── .github/
│   ├── REVIEW_SETUP.md           # AI Code Review Setup
│   ├── workflows/                # CI/CD Workflows
│   └── CONTRIBUTING.md           # ← Du bist hier
│
├── .coderabbit.yaml              # CodeRabbit Konfiguration
├── ARCHITECTURE.md               # Architektur-Übersicht
├── README.md                     # Projekt-Übersicht
└── ANALYSE_AGENT_DECK_MOBILE.md  # Senior-Level Analyse
```

---

## 🚀 So fängst du an

### Schritt 1: Branch checken

```bash
git clone https://github.com/TukTuck/mwco.git
cd mwco
git checkout <dein-branch>
# z.B. git checkout arena/backend-mcp
```

### Schritt 2: DEVELOPER_BRIEF.md lesen

Auf deinem Branch liegt eine `DEVELOPER_BRIEF.md`. **Lies die komplett.** Da steht:
- Was dein Job ist
- Welche Dateien schon da sind
- Welche Interfaces du einhalten musst
- Was am Ende fertig sein muss (Deliverables)
- Die empfohlene Ordnerstruktur

### Schritt 3: Super-Dev-Prompt nutzen

Am Ende der `DEVELOPER_BRIEF.md` steht ein **Super-Dev-Prompt**. Kopiere den und gib ihn deinem AI-Assistenten (Arena, Claude, ChatGPT, Cursor, etc.). Der Prompt enthält den gesamten Kontext den der Assistent braucht.

### Schritt 4: Architecture Docs lesen

Bevor du codest, lies diese Dokumente (in dieser Reihenfolge):

1. `README.md` – Was ist Agent Deck?
2. `ARCHITECTURE.md` – Wie hängt alles zusammen?
3. `pc-bridge/docs/FINALE_ARCHITEKTUR.md` – Detaillierte Architektur
4. `pc-bridge/docs/PARALLEL_PLAN.md` – Stream-Interfaces (WICHTIG!)
5. `docs/DECISIONS.md` – Warum welche Entscheidung getroffen wurde

---

## 📏 Code-Regeln

### Allgemein
- **Sprache:** Deutsch für Kommentare und Commit-Messages, Englisch für Code
- **Keine Secrets im Code** – API-Keys gehören in den OS-Keystore oder Umgebungsvariablen
- **Error-Handling:** Result-Typen statt rohe Exceptions
- **Jede öffentliche Funktion:** KDoc/JSDoc Kommentar

### TypeScript (pc-bridge)
- `strict: true` – Keine `any` Typen
- Error-Handling mit `Result<T, E>` Pattern
- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`

### Kotlin (Android-App)
- Null-Safety nutzen – kein `!!` Operator
- Coroutines korrekt nutzen (viewModelScope, lifecycleScope)
- Sealed Classes für State-Modelle
- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`

### Commit-Messages
```
feat: Neue Funktion hinzufügen
fix: Bug beheben
docs: Dokumentation ändern
test: Tests hinzufügen/ändern
refactor: Code umstrukturieren (keine Funktionsänderung)
chore: Build/Tooling ändern
```

---

## 🔀 Interface-Verträge zwischen Streams

**KRITISCH:** Diese Interfaces sind fest definiert. Änderungen müssen mit den betroffenen Streams abgesprochen werden.

### Stream A (UI) ↔ Stream B (Backend): Electron IPC
Siehe `pc-bridge/docs/PARALLEL_PLAN.md` → Abschnitt "Stream A"

### Stream C (Paul) → Stream B (Backend): MCP-Bus API
Siehe `pc-bridge/docs/PARALLEL_PLAN.md` → Abschnitt "Stream C"

### Stream D (Hub) → Stream B (Backend): WebSocket Protocol
Siehe `pc-bridge/docs/PROTOCOL.md`

---

## 🤖 AI Code Review

**CodeRabbit** reviewed automatisch jeden PR.

- Reviews sind auf **Deutsch**
- CodeRabbit kennt den Projekt-Kontext (Architektur, Regeln)
- Reviews kommen innerhalb von 1-2 Minuten
- Adressiere Review-Kommentare bevor du um Merge bittest

Siehe `.coderabbit.yaml` für die Konfiguration.

---

## 📋 Checkliste bevor du "Fertig" sagst

- [ ] Alle Deliverables aus der `DEVELOPER_BRIEF.md` erledigt
- [ ] Code compiliert ohne Fehler
- [ ] Tests laufen durch (`npm test` oder `./gradlew test`)
- [ ] CodeRabbit Review adressiert (keine offenen kritischen Kommentare)
- [ ] Keine Secrets im Code
- [ ] Commit-Messages folgen Conventional Commits
- [ ] README/Docs aktualisiert falls nötig
- [ ] Auf dem richtigen Branch committed

---

## ❓ Fragen?

| Frage | Antwort |
|-------|---------|
| Welcher Branch ist meiner? | Siehe Stream-Tabelle oben oder frag die Projektleitung |
| Darf ich Dependencies hinzufügen? | Ja, aber begründe warum in der Commit-Message |
| Was wenn ich ein Interface ändern muss? | Erst mit den betroffenen Streams absprechen! |
| Wo frage ich bei Problemen? | Im PR kommentieren oder Projektleitung kontaktieren |
| Darf ich auf einem anderen Branch helfen? | Nur nach Absprache mit dem zuständigen Entwickler |

---

## 📚 Alle Dokumente im Überblick

| Dokument | Inhalt | Für wen |
|----------|--------|---------|
| `README.md` | Projekt-Übersicht | Alle |
| `ARCHITECTURE.md` | Architektur-Diagramme | Alle |
| `CONTRIBUTING.md` (diese Datei) | Regeln + Workflow | **Alle – Pflichtlektüre** |
| `DEVELOPER_BRIEF.md` (pro Branch) | Stream-spezifische Anleitung | Jeweiliger Stream |
| `docs/DECISIONS.md` | Architecture Decision Records | Alle |
| `docs/CODE_MAP.md` | Wegweiser durch den Code | Alle |
| `pc-bridge/docs/FINALE_ARCHITEKTUR.md` | Detaillierte Architektur | Backend, Paul, Hub |
| `pc-bridge/docs/PARALLEL_PLAN.md` | Stream-Interfaces | **Alle – Interfaces einhalten!** |
| `pc-bridge/docs/PAUL_SPEC.md` | Paul-Spezifikation | Stream C |
| `pc-bridge/docs/UI_LAYOUT_SPEC.md` | UI/Layout-Spezifikation | Stream A |
| `pc-bridge/docs/PROTOCOL.md` | WebSocket-Protokoll | Stream B + D |
| `pc-bridge/docs/ENTSCHEIDUNGSKATALOG.md` | Technologie-Optionen | Referenz |
| `pc-bridge/docs/VISION_ZUSAMMENFASSUNG.md` | Gesamtvision | Alle |
| `ANALYSE_AGENT_DECK_MOBILE.md` | Senior-Level Analyse | Referenz |
| `EHRLICHE_BEGUTACHTUNG.md` | Funktionsfähigkeits-Analyse | Referenz |
