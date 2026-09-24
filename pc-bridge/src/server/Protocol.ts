// SPDX-License-Identifier: MIT
/**
 * Agent Deck PC-Bridge – WebSocket-Protokoll Typdefinitionen.
 *
 * Diese Typen definieren das JSON-Protokoll zwischen Android-App und PC-Bridge.
 * Beide Seiten MÜSSEN diese Typen einhalten.
 *
 * Siehe docs/PROTOCOL.md für die vollständige Spezifikation.
 */

// ── Nachrichten-Typen ──────────────────────────────────

export type MessageType =
  | 'auth'
  | 'auth_ok'
  | 'auth_failed'
  | 'task_request'
  | 'task_cancel'
  | 'progress'
  | 'result'
  | 'error'
  | 'ping'
  | 'pong'
  | 'ask_user'
  | 'user_response';

/**
 * Basis-Nachricht – alle WebSocket-Nachrichten haben dieses Format.
 */
export interface BridgeMessage {
  type: MessageType;
  task_id: string;
  payload: Record<string, unknown>;
}

// ── Auth ──────────────────────────────────

export interface AuthMessage extends BridgeMessage {
  type: 'auth';
  payload: {
    token: string;
    client_version?: string;
    client_platform?: string;
  };
}

export interface AuthOkMessage extends BridgeMessage {
  type: 'auth_ok';
  payload: {
    bridge_version: string;
    platform: string;
    hostname: string;
    capabilities: BridgeCapability[];
  };
}

export type BridgeCapability = 'terminal' | 'filesystem' | 'git' | 'code_exec' | 'ask_user';

// ── Task ──────────────────────────────────

export interface TaskRequestMessage extends BridgeMessage {
  type: 'task_request';
  payload: {
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timeout_seconds: number;
    actions: BridgeAction[];
  };
}

// ── Aktionen ──────────────────────────────────

export type BridgeAction =
  | TerminalAction
  | WriteFileAction
  | ReadFileAction
  | ListFilesAction
  | SearchFilesAction
  | GitAction;

export interface TerminalAction {
  type: 'terminal';
  command: string;
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface WriteFileAction {
  type: 'write_file';
  path: string;
  content: string;
  cwd?: string;
}

export interface ReadFileAction {
  type: 'read_file';
  path: string;
  cwd?: string;
}

export interface ListFilesAction {
  type: 'list_files';
  path: string;
  recursive?: boolean;
  cwd?: string;
}

export interface SearchFilesAction {
  type: 'search_files';
  pattern: string;
  path: string;
  cwd?: string;
}

export interface GitAction {
  type: 'git';
  action: 'status' | 'diff' | 'log' | 'add' | 'commit' | 'branch';
  args?: string[];
  cwd?: string;
}

// ── Ergebnisse ──────────────────────────────────

export interface ActionResult {
  action: string;
  success: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  bytesWritten?: number;
  content?: string;
  files?: string[];
  error?: string;
}

export interface TaskResultMessage extends BridgeMessage {
  type: 'result';
  payload: {
    success: boolean;
    content: string;
    result_type: 'TEXT' | 'CODE' | 'JSON' | 'FILE';
    details: ActionResult[];
  };
}

export interface ProgressMessage extends BridgeMessage {
  type: 'progress';
  payload: {
    action_index: number;
    total_actions: number;
    message: string;
    stdout?: string;
    stderr?: string;
  };
}

export interface ErrorMessage extends BridgeMessage {
  type: 'error';
  payload: {
    error: string;
    action_index?: number;
    details?: string;
  };
}
