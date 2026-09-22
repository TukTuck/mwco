// SPDX-License-Identifier: MIT
/**
 * Electron Main Process – startet das Agent Deck Desktop-Fenster.
 *
 * ## Architektur:
 * - Main Process: Electron Lifecycle, IPC, Tray
 * - Renderer: React App mit Grid-Layout
 * - Backend: SQLite + MCP-Bus + WebSocket-Server + Paul + Orchestrator + Hub
 *
 * ## Hotkey:
 * Ctrl+Shift+P → Pauls Fenster fokussieren / togglen
 */

import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config/Config.js';
import { DatabaseService } from '../database/DatabaseService.js';
import { MCPBus } from '../mcp/MCPBus.js';
import { createTerminalTools, createFileSystemTools, createGitTools } from '../mcp/BuiltinTools.js';
import { TerminalBridge } from '../bridge/TerminalBridge.js';
import { FileSystemBridge } from '../bridge/FileSystemBridge.js';
import { GitBridge } from '../bridge/GitBridge.js';
import { BridgeServer } from '../server/WebSocketServer.js';
import { PaulEngine } from '../paul/PaulEngine.js';
import { OrchestratorEngine } from '../paul/OrchestratorEngine.js';
import { HubService } from '../hub/HubService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let db: DatabaseService;
let bus: MCPBus;
let paul: PaulEngine;
let orchestrator: OrchestratorEngine;
let hub: HubService;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Agent Deck',
    backgroundColor: '#0a0a0a',
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../dist-ui/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── IPC Handler ──────────────────────────────────

function setupIPC(): void {
  // ── Window Controls ──────────────────────────
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:close', () => mainWindow?.close());

  // ── MCP-Bus ──────────────────────────────────
  ipcMain.handle('bus:getNodes', () => {
    return bus.getNodes().map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      color: n.color,
      capabilities: n.capabilities,
    }));
  });

  ipcMain.handle('bus:getAllTools', () => {
    return bus.getAllTools().map((t) => ({
      nodeId: t.nodeId,
      nodeName: t.nodeName,
      toolName: t.tool.name,
      description: t.tool.description,
    }));
  });

  ipcMain.handle('bus:callTool', async (_event: unknown, fromNodeId: string, toNodeId: string, toolName: string, input: Record<string, unknown>) => {
    return bus.callTool(fromNodeId, toNodeId, toolName, input);
  });

  ipcMain.handle('bus:getMessageLog', (_event: unknown, limit?: number) => {
    return bus.getMessageLog(limit);
  });

  // ── Paul (LLM Chat) ──────────────────────────────────
  ipcMain.handle('paul:chat', async (_event: unknown, message: string) => {
    try {
      return await paul.chat(message);
    } catch (err) {
      return {
        role: 'assistant',
        content: `Fehler: ${(err as Error).message}`,
        timestamp: Date.now(),
      };
    }
  });

  ipcMain.handle('paul:getHistory', () => paul.getHistory());
  ipcMain.handle('paul:clearHistory', () => paul.clearHistory());

  ipcMain.handle('paul:transcribe', async (_event: unknown, audioBase64: string) => {
    try {
      const buffer = Buffer.from(audioBase64, 'base64');
      return await paul.transcribe(buffer);
    } catch (err) {
      return `STT-Fehler: ${(err as Error).message}`;
    }
  });

  ipcMain.handle('paul:speak', async (_event: unknown, text: string) => {
    try {
      const audio = await paul.speak(text);
      return audio.toString('base64');
    } catch (err) {
      return null;
    }
  });

  // Paul Events an Renderer weiterleiten
  paul.on('thinking', (msg: string) => {
    mainWindow?.webContents.send('paul:thinking', msg);
  });
  paul.on('message', (msg: unknown) => {
    mainWindow?.webContents.send('paul:message', msg);
  });

  // ── Orchestrator ──────────────────────────────────
  ipcMain.handle('orch:decompose', async (_event: unknown, blueprintText: string) => {
    try {
      return await orchestrator.decompose(blueprintText);
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle('orch:execute', async () => {
    try {
      await orchestrator.execute();
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('orch:getTasks', () => orchestrator.getTasks());

  // Orchestrator Events
  orchestrator.on('status', (msg: string) => {
    mainWindow?.webContents.send('orch:status', msg);
  });
  orchestrator.on('task:update', (task: unknown) => {
    mainWindow?.webContents.send('orch:taskUpdate', task);
  });
  orchestrator.on('completed', (summary: unknown) => {
    mainWindow?.webContents.send('orch:completed', summary);
  });

  // ── Hub/Worker ──────────────────────────────────
  ipcMain.handle('hub:getWorkers', () => hub.getWorkers());
  ipcMain.handle('hub:getTasks', () => hub.getTasks());
  ipcMain.handle('hub:submitTask', (_event: unknown, task: { id: string; title: string; description: string; requiredCapabilities: string[]; payload: Record<string, unknown> }) => {
    return hub.submitTask(task);
  });

  hub.on('worker:online', (worker: unknown) => {
    mainWindow?.webContents.send('hub:workerOnline', worker);
  });
  hub.on('worker:offline', (worker: unknown) => {
    mainWindow?.webContents.send('hub:workerOffline', worker);
  });
  hub.on('task:done', (task: unknown) => {
    mainWindow?.webContents.send('hub:taskDone', task);
  });

  // ── Database – Layouts ──────────────────────────
  ipcMain.handle('db:layouts:list', () => db.layouts.list());
  ipcMain.handle('db:layouts:save', (_event: unknown, layout: { name: string; config: Record<string, unknown> }) => {
    const existing = db.layouts.getByName(layout.name);
    if (existing) {
      db.layouts.update(existing.id, layout.name, layout.config);
    } else {
      db.layouts.create({
        id: `layout-${Date.now()}`,
        name: layout.name,
        config: layout.config,
        isDefault: false,
        metadata: {},
      });
    }
    return db.layouts.list();
  });
  ipcMain.handle('db:layouts:delete', (_event: unknown, id: string) => {
    db.layouts.delete(id);
    return db.layouts.list();
  });

  // ── Database – Sessions ──────────────────────────
  ipcMain.handle('db:sessions:list', () => db.sessions.list());
  ipcMain.handle('db:sessions:messages', (_event: unknown, sessionId: string) => db.messages.getBySession(sessionId));

  // ── Database – Tasks ──────────────────────────
  ipcMain.handle('db:tasks:list', (_event: unknown, status?: string) => {
    if (status) return db.tasks.listByStatus(status as any);
    return db.tasks.listByStatus('working');
  });

  // ── Database – Audit ──────────────────────────
  ipcMain.handle('db:audit:query', (_event: unknown, filter: unknown) => db.audit.query(filter as any));
  ipcMain.handle('db:audit:export', () => db.audit.exportAll());
}

// ── App Lifecycle ──────────────────────────────────

app.whenReady().then(async () => {
  const config = loadConfig();

  // 1. Datenbank starten
  db = new DatabaseService(config);
  db.log('system', 'electron_start', undefined, 'Electron App gestartet');

  // 2. Bridges + MCP-Bus starten
  const terminal = new TerminalBridge(config);
  const filesystem = new FileSystemBridge(config);
  const git = new GitBridge(config, terminal);

  bus = new MCPBus();
  bus.registerNode('paul', 'Paul', 'paul', '🔵');
  bus.registerNode('orchestrator', 'Orchestrator', 'orchestrator', '🟣');

  for (const tool of createTerminalTools(terminal)) bus.registerTool('paul', tool);
  for (const tool of createFileSystemTools(filesystem)) bus.registerTool('paul', tool);
  for (const tool of createGitTools(git)) bus.registerTool('paul', tool);

  // 3. Paul + Orchestrator starten
  paul = new PaulEngine(bus);
  orchestrator = new OrchestratorEngine(bus);

  // 4. Hub Service starten (Port 8766)
  hub = new HubService(8766, db);
  await hub.start();

  // 5. WebSocket-Server für Android-App (Port 8765)
  const server = new BridgeServer(config, db, bus);
  await server.start();

  // 6. IPC + Window
  setupIPC();
  await createWindow();

  // 7. Globaler Hotkey
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
      mainWindow.webContents.send('hotkey:paul');
    }
  });

  db.log('system', 'ready', undefined, 'Alle Services gestartet');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db.log('system', 'electron_stop', undefined, 'App geschlossen');
    hub.stop();
    db.close();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
