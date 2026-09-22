// SPDX-License-Identifier: MIT
/**
 * Agent Deck PC-Bridge – Entry Point.
 *
 * Startet:
 * 1. SQLite-Datenbank (Persistenz)
 * 2. MCP-Bus (Kommunikation zwischen Fenstern)
 * 3. WebSocket-Server (Android-App ↔ PC-Bridge)
 *
 * ## Nutzung:
 * ```bash
 * npm run dev     # Development (mit Hot-Reload)
 * npm run build   # TypeScript kompilieren
 * npm start       # Production starten
 * ```
 *
 * ## Konfiguration:
 * Siehe config/default.json für alle Optionen.
 * Überschreibungen in config/local.json (nicht im Git).
 */

import { loadConfig } from './config/Config.js';
import { DatabaseService } from './database/DatabaseService.js';
import { MCPBus } from './mcp/MCPBus.js';
import { createTerminalTools, createFileSystemTools, createGitTools } from './mcp/BuiltinTools.js';
import { TerminalBridge } from './bridge/TerminalBridge.js';
import { FileSystemBridge } from './bridge/FileSystemBridge.js';
import { GitBridge } from './bridge/GitBridge.js';
import { BridgeServer } from './server/WebSocketServer.js';

// ── Logger ──────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger {
  private level: number;

  constructor(level: LogLevel = 'info') {
    this.level = LOG_LEVELS[level];
  }

  debug(msg: string, ...args: unknown[]): void {
    if (this.level <= LOG_LEVELS.debug) this.log('DEBUG', msg, ...args);
  }
  info(msg: string, ...args: unknown[]): void {
    if (this.level <= LOG_LEVELS.info) this.log('INFO', msg, ...args);
  }
  warn(msg: string, ...args: unknown[]): void {
    if (this.level <= LOG_LEVELS.warn) this.log('WARN', msg, ...args);
  }
  error(msg: string, ...args: unknown[]): void {
    if (this.level <= LOG_LEVELS.error) this.log('ERROR', msg, ...args);
  }

  private log(level: string, msg: string, ...args: unknown[]): void {
    const ts = new Date().toISOString();
    const extra = args.length > 0 ? ' ' + args.map((a) => JSON.stringify(a)).join(' ') : '';
    console.log(`[${ts}] ${level} ${msg}${extra}`);
  }
}

// Globaler Logger – wird von allen Modulen importiert
export const logger = new Logger('info');

// ── Main ──────────────────────────────────

async function main(): Promise<void> {
  logger.info('Agent Deck PC-Bridge startet...');

  // 1. Konfiguration laden
  const config = loadConfig();
  logger.info(`Konfiguration geladen (Port: ${config.server.port})`);

  if (!config.security.authToken && config.security.requireAuth) {
    logger.warn('⚠️  Kein Auth-Token konfiguriert! Setze requireAuth=false oder konfiguriere einen Token.');
    logger.warn('   Token setzen in config/local.json: { "security": { "authToken": "dein-geheimnis" } }');
  }

  // 2. Datenbank starten
  const db = new DatabaseService(config);
  db.log('system', 'startup', undefined, 'PC-Bridge gestartet');
  logger.info('✅ SQLite-Datenbank bereit');

  // 3. Bridges initialisieren
  const terminal = new TerminalBridge(config);
  const filesystem = new FileSystemBridge(config);
  const git = new GitBridge(config, terminal);

  // 4. MCP-Bus starten + Built-in Tools registrieren
  const bus = new MCPBus();

  // Pauls MCP-Knoten registrieren (Allrounder mit vollem Zugriff)
  const paulNode = bus.registerNode('paul', 'Paul', 'paul', '🔵');

  // Built-in Tools auf Pauls Knoten registrieren
  for (const tool of createTerminalTools(terminal)) {
    bus.registerTool('paul', tool);
  }
  for (const tool of createFileSystemTools(filesystem)) {
    bus.registerTool('paul', tool);
  }
  for (const tool of createGitTools(git)) {
    bus.registerTool('paul', tool);
  }

  logger.info(`✅ MCP-Bus bereit (${paulNode.tools.size} Tools auf Pauls Knoten)`);
  db.log('system', 'mcp_bus_ready', undefined, `${paulNode.tools.size} Tools registriert`);

  // 5. WebSocket-Server starten (mit DB + Bus)
  const server = new BridgeServer(config, db, bus);
  await server.start();

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Empfangen: ${signal} – fahre herunter...`);
    db.log('system', 'shutdown', undefined, `Signal: ${signal}`);
    await server.stop();
    db.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.info('✅ Bridge bereit. Warte auf Verbindungen...');
}

main().catch((err) => {
  logger.error(`Fataler Fehler: ${err.message}`);
  process.exit(1);
});
