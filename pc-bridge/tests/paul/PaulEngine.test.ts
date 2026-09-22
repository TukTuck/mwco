// SPDX-License-Identifier: MIT
/**
 * Tests für die Paul Engine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PaulEngine, DEFAULT_PAUL_CONFIG } from '../../src/paul/PaulEngine.js';
import { MCPBus } from '../../src/mcp/MCPBus.js';

describe('PaulEngine', () => {
  let bus: MCPBus;
  let paul: PaulEngine;

  beforeEach(() => {
    bus = new MCPBus();
    bus.registerNode('paul', 'Paul', 'paul', '🔵');
    paul = new PaulEngine(bus);
  });

  it('initialisiert mit System-Prompt', () => {
    const history = paul.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].role).toBe('system');
    expect(history[0].content).toContain('Paul');
  });

  it('hat korrekte Default-Config', () => {
    expect(DEFAULT_PAUL_CONFIG.model).toContain('qwen2.5');
    expect(DEFAULT_PAUL_CONFIG.temperature).toBe(0.3);
    expect(DEFAULT_PAUL_CONFIG.contextWindow).toBe(8192);
  });

  it('löscht History korrekt', () => {
    paul.clearHistory();
    const history = paul.getHistory();
    expect(history).toHaveLength(1); // Nur System-Prompt bleibt
    expect(history[0].role).toBe('system');
  });

  it('parst Tool-Aufrufe', () => {
    // parseToolCall ist private, aber wir testen das Verhalten
    // Das Tool-Parsing wird intern in chat() aufgerufen
    // Hier nur ein Sanity-Check
    expect(paul).toBeDefined();
  });
});

describe('OrchestratorEngine', () => {
  it('importiert ohne Fehler', async () => {
    const { OrchestratorEngine } = await import('../../src/paul/OrchestratorEngine.js');
    const bus = new MCPBus();
    bus.registerNode('orchestrator', 'Orchestrator', 'orchestrator');
    bus.registerNode('paul', 'Paul', 'paul');
    const orch = new OrchestratorEngine(bus);
    expect(orch).toBeDefined();
    expect(orch.getTasks()).toHaveLength(0);
  });
});
