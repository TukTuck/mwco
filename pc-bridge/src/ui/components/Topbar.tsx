// SPDX-License-Identifier: MIT
import { useDeck } from '../store/deck';
import type { ViewId } from '../data';
import paulImg from '../assets/paul.png';

const TITLES: Record<ViewId, [string, string]> = {
  uebersicht: ['Übersicht', 'Freier Kartentisch · zoomen, pannen, Karten ziehen'],
  protokolle: ['Protokolle', 'Alle Streams · exportierbar'],
  einstellungen: ['Einstellungen', 'Modelle, Keys, Hotkeys, Verbindung'],
  austausch: ['Austausch', 'Mesh-Instanzen & Kontakte'],
  tasks: ['Tasks', 'Orchestrator-Blueprints & Worker'],
  zeitplan: ['Zeitplan', 'Wiederkehrende Abläufe'],
};

export function Topbar() {
  const view = useDeck((s) => s.view);
  const zoom = useDeck((s) => s.zoom);
  const setZoom = useDeck((s) => s.setZoom);
  const connUrl = useDeck((s) => s.connUrl);
  const setConnUrl = useDeck((s) => s.setConnUrl);
  const connected = useDeck((s) => s.connected);
  const connect = useDeck((s) => s.connect);
  const setLauncher = useDeck((s) => s.setLauncher);
  const panelOpen = useDeck((s) => s.panelOpen);
  const setPanelOpen = useDeck((s) => s.setPanelOpen);

  const zoomBy = (f: number) => {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const s2 = Math.max(0.25, Math.min(2.5, zoom.s * f));
    const k = s2 / zoom.s;
    setZoom({ x: cx - k * (cx - zoom.x), y: cy - k * (cy - zoom.y), s: s2 });
  };

  return (
    <header className="topbar">
      <div className="tb-title">
        <div className="t1">{TITLES[view][0]}</div>
        <div className="t2">{TITLES[view][1]}</div>
      </div>
      <div className="grow" />
      {view === 'uebersicht' ? (
        <div className="tb-zoom">
          <button onClick={() => zoomBy(1 / 1.2)}>−</button>
          <span className="pct" onClick={() => zoomBy(1 / zoom.s)}>{Math.round(zoom.s * 100)}%</span>
          <button onClick={() => zoomBy(1.2)}>＋</button>
          <button onClick={() => setZoom({ x: 0, y: 0, s: 1 })}>⌂</button>
        </div>
      ) : null}
      {view === 'uebersicht' ? (
        <button className={`conn-btn${panelOpen ? ' on' : ''}`} onClick={() => setPanelOpen(!panelOpen)}>Linien</button>
      ) : null}
      <div className="tb-conn">
        <input value={connUrl} onChange={(e) => setConnUrl(e.target.value)} spellCheck={false} />
        <button className={`conn-btn${connected ? ' on' : ''}`} onClick={connect}>
          {connected ? 'Verbunden' : 'Verbinden'}
        </button>
      </div>
      <button className="paul-btn" onClick={() => setLauncher(true)}>
        <img src={paulImg} alt="" />Paul<kbd>Ctrl ⇧ P</kbd>
      </button>
    </header>
  );
}
