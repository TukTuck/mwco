// SPDX-License-Identifier: MIT
/**
 * MessageHandler – verarbeitet authentifizierte WebSocket-Nachrichten.
 *
 * Delegiert an die passenden Bridges UND den MCP-Bus:
 * - task_request → TerminalBridge, FileSystemBridge, GitBridge (legacy)
 * - mcp_call → MCP-Bus (Tool-Aufruf zwischen Knoten)
 * - task_cancel → laufenden Task abbrechen
 * - ping → pong
 *
 * Persistiert Tasks und Ergebnisse in der SQLite-Datenbank.
 */

import { WebSocket } from 'ws';
import type {
  BridgeMessage,
  TaskRequestMessage,
  BridgeAction,
  ActionResult,
  ProgressMessage,
  TaskResultMessage,
  ErrorMessage,
} from './Protocol.js';
import { TerminalBridge } from '../bridge/TerminalBridge.js';
import { FileSystemBridge } from '../bridge/FileSystemBridge.js';
import { GitBridge } from '../bridge/GitBridge.js';
import type { BridgeConfig } from '../config/Config.js';
import type { DatabaseService } from '../database/DatabaseService.js';
import type { MCPBus } from '../mcp/MCPBus.js';
import { logger } from '../index.js';

export class MessageHandler {
  private terminal: TerminalBridge;
  private filesystem: FileSystemBridge;
  private git: GitBridge;
  private runningTasks = new Map<string, AbortController>();

  constructor(
    private config: BridgeConfig,
    private db?: DatabaseService,
    private bus?: MCPBus
  ) {
    this.terminal = new TerminalBridge(config);
    this.filesystem = new FileSystemBridge(config);
    this.git = new GitBridge(config, this.terminal);
  }

  async handleMessage(ws: WebSocket, message: BridgeMessage): Promise<void> {
    switch (message.type) {
      case 'task_request':
        await this.handleTaskRequest(ws, message as TaskRequestMessage);
        break;

      case 'task_cancel':
        this.handleTaskCancel(message.task_id);
        break;

      case 'ping':
        this.send(ws, { type: 'pong', task_id: '', payload: {} });
        break;

      default:
        logger.warn(`Unbekannter Nachrichtentyp: ${message.type}`);
        this.send(ws, {
          type: 'error',
          task_id: message.task_id,
          payload: { error: `Unknown message type: ${message.type}` },
        });
    }
  }

  /**
   * Verarbeitet einen Task: Führt alle Aktionen sequentiell aus.
   *
   * ## Warum sequentiell?
   * Aktionen bauen oft aufeinander auf (z.B. mkdir → write_file → git add).
   * Parallele Ausführung würde Race Conditions verursachen.
   */
  private async handleTaskRequest(ws: WebSocket, message: TaskRequestMessage): Promise<void> {
    const { task_id } = message;
    const { actions, timeout_seconds } = message.payload;

    logger.info(`Task ${task_id}: ${actions.length} Aktionen`);

    // Task in DB persistieren
    if (this.db) {
      try {
        this.db.tasks.create({
          id: task_id,
          sessionId: null,
          blueprintId: null,
          title: message.payload.title,
          description: message.payload.description,
          agentId: 'pc-bridge',
          priority: message.payload.priority,
          status: 'working',
          dependsOn: [],
          timeoutSeconds: timeout_seconds,
          retryCount: 0,
          maxRetries: 3,
          resultType: null,
          resultContent: null,
          error: null,
          metadata: { actions: actions.length },
        });
        this.db.log('bridge', 'task_started', task_id, `${actions.length} Aktionen`);
      } catch (err) {
        logger.warn(`DB-Fehler beim Task-Start: ${(err as Error).message}`);
      }
    }

    // AbortController für Cancel-Support
    const abortController = new AbortController();
    this.runningTasks.set(task_id, abortController);

    const results: ActionResult[] = [];
    let allSuccess = true;

    try {
      for (let i = 0; i < actions.length; i++) {
        if (abortController.signal.aborted) {
          logger.info(`Task ${task_id} abgebrochen`);
          break;
        }

        const action = actions[i];

        // Progress-Update senden
        this.sendProgress(ws, task_id, i, actions.length, action);

        // Aktion ausführen
        const result = await this.executeAction(action, timeout_seconds);
        results.push(result);

        if (!result.success) {
          allSuccess = false;
          logger.warn(`Task ${task_id}, Aktion ${i} fehlgeschlagen: ${result.error}`);
          // Bei Fehler: Restliche Aktionen überspringen
          break;
        }
      }
    } finally {
      this.runningTasks.delete(task_id);
    }

    // Ergebnis in DB persistieren
    if (this.db) {
      try {
        if (allSuccess) {
          const summary = `${results.length} Aktionen erfolgreich ausgeführt`;
          this.db.tasks.setResult(task_id, 'TEXT', summary);
          this.db.log('bridge', 'task_completed', task_id, summary);
        } else {
          const errorMsg = results[results.length - 1]?.error ?? 'Unbekannter Fehler';
          this.db.tasks.setError(task_id, errorMsg);
          this.db.log('bridge', 'task_failed', task_id, errorMsg, 'error');
        }
      } catch (err) {
        logger.warn(`DB-Fehler beim Task-Abschluss: ${(err as Error).message}`);
      }
    }

    // Ergebnis senden
    const resultMessage: TaskResultMessage | ErrorMessage = allSuccess
      ? {
          type: 'result',
          task_id,
          payload: {
            success: true,
            content: `${results.length} Aktionen erfolgreich ausgeführt`,
            result_type: 'TEXT',
            details: results,
          },
        }
      : {
          type: 'error',
          task_id,
          payload: {
            error: results[results.length - 1]?.error ?? 'Unbekannter Fehler',
            action_index: results.length - 1,
            details: JSON.stringify(results),
          },
        };

    this.send(ws, resultMessage);
    logger.info(`Task ${task_id} abgeschlossen: ${allSuccess ? 'OK' : 'FEHLER'}`);
  }

  private async executeAction(
    action: BridgeAction,
    timeoutSeconds: number
  ): Promise<ActionResult> {
    switch (action.type) {
      case 'terminal':
        return this.terminal.execute({
          ...action,
          timeout: action.timeout ?? timeoutSeconds * 1000,
        });

      case 'write_file':
        return this.filesystem.writeFile(action);

      case 'read_file':
        return this.filesystem.readFile(action);

      case 'list_files':
        return this.filesystem.listFiles(action);

      case 'search_files':
        return this.filesystem.searchFiles(action);

      case 'git':
        return this.git.execute(action);

      default:
        return {
          action: (action as { type: string }).type,
          success: false,
          error: `Unbekannter Aktionstyp: ${(action as { type: string }).type}`,
        };
    }
  }

  private sendProgress(
    ws: WebSocket,
    taskId: string,
    actionIndex: number,
    totalActions: number,
    action: BridgeAction
  ): void {
    const message: ProgressMessage = {
      type: 'progress',
      task_id: taskId,
      payload: {
        action_index: actionIndex,
        total_actions: totalActions,
        message: `Führe aus: ${action.type} ${this.describeAction(action)}`,
      },
    };
    this.send(ws, message);
  }

  private describeAction(action: BridgeAction): string {
    switch (action.type) {
      case 'terminal':
        return action.command.slice(0, 80);
      case 'write_file':
        return `→ ${action.path}`;
      case 'read_file':
        return `← ${action.path}`;
      case 'list_files':
        return action.path;
      case 'search_files':
        return `"${action.pattern}" in ${action.path}`;
      case 'git':
        return `${action.action} ${action.args?.join(' ') ?? ''}`.trim();
      default:
        return '';
    }
  }

  private handleTaskCancel(taskId: string): void {
    const controller = this.runningTasks.get(taskId);
    if (controller) {
      controller.abort();
      logger.info(`Cancel-Signal für Task ${taskId}`);

      if (this.db) {
        this.db.tasks.updateStatus(taskId, 'cancelled');
        this.db.log('bridge', 'task_cancelled', taskId);
      }
    }
  }

  private send(ws: WebSocket, message: BridgeMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}
