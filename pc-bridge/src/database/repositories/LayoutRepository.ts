// SPDX-License-Identifier: MIT
/**
 * Layout Repository – CRUD für gespeicherte Fenster-Layouts.
 *
 * Layouts speichern Position, Größe, Farbe und Status jedes Fensters im Grid.
 */

import type BetterSqlite3 from 'better-sqlite3';

export interface Layout {
  id: string;
  name: string;
  config: Record<string, unknown>;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export class LayoutRepository {
  constructor(private db: BetterSqlite3.Database) {}

  create(layout: Omit<Layout, 'createdAt' | 'updatedAt'>): Layout {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare(`
      INSERT INTO layouts (id, name, config, is_default, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      layout.id,
      layout.name,
      JSON.stringify(layout.config),
      layout.isDefault ? 1 : 0,
      now,
      now,
      JSON.stringify(layout.metadata)
    );
    return { ...layout, createdAt: now, updatedAt: now };
  }

  getById(id: string): Layout | null {
    const row = this.db.prepare('SELECT * FROM layouts WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  getByName(name: string): Layout | null {
    const row = this.db.prepare('SELECT * FROM layouts WHERE name = ?').get(name) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  list(): Layout[] {
    const rows = this.db.prepare('SELECT * FROM layouts ORDER BY name ASC').all() as any[];
    return rows.map((r) => this.mapRow(r));
  }

  getDefault(): Layout | null {
    const row = this.db.prepare('SELECT * FROM layouts WHERE is_default = 1 LIMIT 1').get() as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  update(id: string, name: string, config: Record<string, unknown>): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare('UPDATE layouts SET name = ?, config = ?, updated_at = ? WHERE id = ?')
      .run(name, JSON.stringify(config), now, id);
  }

  setDefault(id: string): void {
    this.db.transaction(() => {
      this.db.prepare('UPDATE layouts SET is_default = 0').run();
      this.db.prepare('UPDATE layouts SET is_default = 1 WHERE id = ?').run(id);
    })();
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM layouts WHERE id = ?').run(id);
  }

  private mapRow(row: any): Layout {
    return {
      id: row.id,
      name: row.name,
      config: JSON.parse(row.config || '{}'),
      isDefault: row.is_default === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }
}
