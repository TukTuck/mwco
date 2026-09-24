// SPDX-License-Identifier: MIT
import { LayoutGrid, ScrollText, Settings, ArrowLeftRight, ListTodo, CalendarClock } from 'lucide-react';
import { useDeck } from '../store/deck';
import type { ViewId } from '../data';
import paulImg from '../assets/paul.png';

const ITEMS: Array<{ id: ViewId; label: string; icon: typeof LayoutGrid; sep?: boolean }> = [
  { id: 'uebersicht', label: 'Übersicht', icon: LayoutGrid },
  { id: 'protokolle', label: 'Protokolle', icon: ScrollText },
  { id: 'einstellungen', label: 'Einstellungen', icon: Settings },
  { id: 'austausch', label: 'Austausch', icon: ArrowLeftRight, sep: true },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'zeitplan', label: 'Zeitplan', icon: CalendarClock },
];

export function Sidebar() {
  const view = useDeck((s) => s.view);
  const setView = useDeck((s) => s.setView);
  return (
    <aside className="sidebar">
      <div className="sb-head">
        <div className="sb-title">MWCO</div>
        <div className="sb-sub">Kartentisch · Control & Orchestration</div>
      </div>
      <nav className="sb-nav">
        {ITEMS.map((it) => (
          <div key={it.id}>
            {it.sep ? <div className="sb-sep" /> : null}
            <button className={`sb-item${view === it.id ? ' on' : ''}`} onClick={() => setView(it.id)}>
              <it.icon size={15} />
              <span>{it.label}</span>
            </button>
          </div>
        ))}
      </nav>
      <div className="sb-profile">
        <img src={paulImg} alt="Paul" />
        <div>
          <div className="pn">Paul</div>
          <div className="ps">Qwen 7B · MCP aktiv</div>
          <div className="ps dim">› Verbindung stabil. 9 Tools. Bereit.</div>
        </div>
      </div>
    </aside>
  );
}
