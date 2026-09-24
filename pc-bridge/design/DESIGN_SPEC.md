# MWCO Kartentisch — Design-Spec (Stand: eingefroren)

Lebender Prototyp: `index.html` (im Browser öffnen, kein Build nötig).

## Beschlossene Richtung
- **Freie Fläche als Kartentisch** (n8n/OmniRoute-Anmutung), zoom- & pannbar (Scrollrad / Fläche ziehen, HUD unten rechts).
- **Drei Stufen pro Element:** Node (klein) → Doppelklick = Karte aufgeklappt (Infos + letzte Nachrichten/Daten) → rausziehen = eigenes Fenster. Fenster reinziehen = wieder Karte.
- **Look:** dunkel, Glas (transparent + Blur), eher eckig (Radien 3–10px), Slate-Blau statt Schwarz.
- **Farbcodierung:** Paul lila · WebChat blau · Terminal grün · Logs amber · Orchestrator rosa · Austausch teal.
- **Verbindungslinien** zwischen Nodes (n8n-artig); aktive Aktionen „fließen" als animierte Linie.
- **Paul** = Alien-Avatar (`assets/paul.png`, Platzhalter im Stil von „Paul" dem Film-Alien).
- **LLM-Routen-Karte** (OmniRoute-Idee): zeigt, welches Modell welche Route fährt (lokal 7B/1.5B, API-Keys, whisper/piper).
- **Statusleiste oben:** Hub/Tailscale/Worker-Status, VRAM-Mini-Balken, Uhr, Paul-Button.
- **Paul-Launcher:** Ctrl+Shift+P, Glas-Overlay mit Befehls-Vorschlägen.

## Vorhandene Karten
Paul (MCP-Chat), LLM-Routen, Austausch (Mesh/IP-Tabellen), WebChat (kein MCP), Terminal, Logs, Orchestrator.

## OFFEN (als nächstes)
- [x] **Verbindungen selbst setzen:** Connect-Modus (Quelle → Ziel klicken), Linien erstellen/löschen. ✅ (22.09.2026, `Connect.tsx`)
- [x] **Verbindungen benennen:** eigene Labels pro Linie im Dialog + Panel. ✅ (22.09.2026, `Connect.tsx`)
- [ ] Karten selbst anlegen/löschen/umbenennen („alles Mögliche").
- [ ] Persistenz: Tisch-Layout + Verbindungen in SQLite (`layouts`-Tabelle existiert bereits im Backend).
- [x] Prototyp in die echte React-UI von `pc-bridge/src/ui` portieren. ✅ (22.09.2026: Sidebar, Topbar, Tisch, Launcher, alle Ansichten gebaut; `npm run dev:ui` zum Testen)
