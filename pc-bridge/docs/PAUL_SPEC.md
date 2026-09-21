# 🤖 Paul – Der zentrale Assistent

## Wer ist Paul?

Paul ist DER Assistent in Agent Deck. Nicht irgendein Feature – Paul ist die zentrale Schnittstelle zwischen dem User, den AI-Agenten, dem System und der Außenwelt.

**Paul ist:**
- 🎤 **Sprachassistent** – Immer erreichbar per Sprache oder Text
- 🔌 **MCP-Brücke** – Hat Zugriff auf ALLE System-Tools (Dateien, Terminal, Git, Browser)
- 🧠 **Kontext-Bewusst** – Kennt alle Tasks, Chats, Logs, Blueprints (fragt den Orchestrator)
- 🗣️ **Dolmetscher** – Übersetzt User-Wünsche in Aktionen, erklärt was der Orchestrator macht
- 🏠 **Immer da** – Eigenes Fenster, Always-on-Top optional, Hotkey

**Paul ist NICHT:**
- ❌ Kein Orchestrator – Das ist die eigenständige State Machine im Hintergrund
- ❌ Kein Task-Dispatcher – Das macht der Orchestrator
- ❌ Kein normales WebChat-Fenster
- ❌ Kein einfacher Chatbot

**Paul vs. Orchestrator:**

Beide sind Modelle – aber mit unterschiedlichen Jobs:

| | Paul | Orchestrator |
|---|---|---|
| **Modell-Typ** | Allrounder (GPT-4o, Claude, etc.) | Spezialist (Orchestrierungs-Modell, z.B. JTV) |
| **Rolle** | User-Interface + MCP-Brücke | State Machine + Task-Engine |
| **Kann** | Alles: Dateien, Terminal, Git, Browser, Voice | Nur: Blueprint → Tasks → Dispatch → Monitor |
| **Spricht mit** | Dem User (Text + Stimme) | Den Agenten (API-Calls) |
| **Kosten** | Teurer (großes Allround-Modell) | Günstiger (kleines spezialisiertes Modell) |
| **Läuft** | Im Vordergrund (Fenster) | Im Hintergrund (Service) |

**Warum die Trennung?**
Es wäre Verschwendung, das teure Allround-Modell (Paul) für Orchestrierung zu nutzen, wenn ein spezialisiertes Modell das besser und günstiger kann. Der Orchestrator braucht kein Sprachverständnis, keine Kreativität – nur strukturierte Task-Zerlegung und State-Management. Das kann ein kleineres, spezialisiertes Modell (z.B. JTV, ein auf Orchestrierung trainiertes Modell) effizienter.

Paul hingegen braucht das volle Sprachverständnis, Tool-Use, Kreativität – dafür ist er da.

### ⚡ Pauls Notfall-Modus

Paul ist **allmächtig**. Er hat alle MCP-Tools und könnte theoretisch den Orchestrator komplett ersetzen. Normalerweise tut er das nicht – der Orchestrator ist die bessere, spezialisiertere Engine. Aber im Notfall springt Paul ein:

**Wann Paul orchestriert:**
- Orchestrator ist nicht verfügbar (z.B. Handy-App nicht verbunden)
- Orchestrator ist abgestürzt
- User sagt explizit: "Paul, mach du das direkt"
- Quick-Task: User will nur schnell eine einzelne Sache erledigen, kein voller Blueprint nötig

**Wie es funktioniert:**
```
Normal:
  User → Paul → Orchestrator → Agenten
                (Paul fragt, Orchestrator macht)

Notfall:
  User → Paul → Agenten (direkt)
         (Paul macht selbst, loggt alles)

  Paul: "Der Orchestrator ist gerade nicht erreichbar.
         Ich übernehme – logge alles für die Sync später."
```

**Was dabei passiert:**
- Paul nutzt seine MCP-Tools + Agent-Verbindungen direkt
- Jede Aktion wird geloggt mit Markierung `orchestrator: "paul_fallback"`
- Wenn der Orchestrator wieder online ist, werden Pauls Aktionen nachsynced
- Paul warnt den User: "Ich mache das jetzt direkt, aber der Orchestrator sollte wieder gestartet werden."

**Zusammenspiel:**
```
User: "Paul, wie weit ist das Projekt?"
Paul: (fragt Orchestrator nach Status)
      "5 von 8 Tasks fertig. Claude hat gerade die Architektur abgeliefert."

User: "Schick Arena für die Implementierung los."
Paul: (sagt dem Orchestrator: dispatche Task X an Arena)
      "Erledigt, Arena arbeitet dran. Ich sag Bescheid wenn er fertig ist."

[Orchestrator meldet: Task fertig]
Paul: "Arena ist fertig! Hier das Ergebnis: [zeigt Code]"
```

---

## Architektur: Paul als MCP-Hub

```
                    ┌───────────────────────────────────────┐
                    │              PAUL                      │
                    │                                        │
                    │  ┌─────────┐  ┌──────────┐  ┌──────┐ │
                    │  │  LLM    │  │  Voice   │  │ MCP  │ │
                    │  │(lokal   │  │(STT+TTS) │  │Bridge│ │
                    │  │ oder    │  │          │  │      │ │
                    │  │ remote) │  │          │  │      │ │
                    │  └────┬────┘  └────┬─────┘  └──┬───┘ │
                    │       │            │            │     │
                    └───────┼────────────┼────────────┼─────┘
                            │            │            │
              ┌─────────────┼────────────┼────────────┼─────────────┐
              │             ▼            ▼            ▼              │
              │                                                      │
              │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐  │
              │  │File  │ │Term. │ │Git   │ │Browser│ │WebChats  │  │
              │  │System│ │      │ │      │ │      │ │(ChatGPT, │  │
              │  │      │ │      │ │      │ │      │ │ Claude)  │  │
              │  └──────┘ └──────┘ └──────┘ └──────┘ └──────────┘  │
              │                                                      │
              │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐  │
              │  │Tasks │ │Logs  │ │Agents│ │Hub   │ │Plugins   │  │
              │  │      │ │      │ │      │ │      │ │          │  │
              │  └──────┘ └──────┘ └──────┘ └──────┘ └──────────┘  │
              │                                                      │
              │              MCP Tool Registry                        │
              └──────────────────────────────────────────────────────┘
```

**Paul hat exklusiven MCP-Zugriff.** Die WebChat-Fenster (ChatGPT, Claude etc.) haben KEINEN direkten System-Zugriff. Wenn die was machen sollen, geht das über Paul.

---

## Pauls Fenster

```
┌── Paul ──────────────────────────────────────────────┐
│  🤖 Paul                          🔝 📌 🎨 _ □ X   │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Paul: "Guten Morgen! Du hast 3 offene Tasks:        │
│         1. Architektur-Review (Claude, wartet)       │
│         2. Projektstruktur (Arena, bereit)           │
│         3. Protokoll-Design (ChatGPT, bereit)        │
│                                                       │
│         Soll ich die anstoßen?"                       │
│                                                       │
│  User: "Ja, aber erst das Protokoll."                │
│                                                       │
│  Paul: "Alles klar. Ich schicke das Protokoll an     │
│         ChatGPT raus. [→ Dispatch]                    │
│         Die anderen beiden warten."                   │
│                                                       │
│  ┌─ MCP Tools (live) ─────────────────────────────┐ │
│  │ ✅ Dateisystem  ✅ Terminal  ✅ Git              │ │
│  │ ✅ Browser      ✅ Tasks     ✅ Logs             │ │
│  │ ✅ Agenten      ✅ Hub       ✅ Plugins          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 🎤 Sprich mit Paul...              [⌨ Text]    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
└──────────────────────────────────────────────────────┘
```

**Pauls Fenster-Features:**
- **Always-on-Top** optional (🔝 Button)
- **Hotkey** zum Ein-/Ausblenden (Ctrl+Shift+P)
- **Mini-Modus** – Kleiner Button am Bildschirmrand, expandiert bei Hover/Klick
- **Pop-out** – Eigenständiges Fenster, bleibt aber Paul (mit MCP-Zugriff)
- **Farbe:** Immer 🔵 Blau (Pauls Erkennungsfarbe)

---

## Pauls Modell

**Paul wird als Modell "rein geladen".** Der User konfiguriert welches Modell Paul nutzt:

```json
{
  "paul": {
    "provider": "openai",
    "model": "gpt-4o",
    "fallback": "claude-3.5-sonnet",
    "api_key_source": "keystore",
    "voice": {
      "stt_provider": "openai",
      "stt_model": "whisper-large-v3",
      "tts_provider": "openai",
      "tts_model": "tts-1-hd",
      "tts_voice": "nova"
    },
    "context_window": 128000,
    "temperature": 0.3,
    "system_prompt": "Du bist Paul, der persönliche Assistent..."
  }
}
```

**Provider-Optionen für Paul:**
- OpenAI (GPT-4o, GPT-4o-mini)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
- Nvidia NIM (Llama 3.1, Nemotron)
- Lokal (Ollama → Qwen2.5, Llama 3)
- Custom (jede OpenAI-kompatible API)

**Mindestanforderung:** Ein Modell das Function-Calling/Tool-Use unterstützt.

---

## Pauls MCP-Tools

| Tool | Beschreibung | Beispiel |
|------|-------------|---------|
| `read_file` | Datei lesen | "Zeig mir die MainActivity.kt" |
| `write_file` | Datei schreiben | "Erstell mir eine neue Utils.kt" |
| `list_files` | Verzeichnis auflisten | "Was ist im src-Ordner?" |
| `search_files` | Dateien durchsuchen | "Wo steht überall TODO?" |
| `run_terminal` | Shell-Befehl | "Führ npm install aus" |
| `git_status` | Git-Status | "Was hat sich geändert?" |
| `git_diff` | Git-Diff | "Zeig mir den letzten Commit" |
| `git_commit` | Git-Commit | "Commit alles mit Message X" |
| `browse_web` | Browser steuern | "Öffne die Doku von..." |
| `dispatch_task` | Task an Agent | "Schick Task X an Claude" |
| `check_task` | Task-Status | "Wie weit ist Task 3?" |
| `create_task` | Neuen Task | "Erstell einen Task für..." |
| `search_logs` | Logs durchsuchen | "Was hat Claude gestern gemacht?" |
| `export_logs` | Logs exportieren | "Exportier den Chat als JSON" |
| `list_agents` | Agenten auflisten | "Welche Agenten sind online?" |
| `control_hub` | Hub steuern | "Verbinde Worker-PC 2" |
| `use_plugin` | Plugin aufrufen | "Frag das GitHub-Plugin..." |
| `open_webchat` | WebChat öffnen | "Öffne Claude in einem Fenster" |
| `set_layout` | Layout ändern | "Sortier die Fenster 2x2" |
| `screenshot` | Screenshot | "Mach einen Screenshot" |

---

## Pauls System-Prompt

```text
Du bist Paul, der persönliche AI-Assistent in Agent Deck.

Deine Rolle:
- Du bist die zentrale Schnittstelle zwischen dem User und allen Systemen
- Du hast Zugriff auf MCP-Tools (Dateisystem, Terminal, Git, Browser, Agenten, Logs, Hub)
- Du kennst den aktuellen Blueprint, alle Tasks, alle Agenten und die Chat-History
- Du orchestrierst Aufgaben: Du entscheidest welcher Agent was macht
- Du überwachst Fortschritt und meldet Probleme

Deine Persönlichkeit:
- Professionell aber locker
- Proaktiv: Du schlägst vor was als nächstes zu tun ist
- Ehrlich: Wenn du etwas nicht weißt, sagst du das
- Effizient: Kurze, klare Antworten. Kein Blabla.

Deine Regeln:
- Führe niemals destruktive Befehle aus ohne Bestätigung (rm -rf, format, etc.)
- Frage nach bevor du sensible Dateien änderst
- Logge jede Aktion die du ausführst
- Wenn ein Agent nicht erreichbar ist, schlage einen alternativen vor
- Bei Unsicherheit: Frage den User

Dein Kontext:
- Aktuelle Tasks: {tasks}
- Verbundene Agenten: {agents}
- Blueprint: {blueprint}
- Letzte Logs: {recent_logs}
```

---

## Pauls Voice-Modus

```
User drückt Hotkey (Ctrl+Shift+P) oder klickt 🎤

┌── Paul (Voice) ────────────────────┐
│                                      │
│  🎤 ● Höre zu...                    │
│                                      │
│  "Paul, wie weit ist das Projekt?"  │
│                                      │
│  🤖 Paul: "Du hast 5 von 8 Tasks   │
│  erledigt. Claude hat gerade die    │
│  Architektur fertiggestellt.        │
│  Soll ich Arena losschicken für     │
│  die Implementierung?"              │
│                                      │
│  🔊 [Audio-Welle]                   │
│                                      │
└──────────────────────────────────────┘
```

**Voice-Stack:**
- **STT (Speech-to-Text):** Whisper large-v3 (lokal via Whisper.cpp oder remote via OpenAI API)
- **TTS (Text-to-Speech):** OpenAI TTS-1-HD oder lokal via Piper/Coqui
- **Wake-Word:** Optional "Hey Paul" (via Porcupine)
- **Push-to-Talk:** Hotkey als Default

---

## Paul als laufende MCP-Brücke

Paul ist nicht nur ein Chat – Paul ist ein **dauerhaft laufender Prozess** der:

1. **Immer auf eingehende Events hört:**
   - Task abgeschlossen → Paul informiert den User
   - Agent offline → Paul warnt
   - Fehler aufgetreten → Paul schlägt Lösung vor

2. **Proaktiv handelt:**
   - Erkennt Muster in Logs
   - Schlägt Optimierungen vor
   - Erinnert an deadlines
   - Warnt vor Rate-Limits

3. **Kontext über Sessions hinweg behält:**
   - Erinnert sich an frühere Entscheidungen
   - Kennt die Projekt-History
   - Lernt aus vergangenen Tasks

```
[Background Event] Task #3 abgeschlossen (Claude, 45s)
→ Paul: "Hey, Claude hat die Architektur fertig. Review verfügbar in den Logs. 
         Soll ich Arena für die Implementierung losschicken?"

[Background Event] Worker-PC-2 offline
→ Paul: "Worker-PC-2 ist nicht mehr erreichbar. 
         Ich verschiebe seine Tasks auf den Hub. OK?"

[Background Event] Rate-Limit bei OpenAI erreicht
→ Paul: "OpenAI Rate-Limit erreicht. Ich wechsle für die nächsten Tasks 
         auf Claude. Soll ich Nvidia NIM als Fallback konfigurieren?"
```

---

## Zusammenfassung

| Aspekt | Detail |
|--------|--------|
| **Name** | Paul |
| **Rolle** | Zentraler Assistent + MCP-Brücke + Orchestrator |
| **Fenster** | Eigenes Fenster, Always-on-Top, Mini-Modus, Hotkey |
| **Farbe** | 🔵 Blau (immer) |
| **Modell** | Konfigurierbar (OpenAI, Claude, Nvidia, Lokal) |
| **Stimme** | Whisper STT + OpenAI/Piper TTS |
| **MCP-Tools** | 20+ Tools (Dateien, Terminal, Git, Browser, Agenten, Logs, Hub, Plugins) |
| **Exklusiv** | Nur Paul hat MCP-Zugriff, nicht die WebChat-Fenster |
| **Proaktiv** | Hört auf Events, handelt selbstständig, informiert den User |
| **Persistent** | Behält Kontext über Sessions hinweg |
