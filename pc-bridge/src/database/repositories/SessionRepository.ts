// SPDX-License-Identifier: MIT
/**
 * Session Repository – CRUD für Chat-/Arbeits-Sessions.
 */

import type BetterSqlite3 from 'better-sqlite3';

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'archived' | 'closed';
  metadata: Record<string, unknown>;
}

export class SessionRepository {
  constructor(private db: BetterSqlite3.Database) {}

  create(session: Omit<Session, 'createdAt' | 'updatedAt'>): Session {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare(`
      INSERT INTO sessions (id, title, created_at, updated_at, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.title,
      now,
      now,
      session.status,
      JSON.stringify(session.metadata)
    );
    return { ...session, createdAt: now, updatedAt: now };
  }

  getById(id: string): Session | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  list(status?: string): Session[] {
    if (status) {
      const rows = this.db.prepare('SELECT * FROM sessions WHERE status = ? ORDER BY updated_at DESC').all(status) as any[];
      return rows.map((r) => this.mapRow(r));
    }
    const rows = this.db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC').all() as any[];
    return rows.map((r) => this.mapRow(r));
  }

  updateTitle(id: string, title: string): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare('UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?').run(title, now, id);
  }

  updateStatus(id: string, status: string): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare('UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }

  private mapRow(row: any): Session {
    return {
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }
}
