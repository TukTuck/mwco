// SPDX-License-Identifier: MIT
/**
 * Audit Repository – Lese-Zugriff auf das Audit-Log.
 *
 * Schreiben läuft über Database.audit() – das ist schneller (kein Mapping nötig).
 * Hier: Filtern, Paginieren, Exportieren.
 */

import type BetterSqlite3 from 'better-sqlite3';

export interface AuditEntry {
  id: number;
  timestamp: number;
  actor: string;
  action: string;
  target: string | null;
  details: string | null;
  level: 'debug' | 'info' | 'warn' | 'error';
  metadata: Record<string, unknown>;
}

export interface AuditFilter {
  actor?: string;
  action?: string;
  level?: string;
  since?: number;
  until?: number;
  limit?: number;
  offset?: number;
}

export class AuditRepository {
  constructor(private db: BetterSqlite3.Database) {}

  query(filter: AuditFilter = {}): AuditEntry[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.actor) {
      conditions.push('actor = ?');
      params.push(filter.actor);
    }
    if (filter.action) {
      conditions.push('action = ?');
      params.push(filter.action);
    }
    if (filter.level) {
      conditions.push('level = ?');
      params.push(filter.level);
    }
    if (filter.since) {
      conditions.push('timestamp >= ?');
      params.push(filter.since);
    }
    if (filter.until) {
      conditions.push('timestamp <= ?');
      params.push(filter.until);
    }

    let sql = 'SELECT * FROM audit_log';
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY timestamp DESC';
    sql += ` LIMIT ${filter.limit ?? 100}`;
    if (filter.offset) {
      sql += ` OFFSET ${filter.offset}`;
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  count(filter: AuditFilter = {}): number {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.actor) { conditions.push('actor = ?'); params.push(filter.actor); }
    if (filter.action) { conditions.push('action = ?'); params.push(filter.action); }
    if (filter.level) { conditions.push('level = ?'); params.push(filter.level); }
    if (filter.since) { conditions.push('timestamp >= ?'); params.push(filter.since); }
    if (filter.until) { conditions.push('timestamp <= ?'); params.push(filter.until); }

    let sql = 'SELECT COUNT(*) as count FROM audit_log';
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const row = this.db.prepare(sql).get(...params) as any;
    return row.count;
  }

  /**
   * Exportiert das gesamte Audit-Log als JSON-Array (für Backup/Export).
   */
  exportAll(): AuditEntry[] {
    const rows = this.db.prepare('SELECT * FROM audit_log ORDER BY timestamp ASC').all() as any[];
    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Löscht alte Einträge (default: älter als 30 Tage).
   */
  prune(olderThanSeconds: number = 30 * 24 * 3600): number {
    const cutoff = Math.floor(Date.now() / 1000) - olderThanSeconds;
    const result = this.db.prepare('DELETE FROM audit_log WHERE timestamp < ?').run(cutoff);
    return result.changes;
  }

  private mapRow(row: any): AuditEntry {
    return {
      id: row.id,
      timestamp: row.timestamp,
      actor: row.actor,
      action: row.action,
      target: row.target,
      details: row.details,
      level: row.level,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }
}
