// SPDX-License-Identifier: MIT
/**
 * DatabaseService – zentraler Zugangspunkt für alle Datenbank-Operationen.
 *
 * Erstellt die Datenbank-Connection und instantiiert alle Repositories.
 * Wird via Dependency Injection (oder einfach als Singleton) überall genutzt.
 */

import path from 'node:path';
import { Database } from './Database.js';
import { SessionRepository } from './repositories/SessionRepository.js';
import { MessageRepository } from './repositories/MessageRepository.js';
import { TaskRepository } from './repositories/TaskRepository.js';
import { BlueprintRepository } from './repositories/BlueprintRepository.js';
import { AuditRepository } from './repositories/AuditRepository.js';
import { LayoutRepository } from './repositories/LayoutRepository.js';
import type { BridgeConfig } from '../config/Config.js';

export class DatabaseService {
  private db: Database;

  public readonly sessions: SessionRepository;
  public readonly messages: MessageRepository;
  public readonly tasks: TaskRepository;
  public readonly blueprints: BlueprintRepository;
  public readonly audit: AuditRepository;
  public readonly layouts: LayoutRepository;

  constructor(config: BridgeConfig) {
    const dbPath = path.isAbsolute(config.database.path)
      ? config.database.path
      : path.resolve(process.cwd(), config.database.path);

    this.db = new Database(dbPath, config.database.walMode);

    // Repositories initialisieren
    this.sessions = new SessionRepository(this.db.raw);
    this.messages = new MessageRepository(this.db.raw);
    this.tasks = new TaskRepository(this.db.raw);
    this.blueprints = new BlueprintRepository(this.db.raw);
    this.audit = new AuditRepository(this.db.raw);
    this.layouts = new LayoutRepository(this.db.raw);
  }

  /**
   * Audit-Log-Eintrag schreiben (Shortcut).
   */
  log(actor: string, action: string, target?: string, details?: string, level?: string): void {
    this.db.audit(actor, action, target, details, level);
  }

  /**
   * Datenbank schließen.
   */
  close(): void {
    this.db.close();
  }
}
