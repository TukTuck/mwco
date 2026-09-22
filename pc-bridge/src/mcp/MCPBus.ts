// SPDX-License-Identifier: MIT
/**
 * MCP-Bus – Kommunikations-Schicht zwischen Fenstern und Agenten.
 *
 * ## Architektur (inspiriert von Terminal Grid VS Code Extension):
 * - Jedes Fenster hat einen eigenen MCP-Server (Knoten)
 * - Paul verbindet sich mit allen MCP-Servern
 * - Der Orchestrator verbindet sich mit relevanten MCP-Servern
 * - Fenster kommunizieren NIE direkt, nur über den Bus
 * - WebChat-Fenster sind NUR Chat-Interfaces, KEIN MCP-Zugriff
 *
 * ## Transport:
 * In-Process (Stdio-Emulation) für lokale Knoten.
 * WebSocket für entfernte Knoten (Hub/Worker).
 *
 * ## Tools:
 * Jeder Knoten kann Tools registrieren. Andere Knoten rufen sie über den Bus auf.
 * Beispiel: Paul registriert "execute_terminal", ein anderes Fenster ruft es auf.
 */

import { EventEmitter } from 'node:events';

// ── Typen ──────────────────────────────────

export interface MCPNode {
  id: string;
  name: string;
  type: 'paul' | 'orchestrator' | 'terminal' | 'webchat' | 'log' | 'custom';
  color?: string;
  capabilities: string[];
  tools: Map<string, MCPTool>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: Record<string, unknown>) => Promise<MCPToolResult>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface BusMessage {
  from: string;
  to: string;
  type: 'tool_call' | 'tool_result' | 'event' | 'broadcast';
  payload: Record<string, unknown>;
  timestamp: number;
}

// ── MCP-Bus ──────────────────────────────────

export class MCPBus extends EventEmitter {
  private nodes = new Map<string, MCPNode>();
  private messageLog: BusMessage[] = [];
  private maxLogSize = 10000;

  /**
   * Registriert einen neuen Knoten im Bus.
   */
  registerNode(id: string, name: string, type: MCPNode['type'], color?: string): MCPNode {
    if (this.nodes.has(id)) {
      throw new Error(`Knoten "${id}" existiert bereits`);
    }

    const node: MCPNode = {
      id,
      name,
      type,
      color,
      capabilities: [],
      tools: new Map(),
    };

    this.nodes.set(id, node);
    this.emit('node:registered', node);
    return node;
  }

  /**
   * Entfernt einen Knoten vom Bus.
   */
  unregisterNode(id: string): void {
    const node = this.nodes.get(id);
    if (node) {
      this.nodes.delete(id);
      this.emit('node:unregistered', node);
    }
  }

  /**
   * Registriert ein Tool bei einem Knoten.
   */
  registerTool(nodeId: string, tool: MCPTool): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Knoten "${nodeId}" nicht gefunden`);
    }

    node.tools.set(tool.name, tool);
    node.capabilities = [...node.tools.keys()];
    this.emit('tool:registered', { nodeId, tool: tool.name });
  }

  /**
   * Entfernt ein Tool von einem Knoten.
   */
  unregisterTool(nodeId: string, toolName: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.tools.delete(toolName);
      node.capabilities = [...node.tools.keys()];
    }
  }

  /**
   * Ruft ein Tool auf einem anderen Knoten auf.
   * Das ist der Kern der Bus-Kommunikation.
   */
  async callTool(fromNodeId: string, toNodeId: string, toolName: string, input: Record<string, unknown>): Promise<MCPToolResult> {
    const fromNode = this.nodes.get(fromNodeId);
    const toNode = this.nodes.get(toNodeId);

    if (!fromNode) throw new Error(`Aufrufender Knoten "${fromNodeId}" nicht gefunden`);
    if (!toNode) throw new Error(`Ziel-Knoten "${toNodeId}" nicht gefunden`);

    const tool = toNode.tools.get(toolName);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Tool "${toolName}" nicht gefunden auf Knoten "${toNodeId}"` }],
        isError: true,
      };
    }

    // Nachricht loggen
    const callMessage: BusMessage = {
      from: fromNodeId,
      to: toNodeId,
      type: 'tool_call',
      payload: { tool: toolName, input },
      timestamp: Date.now(),
    };
    this.logMessage(callMessage);

    // Tool ausführen
    try {
      const result = await tool.handler(input);

      const resultMessage: BusMessage = {
        from: toNodeId,
        to: fromNodeId,
        type: 'tool_result',
        payload: { tool: toolName, result },
        timestamp: Date.now(),
      };
      this.logMessage(resultMessage);

      return result;
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Fehler: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }

  /**
   * Broadcast an alle Knoten (z.B. für Status-Updates).
   */
  broadcast(fromNodeId: string, event: string, data: Record<string, unknown>): void {
    const message: BusMessage = {
      from: fromNodeId,
      to: '*',
      type: 'broadcast',
      payload: { event, data },
      timestamp: Date.now(),
    };
    this.logMessage(message);
    this.emit('broadcast', message);
  }

  /**
   * Gibt alle registrierten Knoten zurück.
   */
  getNodes(): MCPNode[] {
    return [...this.nodes.values()];
  }

  /**
   * Gibt einen bestimmten Knoten zurück.
   */
  getNode(id: string): MCPNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Gibt alle verfügbaren Tools über alle Knoten hinweg zurück.
   */
  getAllTools(): Array<{ nodeId: string; nodeName: string; tool: MCPTool }> {
    const tools: Array<{ nodeId: string; nodeName: string; tool: MCPTool }> = [];
    for (const node of this.nodes.values()) {
      for (const tool of node.tools.values()) {
        tools.push({ nodeId: node.id, nodeName: node.name, tool });
      }
    }
    return tools;
  }

  /**
   * Findet Knoten die ein bestimmtes Tool anbieten.
   */
  findNodesWithTool(toolName: string): MCPNode[] {
    return [...this.nodes.values()].filter((node) => node.tools.has(toolName));
  }

  /**
   * Gibt das Message-Log zurück (für den Log-Viewer).
   */
  getMessageLog(limit: number = 100): BusMessage[] {
    return this.messageLog.slice(-limit);
  }

  private logMessage(message: BusMessage): void {
    this.messageLog.push(message);
    if (this.messageLog.length > this.maxLogSize) {
      this.messageLog = this.messageLog.slice(-this.maxLogSize / 2);
    }
    this.emit('message', message);
  }
}
