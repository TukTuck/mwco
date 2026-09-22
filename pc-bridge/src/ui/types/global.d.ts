// SPDX-License-Identifier: MIT
/**
 * Type-Deklarationen für das Agent Deck Frontend.
 */

interface AgentDeckAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  bus: {
    getNodes: () => Promise<any[]>;
    getAllTools: () => Promise<any[]>;
    callTool: (from: string, to: string, tool: string, input: Record<string, unknown>) => Promise<any>;
    getMessageLog: (limit?: number) => Promise<any[]>;
    onMessage: (callback: (msg: any) => void) => void;
  };
  db: {
    layouts: {
      list: () => Promise<any[]>;
      save: (layout: { name: string; config: Record<string, unknown> }) => Promise<any[]>;
      delete: (id: string) => Promise<any[]>;
    };
    sessions: {
      list: () => Promise<any[]>;
      messages: (sessionId: string) => Promise<any[]>;
    };
    tasks: {
      list: (status?: string) => Promise<any[]>;
    };
    audit: {
      query: (filter: any) => Promise<any[]>;
      export: () => Promise<any[]>;
    };
  };
  on: {
    hotkeyPaul: (callback: () => void) => void;
  };
}

declare global {
  interface Window {
    agentDeck: AgentDeckAPI;
  }
}

export {};
