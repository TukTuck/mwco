// SPDX-License-Identifier: MIT
/**
 * Terminal-Bridge – führt Shell-Befehle auf dem PC aus.
 *
 * ## Sicherheit:
 * - Blockierte Pfade werden geprüft (z.B. ~/.ssh)
 * - Output wird auf maxOutputSize begrenzt
 * - Timeout wird enforced
 * - Kein interaktiver Input (non-interactive shell)
 */

import { exec } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import type { TerminalAction, ActionResult } from '../server/Protocol.js';
import type { BridgeConfig } from '../config/Config.js';

export class TerminalBridge {
  constructor(private config: BridgeConfig) {}

  /**
   * Führt einen Shell-Befehl aus und gibt das Ergebnis zurück.
   */
  async execute(action: TerminalAction): Promise<ActionResult> {
    const cwd = this.resolveCwd(action.cwd);

    // Sicherheitscheck: Blockierte Pfade
    if (this.isBlockedPath(cwd)) {
      return {
        action: 'terminal',
        success: false,
        error: `Pfad blockiert: ${cwd}`,
        exitCode: 1,
      };
    }

    if (!this.config.security.allowShellExecution) {
      return {
        action: 'terminal',
        success: false,
        error: 'Shell-Ausführung ist deaktiviert in der Konfiguration',
        exitCode: 1,
      };
    }

    const timeout = action.timeout ?? this.config.security.executionTimeout;
    const env = { ...process.env, ...action.env };

    return new Promise((resolve) => {
      exec(
        action.command,
        {
          cwd,
          timeout,
          maxBuffer: this.config.security.maxOutputSize,
          env,
          // Windows: cmd.exe, Unix: /bin/sh
          shell: true,
        },
        (error, stdout, stderr) => {
          const truncatedStdout = this.truncate(stdout);
          const truncatedStderr = this.truncate(stderr);

          if (error) {
            // Timeout ist ein spezieller Fehler
            if (error.killed) {
              resolve({
                action: 'terminal',
                success: false,
                stdout: truncatedStdout,
                stderr: `Timeout nach ${timeout}ms`,
                exitCode: 124,
              });
            } else {
              resolve({
                action: 'terminal',
                success: false,
                stdout: truncatedStdout,
                stderr: truncatedStderr,
                exitCode: error.code ?? 1,
              });
            }
          } else {
            resolve({
              action: 'terminal',
              success: true,
              stdout: truncatedStdout,
              stderr: truncatedStderr,
              exitCode: 0,
            });
          }
        }
      );
    });
  }

  private resolveCwd(cwd?: string): string {
    if (cwd) {
      return path.isAbsolute(cwd) ? cwd : path.resolve(cwd);
    }
    return this.config.workspace.defaultPath || os.homedir();
  }

  private isBlockedPath(checkPath: string): boolean {
    const normalized = path.resolve(checkPath);
    const home = os.homedir();

    return this.config.security.blockedPaths.some((blocked) => {
      const expanded = blocked.replace(/^~/, home);
      const resolved = path.resolve(expanded);
      return normalized.startsWith(resolved);
    });
  }

  private truncate(output: string): string {
    const max = this.config.security.maxOutputSize;
    if (output.length <= max) return output;
    return output.slice(0, max) + `\n... [truncated, ${output.length - max} bytes omitted]`;
  }
}
