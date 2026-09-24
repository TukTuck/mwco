// SPDX-License-Identifier: MIT
/**
 * Tests für die SQLite-Datenbank und Repositories.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../../src/database/Database.js';
import { SessionRepository } from '../../src/database/repositories/SessionRepository.js';
import { TaskRepository } from '../../src/database/repositories/TaskRepository.js';
import { MessageRepository } from '../../src/database/repositories/MessageRepository.js';
import { AuditRepository } from '../../src/database/repositories/AuditRepository.js';
import { BlueprintRepository } from '../../src/database/repositories/BlueprintRepository.js';
import { LayoutRepository } from '../../src/database/repositories/LayoutRepository.js';
import fs from 'node:fs';
import path from 'node:path';

const TEST_DB_PATH = '/tmp/agentdeck-test.db';

describe('Database', () => {
  let db: Database;

  beforeEach(() => {
    // Test-Datenbank erstellen
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    db = new Database(TEST_DB_PATH, false);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('erstellt alle Tabellen', () => {
    const tables = db.raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as any[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('sessions');
    expect(tableNames).toContain('messages');
    expect(tableNames).toContain('tasks');
    expect(tableNames).toContain('blueprints');
    expect(tableNames).toContain('agents');
    expect(tableNames).toContain('audit_log');
    expect(tableNames).toContain('layouts');
    expect(tableNames).toContain('plugins');
    expect(tableNames).toContain('brain');
  });

  it('schreibt Audit-Logs', () => {
    db.audit('test', 'action', 'target', 'details', 'info');
    const rows = db.raw.prepare('SELECT * FROM audit_log').all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].actor).toBe('test');
    expect(rows[0].action).toBe('action');
  });
});

describe('SessionRepository', () => {
  let db: Database;
  let repo: SessionRepository;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    db = new Database(TEST_DB_PATH, false);
    repo = new SessionRepository(db.raw);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it('erstellt und liest Sessions', () => {
    const session = repo.create({
      id: 'sess-1',
      title: 'Test Session',
      status: 'active',
      metadata: {},
    });

    expect(session.id).toBe('sess-1');
    expect(session.createdAt).toBeDefined();

    const found = repo.getById('sess-1');
    expect(found).not.toBeNull();
    expect(found!.title).toBe('Test Session');
    expect(found!.status).toBe('active');
  });

  it('listet Sessions nach Status', () => {
    repo.create({ id: 's1', title: 'A', status: 'active', metadata: {} });
    repo.create({ id: 's2', title: 'B', status: 'archived', metadata: {} });
    repo.create({ id: 's3', title: 'C', status: 'active', metadata: {} });

    const active = repo.list('active');
    expect(active).toHaveLength(2);

    const all = repo.list();
    expect(all).toHaveLength(3);
  });
});

describe('TaskRepository', () => {
  let db: Database;
  let repo: TaskRepository;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    db = new Database(TEST_DB_PATH, false);
    repo = new TaskRepository(db.raw);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it('erstellt und liest Tasks', () => {
    const task = repo.create({
      id: 'task-1',
      sessionId: null,
      blueprintId: null,
      title: 'Test Task',
      description: 'Beschreibung',
      agentId: 'agent-1',
      priority: 'HIGH',
      status: 'queued',
      dependsOn: [],
      timeoutSeconds: 300,
      retryCount: 0,
      maxRetries: 3,
      resultType: null,
      resultContent: null,
      error: null,
      metadata: {},
    });

    expect(task.id).toBe('task-1');
    const found = repo.getById('task-1');
    expect(found!.priority).toBe('HIGH');
  });

  it('prüft Dependencies', () => {
    repo.create({
      id: 'dep-1', sessionId: null, blueprintId: null, title: 'Dep 1',
      description: '', agentId: 'a', priority: 'MEDIUM', status: 'done',
      dependsOn: [], timeoutSeconds: 300, retryCount: 0, maxRetries: 3,
      resultType: null, resultContent: null, error: null, metadata: {},
    });
    repo.create({
      id: 'dep-2', sessionId: null, blueprintId: null, title: 'Dep 2',
      description: '', agentId: 'a', priority: 'MEDIUM', status: 'working',
      dependsOn: [], timeoutSeconds: 300, retryCount: 0, maxRetries: 3,
      resultType: null, resultContent: null, error: null, metadata: {},
    });

    const task = repo.create({
      id: 'main', sessionId: null, blueprintId: null, title: 'Main',
      description: '', agentId: 'a', priority: 'MEDIUM', status: 'queued',
      dependsOn: ['dep-1', 'dep-2'], timeoutSeconds: 300, retryCount: 0, maxRetries: 3,
      resultType: null, resultContent: null, error: null, metadata: {},
    });

    expect(repo.areDependenciesMet(task)).toBe(false);

    repo.updateStatus('dep-2', 'done');
    const updated = repo.getById('main')!;
    expect(repo.areDependenciesMet(updated)).toBe(true);
  });

  it('listet Tasks nach Status', () => {
    repo.create({
      id: 't1', sessionId: null, blueprintId: null, title: 'A',
      description: '', agentId: 'a', priority: 'LOW', status: 'queued',
      dependsOn: [], timeoutSeconds: 300, retryCount: 0, maxRetries: 3,
      resultType: null, resultContent: null, error: null, metadata: {},
    });
    repo.create({
      id: 't2', sessionId: null, blueprintId: null, title: 'B',
      description: '', agentId: 'a', priority: 'LOW', status: 'working',
      dependsOn: [], timeoutSeconds: 300, retryCount: 0, maxRetries: 3,
      resultType: null, resultContent: null, error: null, metadata: {},
    });

    const queued = repo.listByStatus('queued');
    expect(queued).toHaveLength(1);
    expect(queued[0].title).toBe('A');
  });
});

describe('MessageRepository', () => {
  let db: Database;
  let sessionRepo: SessionRepository;
  let repo: MessageRepository;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    db = new Database(TEST_DB_PATH, false);
    sessionRepo = new SessionRepository(db.raw);
    repo = new MessageRepository(db.raw);

    // Session erstellen für Foreign Key
    sessionRepo.create({ id: 'sess-1', title: 'Test', status: 'active', metadata: {} });
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it('speichert Messages mit Thinking', () => {
    repo.create({
      id: 'msg-1',
      sessionId: 'sess-1',
      role: 'assistant',
      content: 'Antwort',
      thinking: 'Ich denke also bin ich...',
      tokensIn: 100,
      tokensOut: 50,
      durationMs: 2000,
      metadata: {},
    });

    const msg = repo.getById('msg-1');
    expect(msg).not.toBeNull();
    expect(msg!.thinking).toBe('Ich denke also bin ich...');
    expect(msg!.tokensIn).toBe(100);
    expect(msg!.durationMs).toBe(2000);
  });
});

describe('LayoutRepository', () => {
  let db: Database;
  let repo: LayoutRepository;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    db = new Database(TEST_DB_PATH, false);
    repo = new LayoutRepository(db.raw);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it('verwaltet Default-Layout', () => {
    repo.create({
      id: 'l1', name: 'Standard', config: { grid: '2x2' },
      isDefault: true, metadata: {},
    });
    repo.create({
      id: 'l2', name: 'Fokus', config: { grid: '1x1' },
      isDefault: false, metadata: {},
    });

    expect(repo.getDefault()!.name).toBe('Standard');

    repo.setDefault('l2');
    expect(repo.getDefault()!.name).toBe('Fokus');
  });
});
