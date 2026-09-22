<!-- SPDX-License-Identifier: MIT -->
# Design-Entscheidungen – Agent Deck PC-Bridge

Jede größere Entscheidung, **warum** wir sie so getroffen haben, und welche Alternativen es gab.

---

## 1. Technologie-Stack

### Electron + React + TypeScript
**Entscheidung:** Electron als Desktop-Framework, React für UI, TypeScript durchgängig.

**Warum:**
- Electron: Einzige ausgereifte Option für Cross-Platform Desktop mit Web-UI. Tauri wäre leichter, hat aber weniger Plugin-Ökosystem und die Windows-Installer-Erfahrung (Registry, Desktop-Shortcut) ist bei Electron ausgereifter.
- React: Komponentenmodell passt zum Grid-Layout (jede Zelle ist eine Komponente). Große Community, viele Libraries.
- TypeScript: Type-Safety über Backend + Frontend hinweg. Shared Types (Protocol.ts) verhindern Drift zwischen Android-App und PC-Bridge.

**Alternativen die wir verworfen haben:**
- Tauri (Rust): Leichter, aber weniger erprobt für komplexe Desktop-UIs
- Qt: Zu viel C++, kein Web-UI
- Flutter Desktop: Noch unreif für komplexe Layouts

### SQLite (better-sqlite3)
**Entscheidung:** better-sqlite3 für Persistenz.

**Warum:**
- Synchrones API → kein async overhead bei Lese-Operationen
- WAL-Mode → parallele Lesezugriffe ohne Locking
- Eine einzige Datei → einfach zu backupen, kein Server-Prozess
- metadata TEXT DEFAULT '{}' → Spalten erweiterbar ohne Migration

**Alternativen:**
- PostgreSQL/MySQL: Overkill für eine Desktop-App, bräuchte Server
- IndexedDB: Nur im Browser verfügbar, nicht im Main Process
- sql.js: Pure JS, aber langsamer und kein WAL-Mode

### Zustand statt Redux/MobX
**Entscheidung:** Zustand für UI-State.

**Warum:**
- Minimalistisch (~1KB), kein Boilerplate
- Kein Provider-Wrapper nötig
- Funktioniert gut mit TypeScript
- Proxy-basiert → intuitive API

**Alternativen:**
- Redux: Zu viel Boilerplate für unsere Größe
- MobX: Zu magisch, schwer zu debuggen
- React Context + useReducer: Reicht nicht für komplexe Grid-Operationen

---

## 2. Architektur

### MCP-Bus statt direkter Kommunikation
**Entscheidung:** Fenster kommunizieren NIE direkt, nur über den MCP-Bus.

**Warum:**
- Inspiriert von Terminal Grid VS Code Extension
- Lose Kopplung: Knoten kennen sich nicht gegenseitig
- Auditierbar: Jede Kommunikation wird geloggt
- Erweiterbar: Neue Knoten/Tools ohne bestehende ändern zu müssen
- Paul kann Tools auf anderen Knoten aufrufen, ohne zu wissen wo sie laufen

**Alternativen:**
- Direkte IPC-Kanäle: Schnell, aber tightly coupled
- Redux Store als Bus: Funktioniert, aber nicht für Tool-Aufrufe geeignet
- Event Emitter global: Keine Struktur, schwer zu debuggen

### Paul ist NICHT der Orchestrator
**Entscheidung:** Paul (Allrounder) und Orchestrator (Spezialist) sind getrennt.

**Warum:**
- Paul: Qwen2.5-7B (~4.5GB VRAM) – kann alles, aber Orchestrierung ist nicht sein Job
- Orchestrator: Qwen2.5-1.5B (~900MB VRAM) – nur Blueprint→Tasks→Dispatch
- Zusammen ~5.4GB → passt in 8GB VRAM Budget
- Paul kann im Notfall orchestrieren, tut es aber nur wenn der Orchestrator ausfällt

**Alternativen:**
- Ein einziges Modell für alles: Zu groß, zu teuer, zu langsam
- Cloud-APIs: Abhängigkeit von Internet + Kosten pro Request

### WebChat-Fenster haben KEINEN MCP-Zugriff
**Entscheidung:** WebChat-Zellen (ChatGPT, Claude etc.) sind reine Chat-Interfaces.

**Warum:**
- Sicherheit: Externe LLMs sollten keinen Systemzugriff haben
- Klarheit: Nur Paul hat Tools, WebChat ist nur Konversation
- Der User hat das explizit so gewollt

### Database optional (graceful degradation)
**Entscheidung:** Der Server startet auch ohne SQLite.

**Warum:**
- better-sqlite3 braucht native C++ Compilation (node-gyp)
- Auf manchen Systemen (CI, eingeschränkte Umgebungen) nicht verfügbar
- Kern-Funktionalität (WebSocket + MCP-Bus) soll immer laufen
- DB ist Persistenz – nice-to-have, kein Muss für den Betrieb

---

## 3. UI-Design

### 4×3 Grid statt freiem Floating
**Entscheidung:** Festes Grid-Layout (4 Spalten × 3 Zeilen), keine frei verschiebbaren Fenster.

**Warum:**
- Vorhersehbar: User weiß immer wo was ist
- Snap-Verhalten: Zellen rasten ein, kein pixelgenaues Positionieren
- Auto-Sort: 4 Presets (Vollbild, 50/50, 2+1, 2×2) decken 90% der Fälle ab
- Inspiriert von tiling Window Managern (i3, sway)

**Alternativen:**
- Freies Drag&Drop (wie alte Windows-Fenster): Chaos bei vielen Fenstern
- Tabs statt Grid: Verliert den Überblick-Aspekt

### Farbcodierung pro Zelle
**Entscheidung:** Jede Zelle hat eine Farbe (🔵🟣🟢🟡🟠🔴⚪).

**Warum:**
- Schnelle visuelle Orientierung – "Wo ist Paul?" → "Blau, links oben"
- 7 Farben reichen für typische Setups
- Farben sind änderbar pro Zelle

### Dark Mode Default
**Entscheidung:** Nur Dark Mode, kein Light Mode Toggle.

**Warum:**
- Zielgruppe: Entwickler, die eh Dark Mode bevorzugen
- Weniger CSS-Work (keine Theme-Variablen duplizieren)
- Kann später ergänzt werden wenn Bedarf besteht

### Custom Titlebar (frameless)
**Entscheidung:** `frame: false` in Electron, eigene Titlebar.

**Warum:**
- Konsistentes Aussehen auf allen Plattformen
- Toolbar und Titlebar verschmelzen → mehr Platz für Content
- Windows-typisch für moderne Desktop-Apps (VS Code, Discord, Slack)

---

## 4. Protokolle & Kommunikation

### WebSocket (ws) statt Socket.IO
**Entscheidung:** Natives WebSocket-Protokoll mit der `ws` Library.

**Warum:**
- Android-App nutzt Ktor WebSocket (Standard-Protokoll)
- Socket.IO wäre ~5× größer und braucht Fallback-Logik die wir nicht brauchen
- Beide Seiten (Android + PC) sind modern → kein HTTP-Long-Polling nötig

### JSON-Protokoll statt Protobuf/MessagePack
**Entscheidung:** Alle Nachrichten als JSON.

**Warum:**
- Debugging: Einfach lesbar in DevTools und Logs
- Einfach zu erweitern: Neue Felder brechen nichts
- Performance ist ausreichend: Tasks dauern Sekunden, nicht Millisekunden

---

## 5. Build & Distribution

### Vite statt Webpack/CRA
**Entscheidung:** Vite als UI Build-Tool.

**Warum:**
- ~10× schneller als Webpack (ESBuild für Transpilation)
- Native ESM im Dev-Mode → kein Bundling nötig
- HMR funktioniert out-of-the-box mit React

### electron-builder statt electron-forge
**Entscheidung:** electron-builder für Packaging.

**Warum:**
- NSIS Installer + Portable .exe in einem Tool
- Automatische Icon-Konvertierung (PNG → ICO)
- Auto-Update Support vorbereitet
- Konfiguration direkt in package.json

### better-sqlite3 statt sql.js
**Entscheidung:** Native better-sqlite3 trotz Build-Komplexität.

**Warum:**
- 10-50× schneller als sql.js (WASM-Overhead)
- WAL-Mode für echte parallele Zugriffe
- Auf dem Ziel-PC (Windows mit Build Tools) ist die Installation einmalig
- Graceful Degradation wenn nicht verfügbar
