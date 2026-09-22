// SPDX-License-Identifier: MIT
/**
 * Statische Demo-Daten + Karten-Metadaten für das MWCO-UI.
 * Später durch echte Bridge-Aufrufe (window.agentDeck) ersetzen.
 */
import paulImg from './assets/paul.png';

export type ViewId = 'uebersicht' | 'protokolle' | 'einstellungen' | 'austausch' | 'tasks' | 'zeitplan';
export type CardKey = 'paul' | 'llm' | 'tausch' | 'webchat' | 'terminal' | 'logs' | 'orch';

export interface CardMeta {
  key: CardKey;
  name: string;
  sub: string;
  tag?: string;
  icon: string;
  color: string;
  w: number;
  h: number;
  img?: string;
}

export const CARD_META: Record<CardKey, CardMeta> = {
  paul:     { key: 'paul',     name: 'Paul',         sub: 'MCP-Bridge · Qwen 7B',  tag: 'MCP',      icon: 'P',  color: 'var(--paul)',     w: 470, h: 470, img: paulImg },
  llm:      { key: 'llm',      name: 'LLM-Routen',   sub: 'lokal + API · Router',  tag: 'router',   icon: '',   color: 'var(--paul)',     w: 450, h: 440, img: paulImg },
  tausch:   { key: 'tausch',   name: 'Austausch',    sub: '6/7 Instanzen aktiv',   tag: 'mesh',     icon: '⇄',  color: 'var(--tausch)',   w: 470, h: 370 },
  webchat:  { key: 'webchat',  name: 'WebChat',      sub: 'Claude · kein MCP',     tag: 'kein MCP', icon: '◈',  color: 'var(--webchat)',  w: 420, h: 340 },
  terminal: { key: 'terminal', name: 'Terminal',     sub: 'bash · ~/mwco',                        icon: '>_', color: 'var(--terminal)', w: 440, h: 300 },
  logs:     { key: 'logs',     name: 'Logs',         sub: 'live · alle Streams',                  icon: '≡',  color: 'var(--logs)',     w: 430, h: 320 },
  orch:     { key: 'orch',     name: 'Orchestrator', sub: 'Qwen 1.5B · 4 Tasks',   tag: '1.5B',     icon: '✦',  color: 'var(--orch)',     w: 430, h: 320 },
};

export const INITIAL_CARDS: Array<{ key: CardKey; x: number; y: number }> = [
  { key: 'paul', x: 90, y: 100 },
  { key: 'llm', x: 260, y: 140 },
  { key: 'tausch', x: 520, y: 70 },
  { key: 'webchat', x: 800, y: 170 },
  { key: 'terminal', x: 260, y: 380 },
  { key: 'logs', x: 580, y: 390 },
  { key: 'orch', x: 870, y: 410 },
];

export interface WireDef { from: CardKey; to: CardKey; color: string }
export const INITIAL_WIRES: WireDef[] = [
  { from: 'llm', to: 'paul', color: 'var(--paul)' },
  { from: 'llm', to: 'orch', color: 'var(--orch)' },
  { from: 'paul', to: 'orch', color: 'var(--orch)' },
  { from: 'orch', to: 'terminal', color: 'var(--terminal)' },
  { from: 'paul', to: 'tausch', color: 'var(--tausch)' },
  { from: 'orch', to: 'logs', color: 'var(--logs)' },
];

export interface LogLine { t: string; lvl: 'INFO' | 'OK' | 'WARN' | 'FEHLER'; text: string }
export const LOGS: LogLine[] = [
  { t: '11:14:02', lvl: 'INFO', text: 'austausch: ping 45.148.10.99:443 (132ms ok)' },
  { t: '11:14:05', lvl: 'OK',   text: 'paul: modell geladen (7B Q4_K_M, 4.5GB VRAM)' },
  { t: '11:14:07', lvl: 'INFO', text: 'mcp.bus: 9 tools registriert' },
  { t: '11:14:11', lvl: 'WARN', text: 'orch: vram 91% – swap-kandidat geprüft' },
  { t: '11:14:16', lvl: 'INFO', text: 'task.004 dispatch an worker "desk-2"' },
  { t: '11:14:21', lvl: 'OK',   text: 'hub: tailscale-tunnel stabil (2 worker)' },
  { t: '11:14:30', lvl: 'FEHLER', text: 'webchat→gpt: 502 upstream, route pausiert' },
  { t: '11:14:33', lvl: 'INFO', text: 'logs: export bereit (audit_log, 214 zeilen)' },
];

export interface Instance { ip: string; rolle: string; status: 'AKTIV' | 'WARTUNG' }
export const INSTANCES: Instance[] = [
  { ip: '185.220.101.7',  rolle: 'relay',  status: 'AKTIV' },
  { ip: '45.148.10.99',   rolle: 'exit',   status: 'AKTIV' },
  { ip: '94.130.110.143', rolle: 'relay',  status: 'WARTUNG' },
  { ip: '116.202.95.16',  rolle: 'bridge', status: 'AKTIV' },
  { ip: '142.132.166.12', rolle: 'relay',  status: 'AKTIV' },
  { ip: '65.108.199.93',  rolle: 'exit',   status: 'AKTIV' },
  { ip: '135.181.94.12',  rolle: 'bridge', status: 'WARTUNG' },
];

export interface Kontakt { name: string; addr: string; status: 'AKTIV' | 'OFFLINE' }
export const KONTAKTE: Kontakt[] = [
  { name: 'desk-2',    addr: 'privacyssystem-htbp2a…k3', status: 'AKTIV' },
  { name: 'notebook',  addr: 'privacyssystem-htbp7c…m1', status: 'AKTIV' },
  { name: 'vps-hel',   addr: 'privacy-system-htbp9d…q8', status: 'OFFLINE' },
];

export interface Route { route: string; ziel: string; status: 'AKTIV' | 'KEIN KEY' | 'WARTET' }
export const ROUTES: Route[] = [
  { route: 'paul → 7B lokal',    ziel: 'llama.cpp',    status: 'AKTIV' },
  { route: 'orch → 1.5B lokal',  ziel: 'llama.cpp',    status: 'AKTIV' },
  { route: 'webchat → claude',   ziel: 'api · key ✓',  status: 'AKTIV' },
  { route: 'webchat → gpt',      ziel: 'api · key ✗',  status: 'KEIN KEY' },
  { route: 'stt → whisper',      ziel: 'whisper.cpp',  status: 'WARTET' },
  { route: 'tts → piper',        ziel: 'piper',        status: 'AKTIV' },
];

export interface Task { id: string; titel: string; status: 'läuft' | 'offen' | 'fertig' | 'fehler'; worker: string }
export const TASKS: Task[] = [
  { id: 'task.001', titel: 'Repo clonen + branch prüfen',        status: 'fertig', worker: 'desk-2' },
  { id: 'task.002', titel: 'SQLite-Schema migrieren',            status: 'fertig', worker: 'desk-2' },
  { id: 'task.003', titel: 'MCP-Bus mit 9 Tools registrieren',   status: 'läuft',  worker: 'lokal' },
  { id: 'task.004', titel: 'UI-Layout in layouts-Tabelle legen', status: 'offen',  worker: '–' },
];

export interface Plan { zeit: string; was: string; an: boolean }
export const ZEITPLAN: Plan[] = [
  { zeit: '03:00', was: 'Logs rotieren + exportieren', an: true },
  { zeit: '06:00', was: 'Modelle neu laden (VRAM aufräumen)', an: true },
  { zeit: '*/30',  was: 'Mesh-Instanzen pingen', an: true },
  { zeit: '22:00', was: 'Tageszusammenfassung durch Orchestrator', an: false },
];

export interface Suggestion { icon: string; color: string; text: string; art: 'tool' | 'paul' }
export const SUGGESTIONS: Suggestion[] = [
  { icon: '>_', color: 'var(--terminal)', text: 'Öffne Terminal in ~/mwco', art: 'tool' },
  { icon: '✦', color: 'var(--orch)',     text: 'Zeig laufende Tasks vom Orchestrator', art: 'paul' },
  { icon: 'P', color: 'var(--paul)',     text: 'VRAM-Status: was läuft gerade?', art: 'paul' },
  { icon: '⇄', color: 'var(--tausch)',   text: 'Austausch: welche Instanzen sind aktiv?', art: 'paul' },
  { icon: '◈', color: 'var(--webchat)',  text: 'Neues WebChat-Fenster (Claude)', art: 'tool' },
  { icon: '≡', color: 'var(--logs)',     text: 'Exportiere Logs als Datei', art: 'tool' },
];
