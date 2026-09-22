// SPDX-License-Identifier: MIT
/**
 * Type-Deklarationen für das Agent Deck Frontend.
 */

interface PaulMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  thinking?: string;
  timestamp: number;
  tokensIn?: number;
  tokensOut?: number;
  durationMs?: number;
}

interface AgentDeckAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  bus: {
    getNodes: () => Promise<Array<{ id: string; name: string; type: string; color: string; capabilities: string[] }>>;
    getAllTools: () => Promise<Array<{ nodeId: string; nodeName: string; toolName: string; description: string }>>;
    callTool: (from: string, to: string, tool: string, input: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text?: string }>; isError?: boolean }>;
    getMessageLog: (limit?: number) => Promise<Array<{ from: string; to: string; type: string; payload: Record<string, unknown>; timestamp: number }>>;
  };
  paul: {
    chat: (message: string) => Promise<PaulMessage>;
    getHistory: () => Promise<PaulMessage[]>;
    clearHistory: () => Promise<void>;
    transcribe: (audioBase64: string) => Promise<string>;
    speak: (text: string) => Promise<string | null>;
    onThinking: (callback: (msg: string) => void) => void;
    onMessage: (callback: (msg: PaulMessage) => void) => void;
  };
  orch: {
    decompose: (blueprintText: string) => Promise<{ id: string; name: string; description: string; tasks: Array<{ id: string; title: string; description: string; agentId: string; dependsOn: string[]; status: string }> } | { error: string }>;
    execute: () => Promise<{ success: boolean; error?: string }>;
    getTasks: () => Promise<Array<{ id: string; title: string; status: string; agentId: string; result?: string; error?: string }>>;
    onStatus: (callback: (msg: string) => void) => void;
    onTaskUpdate: (callback: (task: unknown) => void) => void;
    onCompleted: (callback: (summary: { total: number; done: number; failed: number }) => void) => void;
  };
  hub: {
    getWorkers: () => Promise<Array<{ id: string; name: string; hostname: string; ip: string; platform: string; capabilities: Array<{ type: string; name: string }>; status: string; lastSeen: number }>>;
    getTasks: () => Promise<Array<{ id: string; title: string; status: string; assignedWorkerId?: string; result?: unknown; error?: string }>>;
    submitTask: (task: { id: string; title: string; description: string; requiredCapabilities: string[]; payload: Record<string, unknown> }) => Promise<unknown>;
    onWorkerOnline: (callback: (worker: unknown) => void) => void;
    onWorkerOffline: (callback: (worker: unknown) => void) => void;
    onTaskDone: (callback: (task: unknown) => void) => void;
  };
  db: {
    layouts: {
      list: () => Promise<Array<{ id: string; name: string; config: Record<string, unknown>; isDefault: boolean }>>;
      save: (layout: { name: string; config: Record<string, unknown> }) => Promise<Array<{ id: string; name: string; config: Record<string, unknown> }>>;
      delete: (id: string) => Promise<Array<{ id: string; name: string }>>;
    };
    sessions: {
      list: () => Promise<Array<{ id: string; title: string; status: string; createdAt: number; updatedAt: number }>>;
      messages: (sessionId: string) => Promise<PaulMessage[]>;
    };
    tasks: {
      list: (status?: string) => Promise<Array<{ id: string; title: string; status: string; agentId: string }>>;
    };
    audit: {
      query: (filter: unknown) => Promise<Array<{ id: number; timestamp: number; actor: string; action: string; target: string | null; details: string | null; level: string }>>;
      export: () => Promise<Array<{ id: number; timestamp: number; actor: string; action: string; target: string | null; details: string | null; level: string }>>;
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
