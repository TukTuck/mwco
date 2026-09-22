// SPDX-License-Identifier: MIT
/**
 * Worker Client – verbindet sich mit dem Hub und führt Tasks aus.
 *
 * ## Nutzung:
 * Ein Worker läuft auf einem entfernten PC (z.B. mit GPU).
 * Er verbindet sich über Tailscale mit dem Hub und advertiset seine Capabilities.
 *
 * ## Beispiel:
 * ```typescript
 * const worker = new WorkerClient({
 *   hubUrl: 'ws://100.x.y.z:8766',
 *   name: 'GPU-Worker',
 *   capabilities: [
 *     { type: 'gpu', name: 'nvidia-rtx-4090', details: { vram: '24GB' } },
 *     { type: 'terminal', name: 'shell' },
 *   ],
 * });
 * worker.start();
 * ```
 */

import WebSocket from 'ws';
import { EventEmitter } from 'node:events';
import os from 'node:os';
import { v4 as uuid } from 'uuid';

export interface WorkerClientConfig {
  hubUrl: string;
  name: string;
  capabilities: Array<{
    type: string;
    name: string;
    details?: Record<string, unknown>;
  }>;
  reconnectInterval?: number;
}

export class WorkerClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WorkerClientConfig;
  private workerId: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config: WorkerClientConfig) {
    super();
    this.config = config;
    this.workerId = `worker-${uuid().slice(0, 8)}`;
  }

  /**
   * Startet den Worker und verbindet sich mit dem Hub.
   */
  async start(): Promise<void> {
    this.isRunning = true;
    this.connect();
  }

  /**
   * Stoppt den Worker.
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close(1000, 'Worker stopping');
    }
  }

  // ── Private ──────────────────────────────────

  private connect(): void {
    if (!this.isRunning) return;

    try {
      this.ws = new WebSocket(this.config.hubUrl);

      this.ws.on('open', () => {
        // Registrierung senden
        this.ws!.send(JSON.stringify({
          type: 'register',
          workerId: this.workerId,
          name: this.config.name,
          hostname: os.hostname(),
          platform: process.platform,
          capabilities: this.config.capabilities,
        }));

        this.emit('connected');

        // Heartbeat starten
        this.heartbeatInterval = setInterval(() => {
          this.ws?.send(JSON.stringify({ type: 'heartbeat' }));
        }, 30000);
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(msg);
        } catch (err) {
          this.emit('error', err);
        }
      });

      this.ws.on('close', () => {
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
        }
        this.emit('disconnected');

        // Auto-Reconnect
        if (this.isRunning) {
          const delay = this.config.reconnectInterval ?? 5000;
          this.reconnectTimeout = setTimeout(() => this.connect(), delay);
        }
      });

      this.ws.on('error', (err) => {
        this.emit('error', err);
      });
    } catch (err) {
      this.emit('error', err);
      if (this.isRunning) {
        this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
      }
    }
  }

  private async handleMessage(msg: any): Promise<void> {
    switch (msg.type) {
      case 'registered':
        this.emit('registered', msg.workerId);
        break;

      case 'task':
        await this.executeTask(msg);
        break;
    }
  }

  private async executeTask(msg: any): Promise<void> {
    this.emit('task:start', msg);

    try {
      // Task an Handler delegieren (User-definiert)
      const result = await new Promise((resolve, reject) => {
        this.emit('task:execute', msg, resolve, reject);
      });

      // Ergebnis an Hub senden
      this.ws?.send(JSON.stringify({
        type: 'task_result',
        taskId: msg.taskId,
        result,
      }));

      this.emit('task:done', msg.taskId);
    } catch (err) {
      // Fehler an Hub senden
      this.ws?.send(JSON.stringify({
        type: 'task_error',
        taskId: msg.taskId,
        error: (err as Error).message,
      }));

      this.emit('task:error', msg.taskId, err);
    }
  }
}
