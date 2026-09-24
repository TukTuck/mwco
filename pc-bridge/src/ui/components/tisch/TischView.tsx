// SPDX-License-Identifier: MIT
/**
 * Kartentisch: zoom-/pannbare Fläche, Karten (3 Stufen), Fenster,
 * Verbindungslinien (selbst setz- & benennbar) + Verbindungs-Editor.
 */
import { useEffect, useRef } from 'react';
import type { CSSProperties, PointerEvent as RPointerEvent } from 'react';
import { useDeck, type CardState, type WinState } from '../../store/deck';
import { CARD_META } from '../../data';
import { CardRows, CardFull } from './CardBody';
import { ConnDialog, VerbindungenPanel } from './Connect';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function TischView() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const wireRefs = useRef<Array<SVGPathElement | null>>([]);
  const cards = useDeck((s) => s.cards);
  const wins = useDeck((s) => s.wins);
  const conns = useDeck((s) => s.conns);
  const zoom = useDeck((s) => s.zoom);
  const activeWire = useDeck((s) => s.activeWire);
  const setZoom = useDeck((s) => s.setZoom);
  const setActiveWire = useDeck((s) => s.setActiveWire);
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const z = useDeck.getState().zoom;
      const s2 = clamp(z.s * Math.exp(-e.deltaY * 0.0012), 0.25, 2.5);
      const k = s2 / z.s;
      useDeck.getState().setZoom({ x: px - k * (px - z.x), y: py - k * (py - z.y), s: s2 });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Linien neu berechnen bei jeder Änderung
  useEffect(() => {
    const root = canvasRef.current;
    if (!root) return;
    conns.forEach((w, i) => {
      const p = wireRefs.current[i];
      const a = root.querySelector<HTMLElement>(`.tile[data-key="${w.from}"]`);
      const b = root.querySelector<HTMLElement>(`.tile[data-key="${w.to}"]`);
      if (!p) return;
      if (!a || !b) { p.style.display = 'none'; return; }
      p.style.display = '';
      const aw = a.offsetWidth, ah = a.offsetHeight, bw = b.offsetWidth, bh = b.offsetHeight;
      const ax = a.offsetLeft, ay = a.offsetTop, bx = b.offsetLeft, by = b.offsetTop;
      const acx = ax + aw / 2, bcx = bx + bw / 2;
      let sx: number, tx: number;
      if (bcx >= acx) { sx = ax + aw; tx = bx; } else { sx = ax; tx = bx + bw; }
      const sy = ay + ah / 2, ty = by + bh / 2;
      const dx = clamp(Math.abs(tx - sx) * 0.4, 30, 120);
      const dir = tx >= sx ? 1 : -1;
      p.setAttribute('d', `M ${sx} ${sy} C ${sx + dx * dir} ${sy}, ${tx - dx * dir} ${ty}, ${tx} ${ty}`);
    });
  });

  // Aktivität: zufällige Linie fließt
  useEffect(() => {
    const t = setInterval(() => {
      const root = canvasRef.current;
      const cs = useDeck.getState().conns;
      if (!root || !cs.length) return;
      const vis = cs
        .map((w, i) => ({ i, ok: !!root.querySelector(`.tile[data-key="${w.from}"]`) && !!root.querySelector(`.tile[data-key="${w.to}"]`) }))
        .filter((v) => v.ok);
      if (!vis.length) return;
      const pick = vis[Math.floor(Math.random() * vis.length)].i;
      setActiveWire(pick);
      setTimeout(() => setActiveWire(-1), 1500);
    }, 2200);
    return () => clearInterval(t);
  }, [setActiveWire]);

  const onPanDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.target !== canvasRef.current) return;
    panRef.current = { sx: e.clientX, sy: e.clientY, ox: zoom.x, oy: zoom.y };
    e.currentTarget.classList.add('panning');
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPanMove = (e: RPointerEvent<HTMLDivElement>) => {
    const p = panRef.current;
    if (!p) return;
    setZoom({ ...zoom, x: p.ox + (e.clientX - p.sx), y: p.oy + (e.clientY - p.sy) });
  };
  const onPanUp = (e: RPointerEvent<HTMLDivElement>) => {
    panRef.current = null;
    e.currentTarget.classList.remove('panning');
  };

  return (
    <div
      ref={canvasRef}
      className="canvas"
      onPointerDown={onPanDown}
      onPointerMove={onPanMove}
      onPointerUp={onPanUp}
      style={{
        backgroundSize: `${24 * zoom.s}px ${24 * zoom.s}px`,
        backgroundPosition: `${zoom.x}px ${zoom.y}px`,
      }}
    >
      <div className="world" style={{ transform: `translate(${zoom.x}px,${zoom.y}px) scale(${zoom.s})` }}>
        <svg className="wires" width={5000} height={5000}>
          {conns.map((w, i) => (
            <path
              key={w.id}
              ref={(el) => { wireRefs.current[i] = el; }}
              className={activeWire === i ? 'flow' : ''}
              style={{ '--wc': w.color } as CSSProperties}
            />
          ))}
        </svg>
        {cards.map((c) => <Tile key={c.key} card={c} />)}
      </div>
      {wins.map((w) => <Win key={w.id} win={w} />)}
      <ConnDialog />
      <VerbindungenPanel />
    </div>
  );
}

function Tile({ card }: { card: CardState }) {
  const meta = CARD_META[card.key];
  const moveCard = useDeck((s) => s.moveCard);
  const toggleOpen = useDeck((s) => s.toggleOpen);
  const toWindow = useDeck((s) => s.toWindow);
  const connectMode = useDeck((s) => s.connectMode);
  const pendingFrom = useDeck((s) => s.pendingFrom);
  const clickConnect = useDeck((s) => s.clickConnect);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (connectMode) return; // im Connect-Modus nicht ziehen
    e.stopPropagation();
    drag.current = { sx: e.clientX, sy: e.clientY, ox: card.x, oy: card.y, moved: false };
    e.currentTarget.classList.add('dragging');
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const s = useDeck.getState().zoom.s;
    if (Math.abs(e.clientX - d.sx) > 4 || Math.abs(e.clientY - d.sy) > 4) d.moved = true;
    moveCard(card.key, d.ox + (e.clientX - d.sx) / s, d.oy + (e.clientY - d.sy) / s);
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    e.currentTarget.classList.remove('dragging');
    if (d && d.moved) {
      const canvas = e.currentTarget.closest('.canvas');
      if (canvas) {
        const r = canvas.getBoundingClientRect();
        const inside = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
        if (!inside) { toWindow(card.key, e.clientX, e.clientY); return; }
      }
    }
  };

  const cls = ['tile'];
  if (card.open) cls.push('open');
  if (connectMode) cls.push('connect');
  if (connectMode && pendingFrom === card.key) cls.push('src');

  return (
    <div
      className={cls.join(' ')}
      data-key={card.key}
      style={{ left: card.x, top: card.y, '--c': meta.color } as CSSProperties}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onDoubleClick={() => { if (!connectMode) toggleOpen(card.key); }}
      onClick={() => { if (connectMode) clickConnect(card.key); }}
    >
      {card.open ? (
        <>
          <div className="head">
            <div className="icon">{meta.img ? <img src={meta.img} alt="" /> : meta.icon}</div>
            <div className="name">{meta.name}</div>
            {meta.tag ? <div className="tag">{meta.tag}</div> : null}
          </div>
          <div className="info">{meta.sub}</div>
          <div className="rows"><CardRows k={card.key} /></div>
          <div className="note">Doppelklick = zu · rausziehen = Fenster</div>
        </>
      ) : (
        <>
          <div className="icon">{meta.img ? <img src={meta.img} alt="" /> : meta.icon}</div>
          <div className="name">{meta.name}</div>
        </>
      )}
    </div>
  );
}

function Win({ win }: { win: WinState }) {
  const meta = CARD_META[win.key];
  const moveWin = useDeck((s) => s.moveWin);
  const dockWin = useDeck((s) => s.dockWin);
  const closeWin = useDeck((s) => s.closeWin);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.ctl') || (e.target as HTMLElement).closest('input')) return;
    drag.current = { sx: e.clientX, sy: e.clientY, ox: win.x, oy: win.y };
    e.currentTarget.closest('.win')!.classList.add('dragging');
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    moveWin(win.id, d.ox + (e.clientX - d.sx), d.oy + (e.clientY - d.sy));
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    e.currentTarget.closest('.win')?.classList.remove('dragging');
    if (!d) return;
    const canvas = document.querySelector('.canvas');
    if (canvas) {
      const r = canvas.getBoundingClientRect();
      if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) {
        const z = useDeck.getState().zoom;
        dockWin(win.id, (e.clientX - r.left - z.x) / z.s - 48, (e.clientY - r.top - z.y) / z.s - 48);
      }
    }
  };

  return (
    <div className="win" style={{ left: win.x, top: win.y, width: meta.w, height: meta.h, '--c': meta.color } as CSSProperties}>
      <div className="win-head" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
        <div className="sw" />
        <div className="title">{meta.name}</div>
        {meta.tag ? <div className="tag">{meta.tag}</div> : null}
        <div className="grow" />
        <div className="ctl" title="Zurück als Karte" onClick={() => dockWin(win.id, 80 + Math.random() * 200, 80 + Math.random() * 160)}>▣</div>
        <div className="ctl" title="Schließen" onClick={() => closeWin(win.id)}>✕</div>
      </div>
      <div className="win-body"><CardFull k={win.key} /></div>
    </div>
  );
}
