# 🧠 Entscheidungskatalog – Agent Deck PC-Bridge

Dieser Katalog listet alle wichtigen Entscheidungen auf, mit Erklärungen was die Optionen überhaupt bedeuten, was Vor- und Nachteile für unseren Use Case sind, und meine ehrliche Einschätzung als Senior Developer.

---

## 1. Programmiersprache / Runtime

Die wichtigste Entscheidung zuerst: In welcher Sprache bauen wir die Bridge?

### Option A: Node.js + TypeScript

**Was ist das?**  
JavaScript-Runtime mit optionalem TypeScript-Typing. Die gleiche Technologie die auch Webserver, CLI-Tools und Desktop-Apps (Electron) antreibt.

**Vorteile für uns:**
- **WebSocket ist erstklassig** – `ws` Library ist der De-facto-Standard, extrem ausgereift
- **npm-Ökosystem** – Für alles gibt es ein Package: Terminal (`node-pty`), File-Watching (`chokidar`), Git (`simple-git`), mDNS (`multicast-dns`)
- **Cross-platform** – Läuft identisch auf Windows, Linux, macOS
- **Kann in Electron/Tauri eingebettet werden** – Wenn wir später ein UI wollen, ist der Code schon da
- **Async I/O** – Perfekt für WebSocket-Server der auf viele gleichzeitige Requests wartet
- **Entwicklungsgeschwindigkeit** – Schneller Prototyp, schnelle Iteration

**Nachteile:**
- **Braucht Node.js Runtime auf dem PC** – Oder wir packen es mit `pkg`/`nexe` in eine .exe (~40-80MB)
- **Single-threaded** – CPU-intensive Tasks (Code-Compiling) blocken den Event Loop
- **Memory** – Node.js hat ~30-50MB Baseline-Verbrauch
- **Sicherheit** – JavaScript ist nicht für Sandboxing designed

**Meine Einschätzung:** ⭐⭐⭐⭐ (4/5)  
Beste Wahl für schnelle Entwicklung und gutes Ökosystem. Die Runtime-Problematik lösen wir mit `pkg` (standalone .exe). Single-threaded ist okay, weil wir Shell-Befehle in Child-Processes auslagern.

---

### Option B: Rust (axum/tokio)

**Was ist das?**  
Systemprogrammiersprache ohne Garbage Collector. `tokio` ist das async Runtime-Framework, `axum` der Web/WebSocket-Framework darauf.

**Vorteile für uns:**
- **Winzige Binary** – ~3-5MB standalone .exe, keine Runtime nötig
- **Maximale Performance** – Kein GC, kein Overhead
- **Memory-Safe** – Compile-Time-Garantien gegen Memory-Leaks und Data Races
- **Perfekt für System-Nähe** – Direkter OS-Zugriff, nativer Prozess-Support
- **Cross-platform** – Compiliert nativ für Windows, Linux, macOS

**Nachteile:**
- **Entwicklungsgeschwindigkeit** – 3-5x langsamer als Node.js für die gleiche Funktionalität
- **Lernkurve** – Ownership, Borrowing, Lifetimes sind komplex
- **Kleineres Ökosystem** – Weniger Packages für Nischen-Anwendungen (mDNS, Terminal-Emulation)
- **Compile-Zeiten** – Kann Minuten dauern bei größeren Projekten
- **node-pty Äquivalent** – `portable-pty` existiert, ist aber weniger ausgereift

**Meine Einschätzung:** ⭐⭐⭐⭐⭐ (5/5 für Qualität, 3/5 für Geschwindigkeit)  
Technisch die beste Wahl, aber deutlich langsamer in der Entwicklung. Wenn du Rust kannst oder lernen willst: Go for it. Wenn du schnell ein MVP willst: Nimm Node.js und portiere später.

---

### Option C: Python (FastAPI + websockets)

**Was ist das?**  
Python mit FastAPI als Web-Framework und der `websockets` Library für WebSocket-Support.

**Vorteile für uns:**
- **Einfachste Entwicklung** – Python ist die am schnellsten zu schreibende Sprache
- **Gute WebSocket-Support** – `websockets` Library ist solide
- **AI/ML Integration** – Falls wir Ollama/llama.cpp direkt einbinden wollen, ist Python die native Sprache
- **Subprocess** – `subprocess.run()` für Terminal-Befehle ist sehr einfach
- **Großes Ökosystem** – Für alles gibt es ein pip-Package

**Nachteile:**
- **Braucht Python-Runtime** – ~30MB, oder PyInstaller erzeugt ~50-100MB Binaries
- **Langsam** – 10-50x langsamer als Rust, 2-5x langsamer als Node.js
- **GIL (Global Interpreter Lock)** – Kein echtes Multi-Threading
- **Distribution** – Python auf Windows verteilen ist nervig (Versionen, PATH, venv)
- **Nicht nativ** – Fühlt sich nicht wie eine "richtige" Desktop-App an

**Meine Einschätzung:** ⭐⭐⭐ (3/5)  
Gut für Prototyping, schlecht für Distribution. Wenn die Bridge primär mit AI-Modellen interagieren soll (Ollama-API), ist Python praktisch. Aber für eine produktive Desktop-Anwendung würde ich es nicht empfehlen.

---

### Option D: C# / .NET 8

**Was ist das?**  
Microsofts moderne Programmiersprache mit dem .NET-Runtime-Framework. Native Windows-Entwicklung.

**Vorteile für uns:**
- **Nativ für Windows** – Beste Integration, beste Performance auf Windows
- **Keine Runtime nötig** – `dotnet publish --self-contained` erzeugt standalone .exe (~20MB)
- **Starkes Typing** – Besser als TypeScript, zur Compile-Time geprüft
- **Hervorragende Async-Unterstützung** – `async/await` ist erstklassig
- **Windows-spezifische Features** – Registry, WMI, Windows Services, System-Tray nativ
- **Enterprise-ready** – Logging, DI, Configuration alles eingebaut

**Nachteile:**
- **Windows-lastig** – Cross-platform geht, ist aber second-class
- **WebSocket** – `System.Net.WebSockets` ist okay, aber weniger ergonomic als `ws` in Node
- **.NET Ökosystem** – NuGet hat weniger Packages als npm für Nischen-Themen
- **Verbose** – Mehr Code für die gleiche Funktionalität als Node.js oder Python
- **Image** – C# wird oft als "Enterprise/Corporate" wahrgenommen

**Meine Einschätzung:** ⭐⭐⭐⭐ (4/5 für Windows, 3/5 für cross-platform)  
Wenn die Bridge **primär für Windows** ist und du C# kannst, ist das eine hervorragende Wahl. System-Tray, Windows Service, Auto-Start – alles nativ. Cross-platform ist möglich aber nicht so smooth.

---

### Option E: Go (Gorilla WebSocket)

**Was ist das?**  
Googles Programmiersprache, designed für Netzwerk-Services und nebenläufige Systeme.

**Vorteile für uns:**
- **Standalone Binary** – ~10-15MB, keine Runtime, instant start
- **Eingebaute Concurrency** – Goroutines sind perfekt für WebSocket-Server
- **Cross-platform** – Compiliert nativ für alle Plattformen
- **Einfach** – Kleine Sprache, schnell zu lernen
- **Performance** – Zwischen Node.js und Rust

**Nachteile:**
- **Generics sind neu** – Weniger ergonomisch für typisierte Protokolle
- **Kleines Ökosystem** – Weniger Packages für Desktop-spezifische Dinge
- **Error-Handling** – `if err != nil` überall, kein try/catch
- **Terminal-Support** – `os/exec` ist basic, kein PTY-Support out-of-the-box
- **Kein natives System-Tray** – Braucht CGo und externe Libraries

**Meine Einschätzung:** ⭐⭐⭐ (3/5)  
Gute Wahl für reine Netzwerk-Services, aber für eine Desktop-Bridge mit Terminal/Filesystem/System-Tray fehlen die Libraries.

---

### Option F: C++ (Boost.Beast / Crow)

**Was ist das?**  
Die "Muttersprache" der System-Programmierung. Boost.Beast bietet HTTP/WebSocket auf Basis von Boost.Asio.

**Vorteile für uns:**
- **Maximale Kontrolle** – Direkter Zugriff auf alles
- **Performance** – Schneller geht's nicht
- **Winzige Binary** – Kann <1MB sein
- **Enterprise-Kompatibilität** – Viele Unternehmen nutzen C++ für System-Tools

**Nachteile:**
- **Entwicklungsgeschwindigkeit** – 10x langsamer als Node.js
- **Memory-Management** – Manuell, fehleranfällig
- **Build-System** – CMake ist komplex, Dependencies verwalten ist ein Albtraum (vcpkg, conan)
- **WebSocket-Libraries** – Boost.Beast ist low-level, Crow ist klein
- **Cross-platform** – Geht, aber Windows/Linux/macOS haben alle ihre Eigenheiten

**Meine Einschätzung:** ⭐⭐ (2/5)  
Nur sinnvoll wenn du C++-Experte bist und maximale Performance brauchst. Für unseren Use Case ist das Overkill.

---

## 2. UI / Sichtbarkeit

Soll die Bridge ein sichtbares Fenster haben?

### Option A: Headless (kein UI)

**Was ist das?**  
Die Bridge läuft unsichtbar im Hintergrund. Nur ein Prozess im Task-Manager.

| Pro | Contra |
|-----|--------|
| Einfachste Implementierung | User weiß nicht ob es läuft |
| Kein UI-Framework nötig | Keine Einstellungen ohne Config-Datei |
| Wenig Ressourcen | Kein Status sichtbar |

**Meine Einschätzung:** ⭐⭐ (2/5) – User Experience ist miserabel. Man vergisst ob die Bridge läuft.

---

### Option B: System-Tray Icon

**Was ist das?**  
Ein kleines Icon unten rechts in der Taskleiste (bei Windows). Rechtsklick öffnet ein Menü mit Status, Einstellungen, Beenden.

| Pro | Contra |
|-----|--------|
| Minimal-invasiv | Begrenzter Platz für UI |
| User sieht dass es läuft | Tray-Icons werden manchmal versteckt |
| Schnell implementiert (in C#/Electron) | In Node.js braucht man `tray` Package |

**Meine Einschätzung:** ⭐⭐⭐⭐⭐ (5/5) – Perfekt für eine Background-App. Standard für Tools wie Dropbox, 1Password, etc.

---

### Option C: Tray + Settings-Fenster

**Was ist das?**  
System-Tray Icon plus ein Fenster das bei Klick/Doppelklick aufgeht. Zeigt Status, verbundene Geräte, letzte Tasks, Einstellungen.

| Pro | Contra |
|-----|--------|
| Gute UX: Tray für Alltag, Fenster für Details | Braucht ein UI-Framework |
| User kann Einstellungen ohne Config-Datei ändern | Mehr Code |
| Professioneller Eindruck | Braucht Design |

**Meine Einschätzung:** ⭐⭐⭐⭐ (4/5) – Gute Balance. Aber: UI-Framework muss gewählt werden.

---

### Option D: Vollständiges Dashboard

**Was ist das?**  
Ein richtiges Fenster mit Task-Übersicht, Live-Logs, Einstellungen, Agenten-Status.

| Pro | Contra |
|-----|--------|
| Beste UX | Viel Entwicklungsarbeit |
| Power-User-Features | Overkill für MVP |
| Professionelles Produkt | Braucht Designer |

**Meine Einschätzung:** ⭐⭐⭐ (3/5) – Toll für V2, aber Overkill für MVP.

---

## 3. UI-Framework (wenn UI gewünscht)

Falls Option B-D bei Frage 2:

### Electron (HTML/CSS/JS)
- ✅ Gleiches Team kann Frontend + Backend bauen
- ✅ Riesiges Ökosystem
- ❌ ~150MB Installer (Chromium mitgepackt)
- ❌ Hoher RAM-Verbrauch (~200MB+)

### Tauri (Rust + WebView)
- ✅ Winzig (~5MB Installer)
- ✅ Nutzt OS-WebView (kein Chromium)
- ❌ Braucht Rust-Backend
- ❌ WebView-Rendering kann inkonsistent sein

### Qt (C++/Python)
- ✅ Nativ aussehend, schnell
- ✅ Sehr ausgereift (20+ Jahre)
- ❌ Kommerzielle Lizenz (GPL oder $$$)
- ❌ Komplexe Lernkurve

### WPF/WinUI (C#)
- ✅ Nativ für Windows, perfekt integriert
- ✅ Microsoft-Support
- ❌ Nur Windows
- ❌ Veraltetes Design (WPF) oder sehr neu (WinUI 3)

### Meine Einschätzung
Für MVP: **Electron** wenn Node.js, **WPF/WinUI** wenn C#. Tauri ist die beste Langzeit-Wahl.

---

## 4. Discovery – Wie findet die App den PC?

### Option A: Manuelle IP-Eingabe

**Was ist das?**  
Der User tippt die IP-Adresse des PCs in der Android-App ein.

| Pro | Contra |
|-----|--------|
| Extrem einfach | User muss IP kennen |
| Kein额外er Code | IP ändert sich (DHCP) |
| Funktioniert immer | Schlechte UX |

**Meine Einschätzung:** ⭐⭐⭐ (3/5) – Als Fallback gut, als einzige Option nervig.

---

### Option B: mDNS / Bonjour

**Was ist das?**  
Die Bridge announced sich im lokalen Netzwerk. Die App scannt das LAN und findet alle Bridges automatisch. (Das Gleiche was AirPrint, Chromecast, Sonos machen.)

| Pro | Contra |
|-----|--------|
| Automatisch, keine User-Action | Funktioniert nur im gleichen LAN |
| Professionelle UX | Komplexer zu implementieren |
| IP-Änderungen egal | Manche Router blocken mDNS |

**Meine Einschätzung:** ⭐⭐⭐⭐ (4/5) – Beste UX für Home/LAN-Setup.

---

### Option C: QR-Code Pairing

**Was ist das?**  
Die Bridge zeigt einen QR-Code (IP + Token). Die App scannt ihn und verbindet sich automatisch.

| Pro | Contra |
|-----|--------|
| Einmaliges Pairing, dann automatisch | Braucht QR-Code-Anzeige (UI!) |
| Sicher (Token im QR) | Funktioniert nicht remote |
| Bekannt von WhatsApp Web etc. | Braucht Kamera |

**Meine Einschätzung:** ⭐⭐⭐⭐ (4/5) – Sehr gute UX, bekanntes Pattern.

---

### Option D: Cloud-Relay / Tunnel

**Was ist das?**  
Beide Seiten verbinden sich zu einem Cloud-Server der als Relay fungiert. Funktioniert auch über verschiedene Netzwerke hinweg. (Wie ngrok, Tailscale, TeamViewer.)

| Pro | Contra |
|-----|--------|
| Funktioniert ÜBERALL (nicht nur LAN) | Braucht Cloud-Server (Kosten!) |
| Kein NAT-Traversal-Problem | Latenz durch Relay |
| Remote-Zugriff möglich | Datenschutz-Bedenken |

**Meine Einschätzung:** ⭐⭐⭐ (3/5) – Enterprise-Feature, für V2 oder wenn Remote-Zugriff wichtig ist.

---

### Option E: Pairing-Code (wie Discord/Spotify)

**Was ist das?**  
Die Bridge zeigt einen 6-stelligen Code. User tippt den in der App ein. Verbindung wird hergestellt.

| Pro | Contra |
|-----|--------|
| Einfach, kein QR nötig | Code muss abgetippt werden |
| Funktioniert auch mit NAT | Braucht Signaling-Server |

**Meine Einschätzung:** ⭐⭐⭐ (3/5) – Guter Kompromiss wenn kein QR möglich ist.

---

## 5. Sicherheit

### Option A: Shared Token (einfach)

**Was ist das?**  
Beide Seiten kennen den gleichen geheimen Token. Wird bei Verbindungsaufbau gesendet.

| Pro | Contra |
|-----|--------|
| Extrem einfach | Token muss manuell geteilt werden |
| Kein Crypto-Overhead | Kein Perfect Forward Secrecy |
| Reicht für Heimgebrauch | Token kann mitgeschnitten werden (ohne TLS) |

**Meine Einschätzung:** ⭐⭐⭐ (3/5) – Okay für MVP im eigenen LAN.

---

### Option B: TLS/WSS (verschlüsseltes WebSocket)

**Was ist das?**  
WebSocket über TLS (wie HTTPS). Alle Daten sind verschlüsselt.

| Pro | Contra |
|-----|--------|
| Verschlüsselt | Braucht Zertifikat |
| Standard-Sicherheit | Self-signed = Browser-Warnungen |
| Abhörsicher | CA-Zertifikat kostet Geld (oder Let's Encrypt = Domain nötig) |

**Meine Einschätzung:** ⭐⭐⭐⭐ (4/5) – Sollte man haben, aber Self-signed Zertifikate sind UX-mäßig nervig.

---

### Option C: mTLS (gegenseitige Authentifizierung)

**Was ist das?**  
Beide Seiten weisen sich mit Zertifikaten aus. Extrem sicher.

| Pro | Contra |
|-----|--------|
| Höchste Sicherheit | Extrem komplex einzurichten |
| Kein MITM möglich | Zertifikat-Management |
| Enterprise-Standard | Overkill für Heimgebrauch |

**Meine Einschätzung:** ⭐⭐ (2/5 für MVP, 5/5 für Enterprise) – Nur wenn du Enterprise-Kunden hast.

---

### Option D: E2E-Verschlüsselung + Token

**Was ist das?**  
Token für Auth + symmetrische Verschlüsselung der Payloads (AES-256-GCM). Kein TLS nötig.

| Pro | Contra |
|-----|--------|
| Verschlüsselt ohne Zertifikate | Komplexer zu implementieren |
| Token-basiert = einfach | Key-Exchange Problem |

**Meine Einschätzung:** ⭐⭐⭐ (3/5) – Guter Kompromiss, aber aufwendig.

---

## 6. Code-Ausführung / Sandboxing

Wenn die Bridge Code ausführen soll – wie isoliert?

### Option A: Direkt ausführen (kein Sandboxing)

**Was ist das?**  
Shell-Befehle werden direkt im System ausgeführt. Wie ein normales Terminal.

| Pro | Contra |
|-----|--------|
| Einfach, volle Power | AI kann `rm -rf /` ausführen |
| Keine Performance-Einbußen | Keine Isolation |
| Alle System-Tools verfügbar | Risiko bei fehlerhaften Tasks |

**Meine Einschätzung:** ⭐⭐ (2/5) – Zu riskant ohne Schutzmaßnahmen.

---

### Option B: Pfad-Restriktion + Allowlist

**Was ist das?**  
Befehle dürfen nur in bestimmten Verzeichnissen ausgeführt werden. Gefährliche Befehle (`rm -rf`, `format`, `del /s`) werden geblockt.

| Pro | Contra |
|-----|--------|
| Guter Schutz bei einfacher Implementierung | Umgehbar (Symlinks, relative Pfade) |
| Keine Performance-Einbußen | Allowlist nie vollständig |
| User kontrolliert erlaubte Pfade | |

**Meine Einschätzung:** ⭐⭐⭐⭐ (4/5) – Guter Kompromiss für MVP.

---

### Option C: Docker-Container

**Was ist das?**  
Jeder Task läuft in einem isolierten Docker-Container.

| Pro | Contra |
|-----|--------|
| Echte Isolation | Braucht Docker installiert |
| Reproduzierbar | Overhead (~500MB RAM pro Container) |
| Keine System-Schäden möglich | Langsamer Start |

**Meine Einschätzung:** ⭐⭐⭐ (3/5) – Toll für Enterprise, Overkill für Heimgebrauch.

---

### Option D: Windows Sandbox / VM

**Was ist das?**  
Code läuft in einer Windows Sandbox oder leichten VM.

| Pro | Contra |
|-----|--------|
| Maximale Isolation | Nur Windows Pro/Enterprise |
| System bleibt sauber | Hoher Ressourcen-Verbrauch |
| Enterprise-Feature | Langsam |

**Meine Einschätzung:** ⭐⭐ (2/5) – Nur für Enterprise mit entsprechenden Lizenzen.

---

## 7. Distribution / Installation

Wie bekommt der User die Bridge auf seinen PC?

### Option A: Portable .exe (kein Installer)

**Was ist das?**  
Eine einzelne .exe Datei die man irgendwo hinlegt und startet.

| Pro | Contra |
|-----|--------|
| Einfach zu verteilen | Kein Auto-Start |
| Keine Admin-Rechte nötig | Kein Eintrag in "Programme" |
| Schnell | Kein Auto-Update |

**Meine Einschätzung:** ⭐⭐⭐⭐ (4/5) – Beste MVP-Lösung.

---

### Option B: MSI/EXE Installer

**Was ist das?**  
Klassischer Windows-Installer mit "Weiter, Weiter, Fertig".

| Pro | Contra |
|-----|--------|
| Professionell | Aufwendig zu erstellen |
| Registry-Einträge | Admin-Rechte nötig |
| Uninstaller | Braucht Signing für SmartScreen |

**Meine Einschätzung:** ⭐⭐⭐ (3/5) – Gut für V2.

---

### Option C: MSIX / Microsoft Store

**Was ist das?**  
Modernes Windows-Package-Format. Distribution über den Microsoft Store.

| Pro | Contra |
|-----|--------|
| Auto-Update eingebaut | Microsoft-Zertifizierung nötig |
| Vertrauenswürdig | Eingeschränkte System-Zugriffe (Sandbox!) |
| Einfache Installation | Store-Gebühren |

**Meine Einschätzung:** ⭐⭐ (2/5) – Die Sandbox-Einschränkungen von MSIX verhindernTerminal/Filesystem-Zugriff.

---

### Option D: Winget / Chocolatey

**Was ist das?**  
Package-Manager für Windows. `winget install agent-deck-bridge`

| Pro | Contra |
|-----|--------|
| Einfache Installation | Braucht erst mal ein Package |
| Auto-Update | Review-Prozess |
| Developer-freundlich | Nicht alle User kennen winget |

**Meine Einschätzung:** ⭐⭐⭐ (3/5) – Gute Ergänzung, nicht als einzige Option.

---

## 8. Auto-Update

### Option A: Manuell

User lädt neue Version selbst herunter.

### Option B: Built-in Update-Check

Bridge prüft beim Start ob es eine neue Version gibt und benachrichtigt den User.

### Option C: Automatisches Silent-Update

Bridge updated sich selbst im Hintergrund. (Wie Chrome, VS Code.)

**Meine Einschätzung:** Für MVP: **A oder B**. Silent-Update ist Enterprise/Consumer-Polish.

---

## 9. Logging & Debugging

### Option A: Nur Console-Output
### Option B: Log-Datei (lokal)
### Option C: Log-Datei + Remote-Streaming (Sentry/Logstash)
### Option D: Strukturierte Logs + lokale SQLite-Datenbank

**Meine Einschätzung:** Für MVP: **B** (Log-Datei). Sentry ist ein gutes Add-on für Production.

---

## 10. Konfiguration

### Option A: JSON-Datei

Einfach, lesbar, editierbar. Standard für Node.js.

### Option B: TOML-Datei

Lesbarer als JSON (Kommentare erlaubt!). Standard für Rust/Go.

### Option C: GUI Settings-Fenster

User klickt sich durch Einstellungen. Speichert in Registry oder Datei.

### Option D: YAML + JSON + GUI (Multi-Layer)

Default → Config-Datei → Umgebungsvariablen → GUI-Override. Enterprise-Standard.

**Meine Einschätzung:** Für MVP: **A** (JSON). GUI-Settings in V2.

---

## 11. Enterprise-Features (übertrieben)

Falls du groß denkst:

| Feature | Beschreibung | Aufwand |
|---------|--------------|---------|
| **Multi-User** | Mehrere Android-Apps verbinden sich mit einer Bridge | Mittel |
| **RBAC** | Role-Based Access Control (Admin/Developer/Viewer) | Hoch |
| **Audit-Log** | Jede Aktion wird protokolliert (wer, was, wann) | Mittel |
| **SSO/LDAP** | Active Directory Integration | Hoch |
| **Cluster** | Mehrere Bridges als Farm | Sehr hoch |
| **Policy-Engine** | Zentrale Richtlinien (welche Befehle erlaubt sind) | Hoch |
| **Compliance** | SOC2, ISO27001-konform | Sehr hoch |
| **API-Gateway** | Rate-Limiting, Auth, Monitoring vor der Bridge | Mittel |
| **Webhook-Integration** | Slack/Teams-Benachrichtigung bei Tasks | Niedrig |
| **Plugin-System** | Erweiterbare Bridge (User schreibt eigene Plugins) | Hoch |

---

## 12. Zusammenfassung – Meine Top-Empfehlungen

### Für MVP (schnell lauffähig):
| Entscheidung | Empfehlung |
|---|---|
| Sprache | **Node.js + TypeScript** |
| UI | **System-Tray Icon** |
| Discovery | **Manuell + mDNS** |
| Sicherheit | **Shared Token + Pfad-Restriktion** |
| Sandboxing | **Pfad-Blocklist + Command-Filter** |
| Distribution | **Portable .exe (pkg)** |
| Konfiguration | **JSON-Datei** |

### Für V1 (Production-Ready):
| Entscheidung | Empfehlung |
|---|---|
| Sprache | **Node.js + TypeScript** oder **Rust** |
| UI | **Tauri (Tray + Settings)** |
| Discovery | **mDNS + QR-Code** |
| Sicherheit | **TLS + Token** |
| Sandboxing | **Docker (optional)** |
| Distribution | **Installer + Winget** |
| Auto-Update | **Built-in Update-Check** |

### Für Enterprise:
| Entscheidung | Empfehlung |
|---|---|
| Sprache | **Rust** oder **C#** |
| UI | **Tauri** oder **WPF** |
| Discovery | **mDNS + Cloud-Relay** |
| Sicherheit | **mTLS + RBAC** |
| Sandboxing | **Docker + Policy-Engine** |
| Distribution | **MSI + Winget + SCCM** |
| Monitoring | **Sentry + strukturierte Logs** |

---

## Jetzt bist du dran!

Sag mir:
1. **Was willst du?** (MVP, V1, oder Enterprise?)
2. **Welche Sprache?** (Oder soll ich für dich wählen?)
3. **Welche Features sind dir wichtig?** (Was muss rein, was kann warten?)
4. **Eigene Ideen?** (Alles was dir noch einfällt, was oben nicht steht)
