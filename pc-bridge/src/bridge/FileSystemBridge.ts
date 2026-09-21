/**
 * Filesystem-Bridge – Datei-Operationen auf dem PC.
 *
 * ## Sicherheit:
 * - Blockierte Pfade werden geprüft
 * - Kein Zugriff außerhalb der erlaubten Pfade
 * - Schreib-Operationen erzeugen Parent-Directories automatisch
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type {
  WriteFileAction,
  ReadFileAction,
  ListFilesAction,
  SearchFilesAction,
  ActionResult,
} from '../server/Protocol.js';
import type { BridgeConfig } from '../config/Config.js';

export class FileSystemBridge {
  constructor(private config: BridgeConfig) {}

  async writeFile(action: WriteFileAction): Promise<ActionResult> {
    const filePath = this.resolvePath(action.path, action.cwd);

    if (this.isBlockedPath(filePath)) {
      return { action: 'write_file', success: false, error: `Pfad blockiert: ${filePath}` };
    }

    try {
      // Parent-Directories erstellen falls nicht vorhanden
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, action.content, 'utf-8');

      const stats = await fs.stat(filePath);
      return {
        action: 'write_file',
        success: true,
        bytesWritten: stats.size,
      };
    } catch (err) {
      return {
        action: 'write_file',
        success: false,
        error: `Fehler beim Schreiben: ${(err as Error).message}`,
      };
    }
  }

  async readFile(action: ReadFileAction): Promise<ActionResult> {
    const filePath = this.resolvePath(action.path, action.cwd);

    if (this.isBlockedPath(filePath)) {
      return { action: 'read_file', success: false, error: `Pfad blockiert: ${filePath}` };
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        action: 'read_file',
        success: true,
        content: this.truncate(content),
      };
    } catch (err) {
      return {
        action: 'read_file',
        success: false,
        error: `Fehler beim Lesen: ${(err as Error).message}`,
      };
    }
  }

  async listFiles(action: ListFilesAction): Promise<ActionResult> {
    const dirPath = this.resolvePath(action.path, action.cwd);

    if (this.isBlockedPath(dirPath)) {
      return { action: 'list_files', success: false, error: `Pfad blockiert: ${dirPath}` };
    }

    try {
      if (action.recursive) {
        const files = await this.walkDir(dirPath);
        return { action: 'list_files', success: true, files };
      } else {
        const entries = await fs.readdir(dirPath);
        return { action: 'list_files', success: true, files: entries };
      }
    } catch (err) {
      return {
        action: 'list_files',
        success: false,
        error: `Fehler beim Auflisten: ${(err as Error).message}`,
      };
    }
  }

  async searchFiles(action: SearchFilesAction): Promise<ActionResult> {
    const searchPath = this.resolvePath(action.path, action.cwd);

    if (this.isBlockedPath(searchPath)) {
      return { action: 'search_files', success: false, error: `Pfad blockiert: ${searchPath}` };
    }

    try {
      const files = await this.walkDir(searchPath);
      const matches: string[] = [];
      const regex = new RegExp(action.pattern, 'i');

      for (const file of files.slice(0, 1000)) {
        // Max 1000 Dateien durchsuchen
        try {
          const content = await fs.readFile(file, 'utf-8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              const rel = path.relative(searchPath, file);
              matches.push(`${rel}:${i + 1}: ${lines[i].trim().slice(0, 200)}`);
              if (matches.length >= 100) break; // Max 100 Matches
            }
          }
        } catch {
          // Binary files oder Permission-Errors überspringen
        }
        if (matches.length >= 100) break;
      }

      return {
        action: 'search_files',
        success: true,
        content: matches.join('\n') || 'Keine Treffer',
      };
    } catch (err) {
      return {
        action: 'search_files',
        success: false,
        error: `Fehler beim Suchen: ${(err as Error).message}`,
      };
    }
  }

  private resolvePath(filePath: string, cwd?: string): string {
    if (path.isAbsolute(filePath)) return filePath;
    const base = cwd || this.config.workspace.defaultPath || os.homedir();
    return path.resolve(base, filePath);
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

  private async walkDir(dir: string, depth = 0): Promise<string[]> {
    if (depth > 10) return []; // Max 10 Ebenen tief
    const results: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // node_modules, .git etc. überspringen
        if (['node_modules', '.git', 'dist', 'build', '__pycache__'].includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          results.push(...(await this.walkDir(fullPath, depth + 1)));
        } else {
          results.push(fullPath);
        }
      }
    } catch {
      // Permission errors etc.
    }

    return results;
  }

  private truncate(content: string): string {
    const max = this.config.security.maxOutputSize;
    if (content.length <= max) return content;
    return content.slice(0, max) + `\n... [truncated, ${content.length - max} bytes omitted]`;
  }
}
