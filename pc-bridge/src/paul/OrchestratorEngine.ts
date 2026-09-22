// SPDX-License-Identifier: MIT
/**
 * Orchestrator Engine – spezialisierter Task-Dispatcher.
 *
 * ## Architektur:
 * - LLM: Qwen2.5-1.5B-Instruct Q4 (~900MB VRAM, 4K Context)
 * - Job: Blueprint → Tasks → Dispatch → Monitor
 * - KEIN Allrounder – nur Orchestrierung
 * - Paul ist der Allrounder, der im Notfall übernimmt
 *
 * ## Task-Graph:
 * Blueprint wird in Tasks zerlegt, mit Dependencies.
 * Tasks werden an Agenten dispatched, Status wird monitored.
 * Bei Blockaden: User wird gefragt (via MCP-Bus → UI).
 */

import { EventEmitter } from 'node:events';
import type { MCPBus } from '../mcp/MCPBus.js';

export interface OrchestratorTask {
  id: string;
  title: string;
  description: string;
  agentId: string;
  dependsOn: string[];
  status: 'queued' | 'dispatching' | 'working' | 'reviewing' | 'done' | 'failed' | 'blocked' | 'cancelled';
  result?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface Blueprint {
  id: string;
  name: string;
  description: string;
  tasks: OrchestratorTask[];
}

export interface OrchestratorConfig {
  ollamaUrl: string;
  model: string;
  contextWindow: number;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  ollamaUrl: 'http://localhost:11434',
  model: 'qwen2.5:1.5b-instruct-q4_K_M',
  contextWindow: 4096,
};

const SYSTEM_PROMPT = `Du bist der Orchestrator im Agent Deck. Deine AUFGABE ist es, Blueprints in Tasks zu zerlegen.

## Regeln:
- Antworte NUR mit JSON (kein Markdown, kein Text davor/danach)
- Jeder Task hat: id, title, description, agentId, dependsOn (Array)
- Nutze realistische Agent-IDs: "claude", "chatgpt", "paul", "terminal"
- Dependencies als Array von Task-IDs die vorher fertig sein müssen

## Ausgabe-Format:
{
  "tasks": [
    {"id": "t1", "title": "...", "description": "...", "agentId": "...", "dependsOn": []},
    {"id": "t2", "title": "...", "description": "...", "agentId": "...", "dependsOn": ["t1"]}
  ]
}`;

export class OrchestratorEngine extends EventEmitter {
  private config: OrchestratorConfig;
  private bus: MCPBus;
  private tasks: Map<string, OrchestratorTask> = new Map();
  private currentBlueprint: Blueprint | null = null;

  constructor(bus: MCPBus, config: Partial<OrchestratorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bus = bus;
  }

  /**
   * Zerlegt einen Blueprint in Tasks (via LLM).
   */
  async decompose(blueprintText: string): Promise<Blueprint> {
    this.emit('status', 'Decomposing blueprint...');

    const response = await this.callLLM(blueprintText);
    let parsed: { tasks: OrchestratorTask[] };

    try {
      // JSON aus der Antwort extrahieren
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Kein JSON in Antwort gefunden');
      parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
      this.emit('error', `Blueprint-Parsing fehlgeschlagen: ${(err as Error).message}`);
      // Fallback: Einzelner Task für Paul
      parsed = {
        tasks: [{
          id: 't1',
          title: 'Blueprint ausführen',
          description: blueprintText,
          agentId: 'paul',
          dependsOn: [],
          status: 'queued',
          retryCount: 0,
          maxRetries: 3,
        }],
      };
    }

    // Tasks mit Defaults initialisieren
    const tasks = parsed.tasks.map((t) => ({
      ...t,
      status: 'queued' as const,
      retryCount: 0,
      maxRetries: 3,
    }));

    this.tasks.clear();
    for (const task of tasks) {
      this.tasks.set(task.id, task);
    }

    const blueprint: Blueprint = {
      id: `bp-${Date.now()}`,
      name: blueprintText.slice(0, 50),
      description: blueprintText,
      tasks,
    };

    this.currentBlueprint = blueprint;
    this.emit('decomposed', blueprint);
    return blueprint;
  }

  /**
   * Startet die Ausführung aller Tasks (respektiert Dependencies).
   */
  async execute(): Promise<void> {
    if (!this.currentBlueprint) {
      throw new Error('Kein Blueprint geladen');
    }

    this.emit('status', 'Executing...');

    while (this.hasIncompleteTasks()) {
      const readyTasks = this.getReadyTasks();

      if (readyTasks.length === 0) {
        // Keine Tasks bereit, aber noch unvollständige → Deadlock oder wartend
        const working = [...this.tasks.values()].filter((t) => t.status === 'working');
        if (working.length > 0) {
          // Warten auf laufende Tasks
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        // Alle remaining sind blockiert oder fehlgeschlagen
        break;
      }

      // Tasks parallel dispatchen
      const dispatchPromises = readyTasks.map((task) => this.dispatchTask(task));
      await Promise.allSettled(dispatchPromises);
    }

    // Zusammenfassung
    const done = [...this.tasks.values()].filter((t) => t.status === 'done').length;
    const failed = [...this.tasks.values()].filter((t) => t.status === 'failed').length;
    const total = this.tasks.size;

    this.emit('completed', { total, done, failed });
  }

  /**
   * Gibt den aktuellen Task-Status zurück.
   */
  getTasks(): OrchestratorTask[] {
    return [...this.tasks.values()];
  }

  // ── Private ──────────────────────────────────

  private hasIncompleteTasks(): boolean {
    return [...this.tasks.values()].some(
      (t) => !['done', 'failed', 'cancelled'].includes(t.status)
    );
  }

  private getReadyTasks(): OrchestratorTask[] {
    return [...this.tasks.values()].filter((task) => {
      if (task.status !== 'queued') return false;

      // Alle Dependencies müssen "done" sein
      return task.dependsOn.every((depId) => {
        const dep = this.tasks.get(depId);
        return dep?.status === 'done';
      });
    });
  }

  private async dispatchTask(task: OrchestratorTask): Promise<void> {
    task.status = 'working';
    this.emit('task:update', task);

    try {
      // Task über MCP-Bus an den entsprechenden Agenten senden
      const result = await this.bus.callTool('orchestrator', 'paul', 'execute_command', {
        command: `echo "Task: ${task.title}"`,
      });

      if (result.isError) {
        throw new Error(result.content[0]?.text ?? 'Unbekannter Fehler');
      }

      task.status = 'done';
      task.result = result.content[0]?.text ?? '';
    } catch (err) {
      task.error = (err as Error).message;

      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = 'queued'; // Zurück in die Queue
        this.emit('task:retry', task);
      } else {
        task.status = 'failed';
        this.emit('task:failed', task);
      }
    }

    this.emit('task:update', task);
  }

  private async callLLM(prompt: string): Promise<string> {
    const response = await fetch(`${this.config.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        stream: false,
        options: {
          num_predict: 2048,
          temperature: 0.2,
          num_ctx: this.config.contextWindow,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama Fehler: ${response.status}`);
    }

    const result = await response.json() as { message: { content: string } };
    return result.message.content;
  }
}
