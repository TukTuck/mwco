/**
 * WebSocket-Server – Kern der PC-Bridge.
 *
 * ## Architektur:
 * - Akzeptiert Verbindungen von der Android-App
 * - Authentifiziert über Shared-Token
 * - Delegiert Tasks an den MessageHandler
 * - Heartbeat via Ping/Pong
 *
 * ## Warum ws (nicht socket.io)?
 * - ws ist leichtgewichtiger (~100KB vs ~500KB)
 * - Die Android-App nutzt Ktor WebSocket (Standard-Protokoll, kein socket.io)
 * - Kein Fallback auf HTTP-Long-Polling nötig (beide Seiten sind modern)
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { BridgeConfig } from '../config/Config.js';
import type { BridgeMessage, AuthMessage } from './Protocol.js';
import { MessageHandler } from './MessageHandler.js';
import { logger } from '../index.js';

export class BridgeServer {
  private wss: WebSocketServer | null = null;
  private handler: MessageHandler;
  private connections = new Set<WebSocket>();

  constructor(private config: BridgeConfig) {
    this.handler = new MessageHandler(config);
  }

  async start(): Promise<void> {
    this.wss = new WebSocketServer({
      port: this.config.server.port,
      host: this.config.server.host,
    });

    this.wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress ?? 'unknown';
      logger.info(`Neue Verbindung von ${clientIp}`);

      if (this.connections.size >= this.config.server.maxConnections) {
        logger.warn(`Max Connections erreicht, lehne ${clientIp} ab`);
        ws.close(1013, 'Max connections reached');
        return;
      }

      this.connections.add(ws);
      this.setupConnection(ws, clientIp);
    });

    this.wss.on('error', (err) => {
      logger.error(`WebSocket Server Error: ${err.message}`);
    });

    // Heartbeat: Alle 30 Sekunden Ping senden
    setInterval(() => this.heartbeat(), 30000);

    logger.info(
      `Bridge Server läuft auf ws://${this.config.server.host}:${this.config.server.port}`
    );
  }

  private setupConnection(ws: WebSocket, clientIp: string): void {
    let authenticated = false;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as BridgeMessage;

        // Auth-Check: Erste Nachricht MUSS auth sein
        if (!authenticated) {
          if (message.type === 'auth') {
            authenticated = this.handleAuth(ws, message as AuthMessage, clientIp);
          } else {
            this.send(ws, {
              type: 'error',
              task_id: '',
              payload: { error: 'Nicht authentifiziert. Sende erst auth.' },
            });
            ws.close(1008, 'Not authenticated');
          }
          return;
        }

        // Authentifizierte Nachrichten verarbeiten
        await this.handler.handleMessage(ws, message);
      } catch (err) {
        logger.error(`Nachrichten-Fehler: ${(err as Error).message}`);
        this.send(ws, {
          type: 'error',
          task_id: '',
          payload: { error: `Invalid message: ${(err as Error).message}` },
        });
      }
    });

    ws.on('close', () => {
      this.connections.delete(ws);
      logger.info(`Verbindung geschlossen: ${clientIp}`);
    });

    ws.on('error', (err) => {
      logger.error(`WebSocket-Fehler (${clientIp}): ${err.message}`);
      this.connections.delete(ws);
    });
  }

  private handleAuth(ws: WebSocket, message: AuthMessage, clientIp: string): boolean {
    if (!this.config.security.requireAuth) {
      // Auth deaktiviert – immer ok
      this.sendAuthOk(ws);
      logger.info(`Client authentifiziert (Auth deaktiviert): ${clientIp}`);
      return true;
    }

    if (message.payload.token === this.config.security.authToken) {
      this.sendAuthOk(ws);
      logger.info(`Client authentifiziert: ${clientIp}`);
      return true;
    }

    this.send(ws, {
      type: 'auth_failed',
      task_id: '',
      payload: { error: 'Ungültiger Token' },
    });
    logger.warn(`Auth fehlgeschlagen: ${clientIp}`);
    ws.close(1008, 'Auth failed');
    return false;
  }

  private sendAuthOk(ws: WebSocket): void {
    this.send(ws, {
      type: 'auth_ok',
      task_id: '',
      payload: {
        bridge_version: '0.1.0',
        platform: process.platform,
        hostname: require('os').hostname(),
        capabilities: ['terminal', 'filesystem', 'git', 'code_exec'],
      },
    });
  }

  send(ws: WebSocket, message: BridgeMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private heartbeat(): void {
    for (const ws of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        this.connections.delete(ws);
      }
    }
  }

  async stop(): Promise<void> {
    for (const ws of this.connections) {
      ws.close(1001, 'Server shutting down');
    }
    this.connections.clear();

    return new Promise((resolve) => {
      this.wss?.close(() => {
        logger.info('Bridge Server gestoppt');
        resolve();
      });
    });
  }
}
