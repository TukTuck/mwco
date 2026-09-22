// SPDX-License-Identifier: MIT
/**
 * Paul Engine – LLM + Voice + MCP-Brücke.
 *
 * ## Architektur:
 * - LLM: Ollama (Qwen2.5-7B-Instruct Q4, ~4.5GB VRAM)
 * - STT: Whisper (faster-whisper, ~500MB VRAM)
 * - TTS: Piper (~50MB, CPU-only)
 * - MCP: Volle Tools via MCP-Bus
 *
 * ## VRAM-Budget (8GB Minimum):
 * - 4.5GB Paul (Qwen2.5-7B Q4)
 * - 0.5GB Whisper
 * - 1.0GB Orchestrator (Qwen2.5-1.5B Q4)
 * - 2.0GB UI + Reserve
 *
 * ## Hotkey:
 * Ctrl+Shift+P → Paul fokussieren / aktivieren
 */

import { EventEmitter } from 'node:events';
import type { MCPBus, MCPToolResult } from '../mcp/MCPBus.js';

// ── Typen ──────────────────────────────────

export interface PaulMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  thinking?: string;
  timestamp: number;
  tokensIn?: number;
  tokensOut?: number;
  durationMs?: number;
}

export interface PaulConfig {
  ollamaUrl: string;
  model: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  contextWindow: number;
}

export const DEFAULT_PAUL_CONFIG: PaulConfig = {
  ollamaUrl: 'http://localhost:11434',
  model: 'qwen2.5:7b-instruct-q4_K_M',
  systemPrompt: `Du bist Paul, der Allrounder-Assistent im Agent Deck.

## Deine Fähigkeiten:
- Dateien lesen, schreiben und durchsuchen
- Terminal-Befehle ausführen
- Git-Operationen (status, diff, commit, etc.)
- Code schreiben und debuggen

## Regeln:
- Antworte auf Deutsch
- Sei präzise und effizient
- Nutze Tools wenn nötig, erkläre aber was du tust
- Wenn etwas fehlschlägt, versuche einen alternativen Ansatz
- Frage bei mehrdeutigen Anfragen nach

## MCP-Tools:
Du hast Zugriff auf verschiedene Tools über den MCP-Bus. Nutze sie wenn sie helfen.`,
  maxTokens: 4096,
  temperature: 0.3,
  contextWindow: 8192,
};

// ── Paul Engine ──────────────────────────────────

export class PaulEngine extends EventEmitter {
  private config: PaulConfig;
  private history: PaulMessage[] = [];
  private bus: MCPBus;
  private isProcessing = false;

  constructor(bus: MCPBus, config: Partial<PaulConfig> = {}) {
    super();
    this.config = { ...DEFAULT_PAUL_CONFIG, ...config };
    this.bus = bus;

    // System-Prompt als erste Nachricht
    this.history.push({
      role: 'system',
      content: this.config.systemPrompt,
      timestamp: Date.now(),
    });
  }

  /**
   * Sendet eine Nachricht an Paul und bekommt eine Antwort.
   */
  async chat(userMessage: string): Promise<PaulMessage> {
    if (this.isProcessing) {
      throw new Error('Paul ist bereits beschäftigt');
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      // User-Nachricht zur History hinzufügen
      this.history.push({
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
      });

      this.emit('thinking', 'Verarbeite Anfrage...');

      // LLM-Antwort von Ollama holen
      const response = await this.callOllama();

      // Prüfen ob Tool-Aufrufe in der Antwort sind
      const toolCall = this.parseToolCall(response);
      let finalContent = response;
      let thinking: string | undefined;

      if (toolCall) {
        this.emit('thinking', `Rufe Tool auf: ${toolCall.tool}...`);

        // Tool über MCP-Bus aufrufen
        const toolResult = await this.bus.callTool(
          'paul',
          'paul', // Pauls eigene Tools
          toolCall.tool,
          toolCall.input
        );

        // Tool-Ergebnis zur History hinzufügen
        this.history.push({
          role: 'tool',
          content: JSON.stringify(toolResult),
          timestamp: Date.now(),
        });

        // Nochmal LLM fragen mit Tool-Ergebnis
        finalContent = await this.callOllama();
        thinking = `Tool "${toolCall.tool}" aufgerufen → ${toolResult.isError ? 'Fehler' : 'Erfolg'}`;
      }

      const durationMs = Date.now() - startTime;
      const assistantMessage: PaulMessage = {
        role: 'assistant',
        content: finalContent,
        thinking,
        timestamp: Date.now(),
        durationMs,
      };

      this.history.push(assistantMessage);
      this.emit('message', assistantMessage);

      // History trimmen auf Context-Window
      this.trimHistory();

      return assistantMessage;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Spracheingabe → Text (Whisper STT).
   * Gibt den erkannten Text zurück.
   */
  async transcribe(audioBuffer: Buffer): Promise<string> {
    this.emit('thinking', 'Transkribiere...');

    // faster-whisper API (lokal)
    try {
      const response = await fetch('http://localhost:9000/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: audioBuffer,
      });

      if (!response.ok) {
        throw new Error(`Whisper STT Fehler: ${response.statusText}`);
      }

      const result = await response.json() as { text: string };
      return result.text;
    } catch (err) {
      // Fallback: Whisper nicht verfügbar
      this.emit('warning', 'Whisper STT nicht verfügbar. Nutze Texteingabe.');
      throw err;
    }
  }

  /**
   * Text → Sprache (Piper TTS).
   * Gibt Audio-Buffer zurück.
   */
  async speak(text: string): Promise<Buffer> {
    try {
      const response = await fetch('http://localhost:9001/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'de_DE-thorsten-medium' }),
      });

      if (!response.ok) {
        throw new Error(`Piper TTS Fehler: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      this.emit('warning', 'Piper TTS nicht verfügbar.');
      throw err;
    }
  }

  /**
   * Chat-History zurückgeben.
   */
  getHistory(): PaulMessage[] {
    return [...this.history];
  }

  /**
   * Chat-History löschen.
   */
  clearHistory(): void {
    this.history = [{
      role: 'system',
      content: this.config.systemPrompt,
      timestamp: Date.now(),
    }];
    this.emit('history_cleared');
  }

  // ── Private ──────────────────────────────────

  private async callOllama(): Promise<string> {
    const messages = this.history.map((m) => ({
      role: m.role === 'tool' ? 'user' : m.role, // Ollama kennt kein "tool" role
      content: m.content,
    }));

    const response = await fetch(`${this.config.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: false,
        options: {
          num_predict: this.config.maxTokens,
          temperature: this.config.temperature,
          num_ctx: this.config.contextWindow,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama Fehler (${response.status}): ${errorText}`);
    }

    const result = await response.json() as {
      message: { content: string };
      eval_count?: number;
      prompt_eval_count?: number;
    };

    return result.message.content;
  }

  /**
   * Parst Tool-Aufrufe aus der LLM-Antwort.
   * Format: [TOOL:name] { ...json... } [/TOOL]
   */
  private parseToolCall(text: string): { tool: string; input: Record<string, unknown> } | null {
    const match = text.match(/\[TOOL:(\w+)\]\s*(\{[^]*?\})\s*\[\/TOOL\]/);
    if (!match) return null;

    try {
      return {
        tool: match[1],
        input: JSON.parse(match[2]),
      };
    } catch {
      return null;
    }
  }

  private trimHistory(): void {
    // Behalte System-Prompt + letzte N Nachrichten
    const maxMessages = 50;
    if (this.history.length > maxMessages) {
      this.history = [
        this.history[0], // System-Prompt behalten
        ...this.history.slice(-(maxMessages - 1)),
      ];
    }
  }
}
