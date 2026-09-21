/**
 * Git-Bridge – Git-Operationen auf dem PC.
 *
 * Alle Git-Befehle werden als Shell-Commands ausgeführt.
 * Das ist einfacher als eine Git-Library und unterstützt alle Git-Features.
 */

import type { GitAction, ActionResult } from '../server/Protocol.js';
import { TerminalBridge } from './TerminalBridge.js';
import type { BridgeConfig } from '../config/Config.js';

export class GitBridge {
  constructor(
    private config: BridgeConfig,
    private terminal: TerminalBridge
  ) {}

  async execute(action: GitAction): Promise<ActionResult> {
    const gitCommand = this.buildGitCommand(action);

    if (!gitCommand) {
      return {
        action: 'git',
        success: false,
        error: `Unbekannte Git-Aktion: ${action.action}`,
      };
    }

    const result = await this.terminal.execute({
      type: 'terminal',
      command: gitCommand,
      cwd: action.cwd,
    });

    return {
      ...result,
      action: 'git',
    };
  }

  private buildGitCommand(action: GitAction): string | null {
    const args = action.args?.join(' ') ?? '';

    switch (action.action) {
      case 'status':
        return `git status --porcelain ${args}`.trim();
      case 'diff':
        return `git diff ${args}`.trim();
      case 'log':
        return `git log --oneline -20 ${args}`.trim();
      case 'add':
        return `git add ${args || '.'}`.trim();
      case 'commit':
        return `git commit ${args}`.trim();
      case 'branch':
        return `git branch ${args}`.trim();
      default:
        return null;
    }
  }
}
