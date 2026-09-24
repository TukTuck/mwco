// SPDX-License-Identifier: MIT
/**
 * Electron Preload Script – sichere Brücke zwischen Main und Renderer.
 *
 * Exponiert nur bestimmte IPC-Kanäle über contextBridge.
 * Der Renderer hat KEINEN direkten Node.js-Zugriff.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('agentDeck', {
  // ── Window Controls ──────────────────────────
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },

  // ── MCP-Bus ──────────────────────────
  bus: {
    getNodes: () => ipcRenderer.invoke('bus:getNodes'),
    getAllTools: () => ipcRenderer.invoke('bus:getAllTools'),
    callTool: (fromNodeId: string, toNodeId: string, toolName: string, input: Record<string, unknown>) =>
      ipcRenderer.invoke('bus:callTool', fromNodeId, toNodeId, toolName, input),
    getMessageLog: (limit?: number) => ipcRenderer.invoke('bus:getMessageLog', limit),
  },

  // ── Paul (LLM Chat) ──────────────────────────
  paul: {
    chat: (message: string) => ipcRenderer.invoke('paul:chat', message),
    getHistory: () => ipcRenderer.invoke('paul:getHistory'),
    clearHistory: () => ipcRenderer.invoke('paul:clearHistory'),
    transcribe: (audioBase64: string) => ipcRenderer.invoke('paul:transcribe', audioBase64),
    speak: (text: string) => ipcRenderer.invoke('paul:speak', text),
    onThinking: (callback: (msg: string) => void) => {
      ipcRenderer.on('paul:thinking', (_event, msg) => callback(msg));
    },
    onMessage: (callback: (msg: unknown) => void) => {
      ipcRenderer.on('paul:message', (_event, msg) => callback(msg));
    },
  },

  // ── Orchestrator ──────────────────────────
  orch: {
    decompose: (blueprintText: string) => ipcRenderer.invoke('orch:decompose', blueprintText),
    execute: () => ipcRenderer.invoke('orch:execute'),
    getTasks: () => ipcRenderer.invoke('orch:getTasks'),
    onStatus: (callback: (msg: string) => void) => {
      ipcRenderer.on('orch:status', (_event, msg) => callback(msg));
    },
    onTaskUpdate: (callback: (task: unknown) => void) => {
      ipcRenderer.on('orch:taskUpdate', (_event, task) => callback(task));
    },
    onCompleted: (callback: (summary: unknown) => void) => {
      ipcRenderer.on('orch:completed', (_event, summary) => callback(summary));
    },
  },

  // ── Hub/Worker ──────────────────────────
  hub: {
    getWorkers: () => ipcRenderer.invoke('hub:getWorkers'),
    getTasks: () => ipcRenderer.invoke('hub:getTasks'),
    submitTask: (task: { id: string; title: string; description: string; requiredCapabilities: string[]; payload: Record<string, unknown> }) =>
      ipcRenderer.invoke('hub:submitTask', task),
    onWorkerOnline: (callback: (worker: unknown) => void) => {
      ipcRenderer.on('hub:workerOnline', (_event, worker) => callback(worker));
    },
    onWorkerOffline: (callback: (worker: unknown) => void) => {
      ipcRenderer.on('hub:workerOffline', (_event, worker) => callback(worker));
    },
    onTaskDone: (callback: (task: unknown) => void) => {
      ipcRenderer.on('hub:taskDone', (_event, task) => callback(task));
    },
  },

  // ── Database ──────────────────────────
  db: {
    layouts: {
      list: () => ipcRenderer.invoke('db:layouts:list'),
      save: (layout: { name: string; config: Record<string, unknown> }) =>
        ipcRenderer.invoke('db:layouts:save', layout),
      delete: (id: string) => ipcRenderer.invoke('db:layouts:delete', id),
    },
    sessions: {
      list: () => ipcRenderer.invoke('db:sessions:list'),
      messages: (sessionId: string) => ipcRenderer.invoke('db:sessions:messages', sessionId),
    },
    tasks: {
      list: (status?: string) => ipcRenderer.invoke('db:tasks:list', status),
    },
    audit: {
      query: (filter: unknown) => ipcRenderer.invoke('db:audit:query', filter),
      export: () => ipcRenderer.invoke('db:audit:export'),
    },
  },

  // ── Events vom Main Process ──────────────────────────
  on: {
    hotkeyPaul: (callback: () => void) => {
      ipcRenderer.on('hotkey:paul', () => callback());
    },
  },
});
