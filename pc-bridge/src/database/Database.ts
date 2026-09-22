// SPDX-License-Identifier: MIT
/**
 * SQLite-Datenbank – Persistenz-Schicht für Agent Deck.
 *
 * ## Design-Entscheidungen:
 * - better-sqlite3 (synchron, kein async overhead, schnell)
 * - WAL-Mode für parallele Lesezugriffe
 * - metadata TEXT DEFAULT '{}' überall → erweiterbar ohne Migration
 * - Prepared Statements für Performance
 *
 * ## Tabellen:
 * - sessions: Chat-/Arbeits-Sessions
 * - messages: Nachrichten innerhalb von Sessions
 * - tasks: Orchestrierungs-Tasks (mit Dependency-Graph)
 * - blueprints: Gespeicherte Pläne
 * - agents: Registrierte Agenten + Konfiguration
 * - audit_log: Vollständiges Audit-Log aller Aktionen
 * - layouts: Gespeicherte Fenster-Layouts
 * - plugins: Installierte Plugins
 * - brain: Wissensspeicher (optional mit Vektor-Embeddings)
 */

import BetterSqlite3 from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export class Database {
  private db: BetterSqlite3.Database;

  constructor(dbPath: string, walMode: boolean = true) {
    // Verzeichnis erstellen falls nicht vorhanden
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new BetterSqlite3(dbPath);

    // Performance-Optimierungen
    this.db.pragma('journal_mode = ' + (walMode ? 'WAL' : 'DELETE'));
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('cache_size = -64000'); // 64MB Cache

    this.createSchema();
  }

  /**
   * Erstellt alle Tabellen falls sie nicht existieren.
   * migrationsfähig durch IF NOT EXISTS.
   */
  private createSchema(): void {
    this.db.exec(`
      -- ── Sessions ──────────────────────────
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        status TEXT NOT NULL DEFAULT 'active',
        metadata TEXT NOT NULL DEFAULT '{}'
      );

      -- ── Messages ──────────────────────────
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
        content TEXT NOT NULL,
        thinking TEXT,
        tokens_in INTEGER DEFAULT 0,
        tokens_out INTEGER DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        metadata TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);

      -- ── Tasks ──────────────────────────
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
        blueprint_id TEXT REFERENCES blueprints(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        agent_id TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'dispatching', 'working', 'reviewing', 'done', 'failed', 'blocked', 'cancelled')),
        depends_on TEXT NOT NULL DEFAULT '[]',
        timeout_seconds INTEGER NOT NULL DEFAULT 300,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        result_type TEXT,
        result_content TEXT,
        error TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        metadata TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id);

      -- ── Blueprints ──────────────────────────
      CREATE TABLE IF NOT EXISTS blueprints (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        metadata TEXT NOT NULL DEFAULT '{}'
      );

      -- ── Agents ──────────────────────────
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        capabilities TEXT NOT NULL DEFAULT '[]',
        best_for TEXT NOT NULL DEFAULT '[]',
        config TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'offline',
        last_seen INTEGER,
        metadata TEXT NOT NULL DEFAULT '{}'
      );

      -- ── Audit Log ──────────────────────────
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT,
        details TEXT,
        level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
        metadata TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor);
      CREATE INDEX IF NOT EXISTS idx_audit_level ON audit_log(level);

      -- ── Layouts ──────────────────────────
      CREATE TABLE IF NOT EXISTS layouts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        config TEXT NOT NULL DEFAULT '{}',
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        metadata TEXT NOT NULL DEFAULT '{}'
      );

      -- ── Plugins ──────────────────────────
      CREATE TABLE IF NOT EXISTS plugins (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        version TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        config TEXT NOT NULL DEFAULT '{}',
        installed_at INTEGER NOT NULL DEFAULT (unixepoch()),
        metadata TEXT NOT NULL DEFAULT '{}'
      );

      -- ── Brain (Wissensspeicher) ──────────────────────────
      CREATE TABLE IF NOT EXISTS brain (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        embedding BLOB,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        metadata TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_brain_key ON brain(key);
    `);
  }

  /**
   * Gibt die rohe Datenbank-Instanz zurück (für Repositories).
   */
  get raw(): BetterSqlite3.Database {
    return this.db;
  }

  /**
   * Führt eine Transaktion aus.
   */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  /**
   * Audit-Log-Eintrag schreiben.
   */
  audit(actor: string, action: string, target?: string, details?: string, level: string = 'info'): void {
    this.db.prepare(`
      INSERT INTO audit_log (actor, action, target, details, level)
      VALUES (?, ?, ?, ?, ?)
    `).run(actor, action, target ?? null, details ?? null, level);
  }

  /**
   * Datenbank sauber schließen.
   */
  close(): void {
    this.db.close();
  }
}
