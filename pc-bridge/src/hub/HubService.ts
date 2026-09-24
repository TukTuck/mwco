// SPDX-License-Identifier: MIT
/**
 * Hub Service – zentraler Task-Dispatcher für verteilte Worker.
 *
 * ## Architektur:
 * - Hub läuft auf dem Haupt-PC (dort wo Paul + Orchestrator sind)
 * - Worker können sich über Tailscale-Netzwerk registrieren
 * - Worker advertisen ihre Capabilities (GPU, CPU, Tools)
 * - Hub dispatched Tasks an passende Worker
 *
 * ## Kommunikation:
 * - WebSocket zwischen Hub und Workern
 * - Heartbeat alle 30 Sekunden
 * - Worker-Registrierung mit Capability-Advertisement
 */

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'node:events';
import type { DatabaseService } from '../database/DatabaseService.js';

// ── Typen ──────────────────────────────────

export interface WorkerInfo {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  platform: string;
  capabilities: WorkerCapability[];
  status: 'online' | 'busy' | 'offline';
  lastSeen: number;
  ws: WebSocket;
}

export interface WorkerCapability {
  type: 'gpu' | 'cpu' | 'terminal' | 'filesystem' | 'git' | 'custom';
  name: string;
  details?: Record<string, unknown>;
}

export interface HubTask {
  id: string;
  title: string;
  description: string;
  requiredCapabilities: string[];
  payload: Record<string, unknown>;
  status: 'queued' | 'dispatched' | 'working' | 'done' | 'failed';
  assignedWorkerId?: string;
  result?: unknown;
  error?: string;
  createdAt: number;
}

// ── Hub Service ──────────────────────────────────

export class HubService extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private workers = new Map<string, WorkerInfo>();
  private tasks = new Map<string, HubTask>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private port: number = 8766,
    private db?: DatabaseService
  ) {
    super();
  }

  /**
   * Startet den Hub-Server.
   */
  async start(): Promise<void> {
    this.wss = new WebSocketServer({ port: this.port, host: '0.0.0.0' });

    this.wss.on('connection', (ws, req) => {
      const ip = req.socket.remoteAddress ?? 'unknown';
      this.handleWorkerConnection(ws, ip);
    });

    // Heartbeat: Alle 30 Sekunden prüfen ob Worker noch da sind
    this.heartbeatInterval = setInterval(() => this.checkHeartbeat(), 30000);

    this.db?.log('hub', 'started', undefined, `Hub auf Port ${this.port}`);
    this.emit('started');
  }

  /**
   * Stoppt den Hub-Server.
   */
  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const worker of this.workers.values()) {
      worker.ws.close(1001, 'Hub shutting down');
    }
    this.workers.clear();

    return new Promise((resolve) => {
      this.wss?.close(() => {
        this.db?.log('hub', 'stopped');
        resolve();
      });
    });
  }

  /**
   * Fügt einen Task zur Queue hinzu.
   */
  submitTask(task: Omit<HubTask, 'status' | 'createdAt'>): HubTask {
    const fullTask: HubTask = {
      ...task,
      status: 'queued',
      createdAt: Date.now(),
    };

    this.tasks.set(task.id, fullTask);
    this.db?.log('hub', 'task_submitted', task.id, task.title);
    this.emit('task:submitted', fullTask);

    // Sofort versuchen zu dispatchen
    this.tryDispatch();

    return fullTask;
  }

  /**
   * Gibt alle registrierten Worker zurück.
   */
  getWorkers(): WorkerInfo[] {
    return [...this.workers.values()].map((w) => ({
      ...w,
      ws: undefined as any, // WebSocket nicht serialisieren
    }));
  }

  /**
   * Gibt alle Tasks zurück.
   */
  getTasks(): HubTask[] {
    return [...this.tasks.values()];
  }

  // ── Private ──────────────────────────────────

  private handleWorkerConnection(ws: WebSocket, ip: string): void {
    let workerId: string | null = null;

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case 'register':
            workerId = this.registerWorker(msg, ws, ip);
            break;

          case 'heartbeat':
            if (workerId) {
              const worker = this.workers.get(workerId);
              if (worker) worker.lastSeen = Date.now();
            }
            break;

          case 'task_result':
            this.handleTaskResult(msg);
            break;

          case 'task_error':
            this.handleTaskError(msg);
            break;
        }
      } catch (err) {
        this.db?.log('hub', 'message_error', undefined, (err as Error).message, 'error');
      }
    });

    ws.on('close', () => {
      if (workerId) {
        const worker = this.workers.get(workerId);
        if (worker) {
          worker.status = 'offline';
          this.emit('worker:offline', worker);
          this.db?.log('hub', 'worker_offline', workerId, worker.name);
        }
      }
    });
  }

  private registerWorker(msg: any, ws: WebSocket, ip: string): string {
    const worker: WorkerInfo = {
      id: msg.workerId,
      name: msg.name ?? msg.workerId,
      hostname: msg.hostname ?? 'unknown',
      ip,
      platform: msg.platform ?? 'unknown',
      capabilities: msg.capabilities ?? [],
      status: 'online',
      lastSeen: Date.now(),
      ws,
    };

    this.workers.set(worker.id, worker);

    // Bestätigung senden
    ws.send(JSON.stringify({
      type: 'registered',
      workerId: worker.id,
    }));

    this.db?.log('hub', 'worker_registered', worker.id, `${worker.name} (${worker.capabilities.length} Caps)`);
    this.emit('worker:online', worker);

    // Queue prüfen – vielleicht warten Tasks auf diesen Worker
    this.tryDispatch();

    return worker.id;
  }

  /**
   * Versucht, queued Tasks an passende Worker zu dispatchen.
   */
  private tryDispatch(): void {
    const queuedTasks = [...this.tasks.values()].filter((t) => t.status === 'queued');
    const availableWorkers = [...this.workers.values()].filter((w) => w.status === 'online');

    for (const task of queuedTasks) {
      // Passenden Worker finden
      const worker = availableWorkers.find((w) =>
        task.requiredCapabilities.every((cap) =>
          w.capabilities.some((wc) => wc.type === cap || wc.name === cap)
        )
      );

      if (worker) {
        // Task dispatchen
        task.status = 'dispatched';
        task.assignedWorkerId = worker.id;
        worker.status = 'busy';

        worker.ws.send(JSON.stringify({
          type: 'task',
          taskId: task.id,
          title: task.title,
          description: task.description,
          payload: task.payload,
        }));

        task.status = 'working';
        this.emit('task:dispatched', task, worker);
        this.db?.log('hub', 'task_dispatched', task.id, `→ ${worker.name}`);
      }
    }
  }

  private handleTaskResult(msg: any): void {
    const task = this.tasks.get(msg.taskId);
    if (!task) return;

    task.status = 'done';
    task.result = msg.result;

    // Worker wieder frei geben
    if (task.assignedWorkerId) {
      const worker = this.workers.get(task.assignedWorkerId);
      if (worker) worker.status = 'online';
    }

    this.emit('task:done', task);
    this.db?.log('hub', 'task_done', task.id, task.title);

    // Nächstes Task dispatchen
    this.tryDispatch();
  }

  private handleTaskError(msg: any): void {
    const task = this.tasks.get(msg.taskId);
    if (!task) return;

    task.status = 'failed';
    task.error = msg.error;

    if (task.assignedWorkerId) {
      const worker = this.workers.get(task.assignedWorkerId);
      if (worker) worker.status = 'online';
    }

    this.emit('task:failed', task);
    this.db?.log('hub', 'task_failed', task.id, msg.error, 'error');
    this.tryDispatch();
  }

  private checkHeartbeat(): void {
    const now = Date.now();
    const timeout = 90000; // 90 Sekunden ohne Heartbeat → offline

    for (const [id, worker] of this.workers) {
      if (worker.status !== 'offline' && now - worker.lastSeen > timeout) {
        worker.status = 'offline';
        this.emit('worker:timeout', worker);
        this.db?.log('hub', 'worker_timeout', id, worker.name, 'warn');

        // Tasks die diesem Worker zugewiesen waren zurück in die Queue
        for (const task of this.tasks.values()) {
          if (task.assignedWorkerId === id && task.status === 'working') {
            task.status = 'queued';
            task.assignedWorkerId = undefined;
          }
        }
      }
    }
  }
}
