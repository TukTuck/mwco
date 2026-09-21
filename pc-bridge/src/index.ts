/**
 * Agent Deck PC-Bridge – Entry Point.
 *
 * Startet den WebSocket-Server und optional mDNS-Discovery.
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

  const config = loadConfig();
  logger.info(`Konfiguration geladen (Port: ${config.server.port})`);

  if (!config.security.authToken && config.security.requireAuth) {
    logger.warn('⚠️  Kein Auth-Token konfiguriert! Setze requireAuth=false oder konfiguriere einen Token.');
    logger.warn('   Token setzen in config/local.json: { "security": { "authToken": "dein-geheimnis" } }');
  }

  const server = new BridgeServer(config);
  await server.start();

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Empfangen: ${signal} – fahre herunter...`);
    await server.stop();
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
