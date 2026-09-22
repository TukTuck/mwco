// SPDX-License-Identifier: MIT
/**
 * Message Repository – CRUD für Chat-Nachrichten.
 *
 * Speichert auch "thinking" (LLM-Reasoning) und Token-Statistiken.
 * Das ist wichtig für das Logging – der User will sehen WAS das LLM gedacht hat.
 */

import type BetterSqlite3 from 'better-sqlite3';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  thinking: string | null;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  createdAt: number;
  metadata: Record<string, unknown>;
}

export class MessageRepository {
  constructor(private db: BetterSqlite3.Database) {}

  create(msg: Omit<Message, 'createdAt'>): Message {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare(`
      INSERT INTO messages (id, session_id, role, content, thinking, tokens_in, tokens_out, duration_ms, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      msg.id,
      msg.sessionId,
      msg.role,
      msg.content,
      msg.thinking,
      msg.tokensIn,
      msg.tokensOut,
      msg.durationMs,
      now,
      JSON.stringify(msg.metadata)
    );
    return { ...msg, createdAt: now };
  }

  getBySession(sessionId: string, limit: number = 100): Message[] {
    const rows = this.db.prepare(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?'
    ).all(sessionId, limit) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  getRecent(sessionId: string, limit: number = 20): Message[] {
    const rows = this.db.prepare(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(sessionId, limit) as any[];
    return rows.reverse().map((r) => this.mapRow(r));
  }

  getById(id: string): Message | null {
    const row = this.db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  deleteBySession(sessionId: string): void {
    this.db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);
  }

  private mapRow(row: any): Message {
    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      thinking: row.thinking,
      tokensIn: row.tokens_in,
      tokensOut: row.tokens_out,
      durationMs: row.duration_ms,
      createdAt: row.created_at,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }
}
