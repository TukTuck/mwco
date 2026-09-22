// SPDX-License-Identifier: MIT
/**
 * Electron Main Process – startet das Agent Deck Desktop-Fenster.
 *
 * ## Architektur:
 * - Main Process: Electron Lifecycle, IPC, Tray
 * - Renderer: React App mit Grid-Layout
 * - Backend: SQLite + MCP-Bus + WebSocket-Server (im gleichen Prozess)
 *
 * ## Hotkey:
 * Ctrl+Shift+P → Pauls Fenster fokussieren / togglen
 */

import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage } from 'electron';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let db: DatabaseService;
let bus: MCPBus;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Agent Deck',
    backgroundColor: '#0a0a0a',
    frame: false, // Custom Titlebar
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Dev oder Production
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
  // Window Controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:close', () => mainWindow?.close());

  // MCP-Bus
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

  ipcMain.handle('bus:callTool', async (_event, fromNodeId: string, toNodeId: string, toolName: string, input: Record<string, unknown>) => {
    return bus.callTool(fromNodeId, toNodeId, toolName, input);
  });

  ipcMain.handle('bus:getMessageLog', (_event, limit?: number) => {
    return bus.getMessageLog(limit);
  });

  // Database – Layouts
  ipcMain.handle('db:layouts:list', () => db.layouts.list());
  ipcMain.handle('db:layouts:save', (_event, layout: any) => {
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
  ipcMain.handle('db:layouts:delete', (_event, id: string) => {
    db.layouts.delete(id);
    return db.layouts.list();
  });

  // Database – Sessions
  ipcMain.handle('db:sessions:list', () => db.sessions.list());
  ipcMain.handle('db:sessions:messages', (_event, sessionId: string) => db.messages.getBySession(sessionId));

  // Database – Tasks
  ipcMain.handle('db:tasks:list', (_event, status?: string) => {
    if (status) return db.tasks.listByStatus(status as any);
    return db.tasks.listByStatus('working');
  });

  // Database – Audit
  ipcMain.handle('db:audit:query', (_event, filter: any) => db.audit.query(filter));
  ipcMain.handle('db:audit:export', () => db.audit.exportAll());
}

// ── App Lifecycle ──────────────────────────────────

app.whenReady().then(async () => {
  const config = loadConfig();

  // Datenbank starten
  db = new DatabaseService(config);
  db.log('system', 'electron_start', undefined, 'Electron App gestartet');

  // Bridges + MCP-Bus starten
  const terminal = new TerminalBridge(config);
  const filesystem = new FileSystemBridge(config);
  const git = new GitBridge(config, terminal);

  bus = new MCPBus();
  bus.registerNode('paul', 'Paul', 'paul', '🔵');
  bus.registerNode('orchestrator', 'Orchestrator', 'orchestrator', '🟣');

  for (const tool of createTerminalTools(terminal)) bus.registerTool('paul', tool);
  for (const tool of createFileSystemTools(filesystem)) bus.registerTool('paul', tool);
  for (const tool of createGitTools(git)) bus.registerTool('paul', tool);

  // WebSocket-Server für Android-App
  const server = new BridgeServer(config, db, bus);
  await server.start();

  // IPC + Window
  setupIPC();
  await createWindow();

  // Globaler Hotkey: Ctrl+Shift+P → Paul fokussieren
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
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db.log('system', 'electron_stop', undefined, 'App geschlossen');
    db.close();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
