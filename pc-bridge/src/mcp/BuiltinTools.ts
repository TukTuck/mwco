// SPDX-License-Identifier: MIT
/**
 * Built-in MCP-Tools – Wraps die bestehenden Bridges als MCP-Tools.
 *
 * Diese Tools werden automatisch auf Pauls MCP-Knoten registriert.
 * Jedes Tool hat ein JSON-Schema für Input-Validierung.
 */

import type { MCPTool, MCPToolResult } from './MCPBus.js';
import type { TerminalBridge } from '../bridge/TerminalBridge.js';
import type { FileSystemBridge } from '../bridge/FileSystemBridge.js';
import type { GitBridge } from '../bridge/GitBridge.js';

function textResult(text: string, isError?: boolean): MCPToolResult {
  return {
    content: [{ type: 'text', text }],
    isError,
  };
}

// ── Terminal Tools ──────────────────────────────────

export function createTerminalTools(terminal: TerminalBridge): MCPTool[] {
  return [
    {
      name: 'execute_command',
      description: 'Führt einen Shell-Befehl aus. Gibt stdout, stderr und Exit-Code zurück.',
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Der auszuführende Befehl' },
          cwd: { type: 'string', description: 'Arbeitsverzeichnis (optional)' },
          timeout: { type: 'number', description: 'Timeout in Millisekunden (default: 30000)' },
        },
        required: ['command'],
      },
      handler: async (input) => {
        const result = await terminal.execute({
          type: 'terminal',
          command: input.command as string,
          cwd: input.cwd as string | undefined,
          timeout: (input.timeout as number) ?? 30000,
        });

        if (result.success) {
          return textResult(
            `Exit: ${result.exitCode}\n${result.stdout ?? ''}${result.stderr ? '\nSTDERR: ' + result.stderr : ''}`
          );
        }
        return textResult(`Fehler: ${result.error}\n${result.stderr ?? ''}`, true);
      },
    },
  ];
}

// ── FileSystem Tools ──────────────────────────────────

export function createFileSystemTools(filesystem: FileSystemBridge): MCPTool[] {
  return [
    {
      name: 'read_file',
      description: 'Liest den Inhalt einer Datei.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Dateipfad' },
        },
        required: ['path'],
      },
      handler: async (input) => {
        const result = await filesystem.readFile({
          type: 'read_file',
          path: input.path as string,
        });
        return result.success
          ? textResult(result.content ?? '')
          : textResult(`Fehler: ${result.error}`, true);
      },
    },
    {
      name: 'write_file',
      description: 'Schreibt Inhalt in eine Datei (erstellt oder überschreibt).',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Dateipfad' },
          content: { type: 'string', description: 'Dateiinhalt' },
        },
        required: ['path', 'content'],
      },
      handler: async (input) => {
        const result = await filesystem.writeFile({
          type: 'write_file',
          path: input.path as string,
          content: input.content as string,
        });
        return result.success
          ? textResult(`${result.bytesWritten ?? 0} Bytes geschrieben nach ${input.path}`)
          : textResult(`Fehler: ${result.error}`, true);
      },
    },
    {
      name: 'list_files',
      description: 'Listet Dateien und Verzeichnisse auf.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Verzeichnispfad' },
          recursive: { type: 'boolean', description: 'Rekursiv? (default: false)' },
        },
        required: ['path'],
      },
      handler: async (input) => {
        const result = await filesystem.listFiles({
          type: 'list_files',
          path: input.path as string,
          recursive: input.recursive as boolean | undefined,
        });
        return result.success
          ? textResult((result.files ?? []).join('\n'))
          : textResult(`Fehler: ${result.error}`, true);
      },
    },
    {
      name: 'search_files',
      description: 'Sucht Dateien nach einem Muster (Glob oder Text).',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Suchmuster' },
          path: { type: 'string', description: 'Startverzeichnis' },
        },
        required: ['pattern', 'path'],
      },
      handler: async (input) => {
        const result = await filesystem.searchFiles({
          type: 'search_files',
          pattern: input.pattern as string,
          path: input.path as string,
        });
        return result.success
          ? textResult((result.files ?? []).join('\n') || 'Keine Treffer')
          : textResult(`Fehler: ${result.error}`, true);
      },
    },
  ];
}

// ── Git Tools ──────────────────────────────────

export function createGitTools(git: GitBridge): MCPTool[] {
  return [
    {
      name: 'git_status',
      description: 'Zeigt den Git-Status des aktuellen Repositories.',
      inputSchema: {
        type: 'object',
        properties: {
          cwd: { type: 'string', description: 'Repository-Pfad' },
        },
      },
      handler: async (input) => {
        const result = await git.execute({
          type: 'git',
          action: 'status',
          cwd: input?.cwd as string | undefined,
        });
        return result.success
          ? textResult(result.stdout ?? '')
          : textResult(`Fehler: ${result.error}`, true);
      },
    },
    {
      name: 'git_diff',
      description: 'Zeigt die aktuellen Änderungen (git diff).',
      inputSchema: {
        type: 'object',
        properties: {
          cwd: { type: 'string', description: 'Repository-Pfad' },
          args: { type: 'array', items: { type: 'string' }, description: 'Zusätzliche Argumente' },
        },
      },
      handler: async (input) => {
        const result = await git.execute({
          type: 'git',
          action: 'diff',
          args: input?.args as string[] | undefined,
          cwd: input?.cwd as string | undefined,
        });
        return result.success
          ? textResult(result.stdout ?? '(keine Änderungen)')
          : textResult(`Fehler: ${result.error}`, true);
      },
    },
    {
      name: 'git_log',
      description: 'Zeigt die letzten Commits.',
      inputSchema: {
        type: 'object',
        properties: {
          cwd: { type: 'string', description: 'Repository-Pfad' },
          args: { type: 'array', items: { type: 'string' }, description: 'Zusätzliche Argumente (z.B. ["-5"])' },
        },
      },
      handler: async (input) => {
        const result = await git.execute({
          type: 'git',
          action: 'log',
          args: input?.args as string[] | undefined,
          cwd: input?.cwd as string | undefined,
        });
        return result.success
          ? textResult(result.stdout ?? '')
          : textResult(`Fehler: ${result.error}`, true);
      },
    },
    {
      name: 'git_commit',
      description: 'Erstellt einen Git-Commit.',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Commit-Nachricht' },
          cwd: { type: 'string', description: 'Repository-Pfad' },
        },
        required: ['message'],
      },
      handler: async (input) => {
        const result = await git.execute({
          type: 'git',
          action: 'commit',
          args: ['-m', input.message as string],
          cwd: input?.cwd as string | undefined,
        });
        return result.success
          ? textResult(result.stdout ?? 'Commit erstellt')
          : textResult(`Fehler: ${result.error}`, true);
      },
    },
  ];
}
