// SPDX-License-Identifier: MIT
/**
 * Bridge-Schicht: EIN Modul, über das die UI mit dem Backend spricht.
 * - In Electron: nutzt window.agentDeck (IPC → Main → Services).
 * - Kein Demo-Fallback mehr — liefert leere Listen wenn Backend nicht verfügbar.
 */
import { type LogLine, type Task, type Instance } from './data';

const has = (): boolean =>
  typeof window !== 'undefined' && !!(window as unknown as { agentDeck?: unknown }).agentDeck;

function stubPaul(msg: string): string {
  return `(Stub) Ich habe „${msg}" bekommen. Im echten Modus antwortet hier Qwen 7B lokal.`;
}

function mapLvl(level: string): LogLine['lvl'] {
  const l = (level || '').toLowerCase();
  if (l.includes('err') || l.includes('fehl')) return 'FEHLER';
  if (l.includes('warn')) return 'WARN';
  if (l.includes('ok') || l.includes('succ')) return 'OK';
  return 'INFO';
}
function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}
function mapTaskStatus(s: string): Task['status'] {
  const x = (s || '').toLowerCase();
  if (x.includes('run') || x.includes('läuft') || x.includes('active')) return 'läuft';
  if (x.includes('done') || x.includes('fertig') || x.includes('complet')) return 'fertig';
  if (x.includes('fail') || x.includes('error') || x.includes('fehler')) return 'fehler';
  return 'offen';
}

export const bridge = {
  available: has,

  async paulChat(message: string): Promise<string> {
    if (has()) {
      try {
        const r = await window.agentDeck.paul.chat(message);
        if (r && typeof r.content === 'string' && r.content) return r.content;
      } catch {
        /* fällt durch zum Stub */
      }
    }
    return stubPaul(message);
  },

  async logs(): Promise<LogLine[]> {
    if (has()) {
      try {
        const r = await window.agentDeck.db.audit.query({});
        if (Array.isArray(r) && r.length) {
          return r.slice(0, 50).map((x) => ({
            t: fmtTime(x.timestamp),
            lvl: mapLvl(x.level),
            text: `${x.actor}: ${x.action}${x.target ? ' ' + x.target : ''}${x.details ? ' – ' + x.details : ''}`,
          }));
        }
      } catch { /* leer */ }
    }
    return [];
  },

  async tasks(): Promise<Task[]> {
    if (has()) {
      try {
        const r = await window.agentDeck.orch.getTasks();
        if (Array.isArray(r) && r.length) {
          return r.map((x) => ({
            id: x.id, titel: x.title, status: mapTaskStatus(x.status), worker: x.agentId || '–',
          }));
        }
      } catch { /* leer */ }
      try {
        const r = await window.agentDeck.db.tasks.list();
        if (Array.isArray(r) && r.length) {
          return r.map((x) => ({ id: x.id, titel: x.title, status: mapTaskStatus(x.status), worker: x.agentId || '–' }));
        }
      } catch { /* leer */ }
    }
    return [];
  },

  async workers(): Promise<Instance[]> {
    if (has()) {
      try {
        const r = await window.agentDeck.hub.getWorkers();
        if (Array.isArray(r) && r.length) {
          return r.map((w) => ({
            ip: w.ip || w.hostname, rolle: w.platform || 'worker',
            status: (w.status || '').toLowerCase().includes('on') ? 'AKTIV' : 'WARTUNG',
          }));
        }
      } catch { /* leer */ }
    }
    return [];
  },

  async terminal(command: string): Promise<string> {
    if (has()) {
      try {
        const nodes = await window.agentDeck.bus.getNodes();
        const target = nodes && nodes[0] ? nodes[0].id : 'pc';
        const r = await window.agentDeck.bus.callTool('ui', target, 'terminal.run', { command });
        if (r && Array.isArray(r.content) && r.content[0] && typeof r.content[0].text === 'string') {
          return r.content[0].text;
        }
      } catch { /* leer */ }
    }
    return `$ ${command}\n(Stub) Befehl würde hier über die TerminalBridge laufen.`;
  },
};
