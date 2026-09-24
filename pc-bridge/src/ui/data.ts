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
export const LOGS: LogLine[] = [];

export interface Instance { ip: string; rolle: string; status: 'AKTIV' | 'WARTUNG' }
export const INSTANCES: Instance[] = [];

export interface Kontakt { name: string; addr: string; status: 'AKTIV' | 'OFFLINE' }
export const KONTAKTE: Kontakt[] = [];

export interface Route { route: string; ziel: string; status: 'AKTIV' | 'KEIN KEY' | 'WARTET' }
export const ROUTES: Route[] = [];

export interface Task { id: string; titel: string; status: 'läuft' | 'offen' | 'fertig' | 'fehler'; worker: string }
export const TASKS: Task[] = [];

export interface Plan { zeit: string; was: string; an: boolean }
export const ZEITPLAN: Plan[] = [];

export interface Suggestion { icon: string; color: string; text: string; art: 'tool' | 'paul' }
export const SUGGESTIONS: Suggestion[] = [];
