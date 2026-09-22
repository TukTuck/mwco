// SPDX-License-Identifier: MIT
/**
 * Blueprint Repository – CRUD für gespeicherte Pläne.
 */

import type BetterSqlite3 from 'better-sqlite3';

export interface Blueprint {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export class BlueprintRepository {
  constructor(private db: BetterSqlite3.Database) {}

  create(bp: Omit<Blueprint, 'createdAt' | 'updatedAt'>): Blueprint {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare(`
      INSERT INTO blueprints (id, name, content, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(bp.id, bp.name, bp.content, now, now, JSON.stringify(bp.metadata));
    return { ...bp, createdAt: now, updatedAt: now };
  }

  getById(id: string): Blueprint | null {
    const row = this.db.prepare('SELECT * FROM blueprints WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  list(): Blueprint[] {
    const rows = this.db.prepare('SELECT * FROM blueprints ORDER BY updated_at DESC').all() as any[];
    return rows.map((r) => this.mapRow(r));
  }

  update(id: string, name: string, content: string): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare('UPDATE blueprints SET name = ?, content = ?, updated_at = ? WHERE id = ?')
      .run(name, content, now, id);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM blueprints WHERE id = ?').run(id);
  }

  private mapRow(row: any): Blueprint {
    return {
      id: row.id,
      name: row.name,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }
}
