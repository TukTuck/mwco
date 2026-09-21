# 🛠️ Developer Briefing – Stream D: Hub/Worker + Tailscale

## Kontext

Du arbeitest an **Agent Deck Desktop** – einer Electron-App die als AI Agent Cockpit fungiert. Dein Job ist die **Multi-PC-Architektur**: Mehrere PCs verbinden sich über Tailscale, einer ist der Hub, die anderen sind Worker.

Lies `pc-bridge/docs/FINALE_ARCHITEKTUR.md` Abschnitt "Hub-Architektur" für das Gesamtbild.

## Dein Job: Hub/Worker-System + Tailscale-Integration

### Was du baust:

1. **Tailscale-Integration**
   - Device-Discovery im Tailnet (wer ist online?)
   - Automatische IP-Auflösung über Tailscale-DNS
   - Tailscale-Identity für Auth (kein extra Token nötig)
   - mDNS als Fallback (wenn kein Tailscale)

2. **Hub-Modus**
   - Registriert sich als Hub im Netzwerk
   - Akzeptiert Worker-Registrierungen
   - Verwaltet verbundene Workers (Status, Capabilities)
   - Dispatched Tasks an passende Workers (Capability-Matching)
   - Aggregiert Results von Workers
   - Web-UI für Remote-Zugriff (über Tailscale-URL)

3. **Worker-Modus**
   - Meldet sich beim Hub an (mit Capabilities)
   - Empfängt Tasks vom Hub
   - Führt Tasks lokal aus (über MCP-Server von Stream B)
   - Sendet Results zurück an Hub
   - Heartbeat an Hub

4. **Task-Dispatch über Netzwerk**
   - Orchestrator wählt Worker basierend auf Capabilities
   - Task wird serialisiert über WebSocket gesendet
   - Worker führt aus und sendet Result zurück
   - Hub aggregiert und gibt an Orchestrator weiter

5. **GitHub-Sync**
   - Worker kann Code auf GitHub pushen
   - Hub prüft ob Push angekommen ist
   - Diff/PR-Erstellung als Teil des Task-Results

### Tech-Stack:

- **Tailscale:** Tailscale CLI + API (`tailscale status`, `tailscale ip`)
- **mDNS:** `multicast-dns` (npm package)
- **WebSocket:** `ws` (gleiche Library wie Stream B)
- **GitHub:** `@octokit/rest` (GitHub API)
- **HTTP:** Für Health-Checks und Web-UI
- **TypeScript strict**

### Interfaces die du einhalten musst:

**Zu Stream B (WebSocket-Server):**
```typescript
// Du erweiterst den WebSocket-Server von Stream B um Hub/Worker-Nachrichten:
interface HubMessages {
  'hub:register': {
    workerId: string;
    hostname: string;
    platform: string;
    capabilities: string[]; // ['terminal', 'filesystem', 'git', 'code_exec']
    tailscaleIp?: string;
  };
  'hub:heartbeat': {
    workerId: string;
    status: 'idle' | 'busy' | 'error';
    currentTask?: string;
    cpu: number;
    memory: number;
  };
  'hub:dispatch': {
    taskId: string;
    workerId: string;
    actions: BridgeAction[];
    timeout: number;
  };
  'hub:result': {
    taskId: string;
    workerId: string;
    success: boolean;
    results: ActionResult[];
    error?: string;
  };
  'hub:status': {
    workers: WorkerInfo[];
    pendingTasks: number;
    activeTasks: number;
  };
}
```

**Tailscale-Integration:**
```typescript
interface TailscaleService {
  getStatus(): Promise<TailscaleStatus>;
  getDevices(): Promise<TailscaleDevice[]>;
  getLocalIp(): Promise<string>;
  isRunning(): Promise<boolean>;
  getDeviceByName(name: string): Promise<TailscaleDevice | null>;
}

interface TailscaleDevice {
  id: string;
  name: string;
  ip: string;
  online: boolean;
  os: string;
  lastSeen: Date;
}
```

**mDNS Fallback:**
```typescript
interface MDNSDiscovery {
  advertise(port: number, info: Record<string, string>): void;
  discover(serviceType: string): AsyncIterable<DiscoveredService>;
  stop(): void;
}

interface DiscoveredService {
  name: string;
  host: string;
  port: number;
  addresses: string[];
  info: Record<string, string>;
}
```

### Deliverables:

- [ ] Tailscale-Integration: Device-Discovery, IP-Auflösung, Identity
- [ ] mDNS Fallback: Service-Advertisement + Discovery
- [ ] Hub-Modus: Worker-Registrierung, Status-Übersicht, Task-Dispatch
- [ ] Worker-Modus: Anmeldung beim Hub, Task-Empfang, Ausführung, Result-Send
- [ ] Capability-Matching: Tasks werden an passende Workers dispatcht
- [ ] Heartbeat-System: Hub erkennt offline Workers
- [ ] GitHub-Sync: Worker pushed Code, Hub verifiziert
- [ ] Web-UI: Einfache Status-Seite über HTTP (Tailscale-URL)
- [ ] Error-Handling: Worker-Offline → Task an anderen Worker oder Hub
- [ ] Logging: Alle Hub/Worker-Aktionen im Audit-Log

### Ordnerstruktur:

```
pc-bridge/src/
├── hub/
│   ├── HubServer.ts           # Hub-Modus (Worker-Registry + Dispatch)
│   ├── WorkerClient.ts        # Worker-Modus (Anmeldung + Task-Empfang)
│   ├── WorkerRegistry.ts      # Verwaltet verbundene Workers
│   ├── TaskDispatcher.ts      # Matching + Dispatch an Workers
│   ├── ResultAggregator.ts    # Results sammeln + an Orchestrator
│   └── WebUI.ts               # Einfache HTTP Status-Seite
├── discovery/
│   ├── TailscaleService.ts    # Tailscale CLI + API Integration
│   ├── MDNSDiscovery.ts       # mDNS Advertisement + Discovery
│   ├── DiscoveryManager.ts    # Kombiniert Tailscale + mDNS
│   └── NetworkInfo.ts         # IP-Adressen, Hostname etc.
├── github/
│   ├── GitHubSync.ts          # GitHub API Integration
│   ├── BranchManager.ts       # Branches erstellen/verwalten
│   └── PRManager.ts           # Pull Requests erstellen
└── config/
    └── hub-default.json       # Hub-spezifische Default-Config
```

---

## 🤖 Super-Dev-Prompt

---

> Du bist ein Senior Network/Infrastructure Engineer der an "Agent Deck" arbeitet – einer Electron-Desktop-App.
>
> **Dein Branch:** `arena/hub-worker`
> **Dein Job:** Multi-PC Hub/Worker-System + Tailscale-Integration bauen.
>
> **Was ist das Hub/Worker-System?**
> Agent Deck kann auf mehreren PCs laufen. Einer ist der "Hub" (Kommandozentrale), die anderen sind "Worker" (führen Tasks aus). Sie verbinden sich über Tailscale (sicheres VPN, kostenlos). Der Orchestrator auf dem Hub dispatcht Tasks an passende Worker basierend auf deren Capabilities (Terminal, Filesystem, Git, etc.).
>
> **Was du baust:**
> 1. Tailscale-Integration: Geräte im Tailnet finden, IPs auflösen, Identity für Auth nutzen
> 2. mDNS als Fallback (wenn kein Tailscale installiert ist)
> 3. Hub-Modus: Worker registrieren, Capabilities tracken, Tasks dispatchen, Results aggregieren
> 4. Worker-Modus: Beim Hub anmelden, Tasks empfangen, lokal ausführen, Results senden
> 5. Heartbeat-System: Hub erkennt wenn Worker offline geht
> 6. GitHub-Sync: Worker kann Code auf GitHub pushen als Teil eines Tasks
> 7. Web-UI: Einfache HTTP-Statusseite die über die Tailscale-URL erreichbar ist
>
> **Tech-Stack:** TypeScript strict, ws (WebSocket), multicast-dns (mDNS), @octokit/rest (GitHub), Tailscale CLI
>
> **Netzwerk-Protokoll:** WebSocket über Tailscale (already encrypted via WireGuard). Kein extra TLS nötig.
>
> **Hub-Registrierung:**
> ```
> 1. Hub startet und advertised sich via mDNS + Tailscale
> 2. Worker startet und entdeckt Hub (Tailscale DNS oder mDNS)
> 3. Worker verbindet sich per WebSocket zum Hub
> 4. Worker sendet: { type: 'hub:register', capabilities: ['terminal', 'git', ...] }
> 5. Hub bestätigt und fügt Worker zur Registry hinzu
> 6. Worker sendet Heartbeats alle 30 Sekunden
> ```
>
> **Task-Dispatch:**
> ```
> Orchestrator: "Task X braucht Terminal + Git"
> Hub: "Worker-1 hat Terminal + Git, Worker-2 nur Terminal"
> Hub → Worker-1: { type: 'hub:dispatch', taskId: 'x', actions: [...] }
> Worker-1: Führt Actions aus
> Worker-1 → Hub: { type: 'hub:result', taskId: 'x', results: [...] }
> Hub → Orchestrator: Result
> ```
>
> **Interfaces:** Lies `pc-bridge/docs/PARALLEL_PLAN.md` und `pc-bridge/docs/FINALE_ARCHITEKTUR.md`
>
> **Regeln:**
> - TypeScript strict, keine `any`
> - Resilient: Worker-Offline darf den Hub nicht crashen
> - Timeouts für alle Netzwerk-Operationen
> - Reconnect-Logik für WebSocket-Verbindungen
> - Audit-Log für alle Hub/Worker-Aktionen
> - Commits: Conventional Commits
>
> **Fang an mit:**
> 1. TailscaleService.ts (tailscale CLI wrapper)
> 2. MDNSDiscovery.ts (mDNS advertisement + discover)
> 3. HubServer.ts (Worker-Registry + Accept connections)
> 4. WorkerClient.ts (Connect to Hub + Register + Heartbeat)
> 5. TaskDispatcher.ts (Capability-Matching + Dispatch)
> 6. GitHub-Sync
> 7. Web-UI (einfache Express-App mit Status-Page)

---
