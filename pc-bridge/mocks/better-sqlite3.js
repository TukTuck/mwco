// SPDX-License-Identifier: MIT
// Mock für better-sqlite3 – nutzt Node 22 experimental node:sqlite (DatabaseSync)
// Erfüllt Paket 1 Build grün: Tests laufen ohne native Bindings.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');
import fs from 'node:fs';

class MockStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.stmt = null;
    try {
      this.stmt = db._raw.prepare(sql);
    } catch (e) {
      // Für PRAGMA etc. kann prepare fehlschlagen – dann als exec behandeln
      this.stmt = null;
      this.isExec = true;
    }
  }
  run(...params) {
    if (this.stmt) {
      try {
        return this.stmt.run(...params);
      } catch (e) {
        // Fallback für INSERT etc.
        throw e;
      }
    }
    // Für Statements die nicht preparable sind
    this.db._raw.exec(this.sql);
    return { changes: 0, lastInsertRowid: 0 };
  }
  get(...params) {
    if (this.stmt) return this.stmt.get(...params);
    return undefined;
  }
  all(...params) {
    if (this.stmt) return this.stmt.all(...params);
    return [];
  }
  iterate(...params) {
    if (this.stmt) {
      const rows = this.stmt.all(...params);
      return rows[Symbol.iterator]();
    }
    return [][Symbol.iterator]();
  }
}

class MockDatabase {
  constructor(path) {
    // :memory: für Tests, sonst Datei
    this.path = path;
    // DatabaseSync nutzt Datei-Pfad direkt
    this._raw = new DatabaseSync(path);
    // Für Kompatibilität: better-sqlite3 hat .pragma, .exec, .prepare, .transaction, .close, .backup
  }
  pragma(sql) {
    try {
      // Pragma als exec, z.B. "journal_mode = WAL"
      // Node sqlite unterstützt PRAGMA via exec
      if (sql.includes('=')) {
        this._raw.exec(`PRAGMA ${sql}`);
        return;
      } else {
        const stmt = this._raw.prepare(`PRAGMA ${sql}`);
        const row = stmt.get();
        return row ? Object.values(row)[0] : undefined;
      }
    } catch (e) {
      return undefined;
    }
  }
  exec(sql) {
    this._raw.exec(sql);
  }
  prepare(sql) {
    return new MockStatement(this, sql);
  }
  transaction(fn) {
    // Echte Transaktion wäre via BEGIN/COMMIT, hier simple Wrapper
    return (...args) => {
      try {
        this._raw.exec('BEGIN');
        const result = fn(...args);
        this._raw.exec('COMMIT');
        return result;
      } catch (e) {
        try { this._raw.exec('ROLLBACK'); } catch {}
        throw e;
      }
    };
  }
  close() {
    try { this._raw.close(); } catch {}
  }
  backup() { return Promise.resolve(); }
}

// Export als default (ESM) und CommonJS
export default MockDatabase;
export { MockDatabase };
