// SPDX-License-Identifier: MIT
/**
 * Electron Preload Script – sichere Brücke zwischen Main und Renderer.
 *
 * Exponiert nur bestimmte IPC-Kanäle über contextBridge.
 * Der Renderer hat KEINEN direkten Node.js-Zugriff.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('agentDeck', {
  // Window Controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },

  // MCP-Bus
  bus: {
    getNodes: () => ipcRenderer.invoke('bus:getNodes'),
    getAllTools: () => ipcRenderer.invoke('bus:getAllTools'),
    callTool: (fromNodeId: string, toNodeId: string, toolName: string, input: Record<string, unknown>) =>
      ipcRenderer.invoke('bus:callTool', fromNodeId, toNodeId, toolName, input),
    getMessageLog: (limit?: number) => ipcRenderer.invoke('bus:getMessageLog', limit),
    onMessage: (callback: (msg: any) => void) => {
      ipcRenderer.on('bus:message', (_event, msg) => callback(msg));
    },
  },

  // Database
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
      query: (filter: any) => ipcRenderer.invoke('db:audit:query', filter),
      export: () => ipcRenderer.invoke('db:audit:export'),
    },
  },

  // Events vom Main Process
  on: {
    hotkeyPaul: (callback: () => void) => {
      ipcRenderer.on('hotkey:paul', () => callback());
    },
  },
});
