// SPDX-License-Identifier: MIT
/**
 * Task Repository – CRUD für Orchestrierungs-Tasks.
 *
 * ## Dependency-Graph:
 * depends_on wird als JSON-Array gespeichert.
 * Der Orchestrator prüft vor dem Dispatch ob alle Dependencies "done" sind.
 */

import type BetterSqlite3 from 'better-sqlite3';

export type TaskStatus = 'queued' | 'dispatching' | 'working' | 'reviewing' | 'done' | 'failed' | 'blocked' | 'cancelled';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Task {
  id: string;
  sessionId: string | null;
  blueprintId: string | null;
  title: string;
  description: string;
  agentId: string;
  priority: Priority;
  status: TaskStatus;
  dependsOn: string[];
  timeoutSeconds: number;
  retryCount: number;
  maxRetries: number;
  resultType: string | null;
  resultContent: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export class TaskRepository {
  constructor(private db: BetterSqlite3.Database) {}

  create(task: Omit<Task, 'createdAt' | 'updatedAt'>): Task {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare(`
      INSERT INTO tasks (id, session_id, blueprint_id, title, description, agent_id, priority, status, depends_on, timeout_seconds, retry_count, max_retries, result_type, result_content, error, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      task.id,
      task.sessionId,
      task.blueprintId,
      task.title,
      task.description,
      task.agentId,
      task.priority,
      task.status,
      JSON.stringify(task.dependsOn),
      task.timeoutSeconds,
      task.retryCount,
      task.maxRetries,
      task.resultType,
      task.resultContent,
      task.error,
      now,
      now,
      JSON.stringify(task.metadata)
    );
    return { ...task, createdAt: now, updatedAt: now };
  }

  getById(id: string): Task | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  listByStatus(status: TaskStatus): Task[] {
    const rows = this.db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at ASC').all(status) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  listBySession(sessionId: string): Task[] {
    const rows = this.db.prepare('SELECT * FROM tasks WHERE session_id = ? ORDER BY created_at ASC').all(sessionId) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  listByBlueprint(blueprintId: string): Task[] {
    const rows = this.db.prepare('SELECT * FROM tasks WHERE blueprint_id = ? ORDER BY created_at ASC').all(blueprintId) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  updateStatus(id: string, status: TaskStatus): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
  }

  setResult(id: string, resultType: string, resultContent: string): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare('UPDATE tasks SET status = ?, result_type = ?, result_content = ?, updated_at = ? WHERE id = ?')
      .run('done', resultType, resultContent, now, id);
  }

  setError(id: string, error: string): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare('UPDATE tasks SET status = ?, error = ?, updated_at = ? WHERE id = ?')
      .run('failed', error, now, id);
  }

  incrementRetry(id: string): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare('UPDATE tasks SET retry_count = retry_count + 1, status = ?, updated_at = ? WHERE id = ?')
      .run('queued', now, id);
  }

  /**
   * Prüft ob alle Dependencies eines Tasks "done" sind.
   */
  areDependenciesMet(task: Task): boolean {
    if (task.dependsOn.length === 0) return true;
    const placeholders = task.dependsOn.map(() => '?').join(',');
    const rows = this.db.prepare(
      `SELECT id, status FROM tasks WHERE id IN (${placeholders})`
    ).all(...task.dependsOn) as any[];
    return rows.length === task.dependsOn.length && rows.every((r) => r.status === 'done');
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  }

  private mapRow(row: any): Task {
    return {
      id: row.id,
      sessionId: row.session_id,
      blueprintId: row.blueprint_id,
      title: row.title,
      description: row.description,
      agentId: row.agent_id,
      priority: row.priority,
      status: row.status,
      dependsOn: JSON.parse(row.depends_on || '[]'),
      timeoutSeconds: row.timeout_seconds,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      resultType: row.result_type,
      resultContent: row.result_content,
      error: row.error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }
}
