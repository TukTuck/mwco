// SPDX-License-Identifier: MIT
/**
 * Tests für den MCP-Bus.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MCPBus, type MCPToolResult } from '../../src/mcp/MCPBus.js';

describe('MCPBus', () => {
  let bus: MCPBus;

  beforeEach(() => {
    bus = new MCPBus();
  });

  it('registriert Knoten', () => {
    const node = bus.registerNode('paul', 'Paul', 'paul', '🔵');
    expect(node.id).toBe('paul');
    expect(node.name).toBe('Paul');
    expect(node.type).toBe('paul');
    expect(node.color).toBe('🔵');
    expect(bus.getNodes()).toHaveLength(1);
  });

  it('lehnt doppelte Knoten-IDs ab', () => {
    bus.registerNode('paul', 'Paul', 'paul');
    expect(() => bus.registerNode('paul', 'Paul 2', 'paul')).toThrow();
  });

  it('registriert und ruft Tools auf', async () => {
    bus.registerNode('paul', 'Paul', 'paul');
    bus.registerNode('orch', 'Orchestrator', 'orchestrator');

    bus.registerTool('paul', {
      name: 'echo',
      description: 'Echo-Tool',
      inputSchema: { type: 'object', properties: { msg: { type: 'string' } } },
      handler: async (input) => ({
        content: [{ type: 'text', text: `Echo: ${input.msg}` }],
      }),
    });

    const result = await bus.callTool('orch', 'paul', 'echo', { msg: 'Hallo' });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toBe('Echo: Hallo');
  });

  it('gibt Fehler zurück für unbekannte Tools', async () => {
    bus.registerNode('a', 'A', 'terminal');
    bus.registerNode('b', 'B', 'terminal');

    const result = await bus.callTool('a', 'b', 'nonexistent', {});
    expect(result.isError).toBe(true);
  });

  it('findet Knoten mit bestimmtem Tool', () => {
    bus.registerNode('a', 'A', 'terminal');
    bus.registerNode('b', 'B', 'terminal');

    bus.registerTool('a', {
      name: 'read_file',
      description: 'Datei lesen',
      inputSchema: {},
      handler: async () => ({ content: [{ type: 'text', text: '' }] }),
    });

    const found = bus.findNodesWithTool('read_file');
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe('a');
  });

  it('listet alle Tools', () => {
    bus.registerNode('a', 'A', 'terminal');
    bus.registerNode('b', 'B', 'terminal');

    bus.registerTool('a', {
      name: 'tool_a',
      description: 'A',
      inputSchema: {},
      handler: async () => ({ content: [] }),
    });
    bus.registerTool('b', {
      name: 'tool_b',
      description: 'B',
      inputSchema: {},
      handler: async () => ({ content: [] }),
    });

    const allTools = bus.getAllTools();
    expect(allTools).toHaveLength(2);
  });

  it('loggt Bus-Nachrichten', async () => {
    bus.registerNode('a', 'A', 'terminal');
    bus.registerNode('b', 'B', 'terminal');

    bus.registerTool('b', {
      name: 'ping',
      description: 'Ping',
      inputSchema: {},
      handler: async () => ({ content: [{ type: 'text', text: 'pong' }] }),
    });

    await bus.callTool('a', 'b', 'ping', {});
    const log = bus.getMessageLog();
    expect(log).toHaveLength(2); // call + result
    expect(log[0].type).toBe('tool_call');
    expect(log[1].type).toBe('tool_result');
  });

  it('entfernt Knoten', () => {
    bus.registerNode('a', 'A', 'terminal');
    expect(bus.getNodes()).toHaveLength(1);

    bus.unregisterNode('a');
    expect(bus.getNodes()).toHaveLength(0);
  });
});
