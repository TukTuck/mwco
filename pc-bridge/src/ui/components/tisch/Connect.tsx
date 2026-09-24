// SPDX-License-Identifier: MIT
/**
 * Verbindungs-Editor: Linien selbst setzen, benennen, löschen.
 */
import { useEffect, useRef, useState } from 'react';
import { useDeck } from '../../store/deck';
import { CARD_META } from '../../data';

/** Dialog: neue Verbindung benennen. */
export function ConnDialog() {
  const pendingWire = useDeck((s) => s.pendingWire);
  const addConnection = useDeck((s) => s.addConnection);
  const cancelPending = useDeck((s) => s.cancelPending);
  const [label, setLabel] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pendingWire) { setLabel(''); setTimeout(() => ref.current?.focus(), 30); }
  }, [pendingWire]);

  if (!pendingWire) return null;
  const from = CARD_META[pendingWire.from].name;
  const to = CARD_META[pendingWire.to].name;

  return (
    <div className="conn-dialog">
      <div className="cd-title">Verbindung: {from} → {to}</div>
      <input
        ref={ref}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Was fließt hier? (z.B. Tasks, Prompts, Logs)"
        onKeyDown={(e) => { if (e.key === 'Enter') addConnection(label); if (e.key === 'Escape') cancelPending(); }}
      />
      <div className="cd-btns">
        <button className="btn" onClick={cancelPending}>Abbrechen</button>
        <button className="btn primary" onClick={() => addConnection(label)}>Speichern</button>
      </div>
    </div>
  );
}

/** Panel: Verbindungsmodus + Liste (benennen/löschen). */
export function VerbindungenPanel() {
  const panelOpen = useDeck((s) => s.panelOpen);
  const setPanelOpen = useDeck((s) => s.setPanelOpen);
  const connectMode = useDeck((s) => s.connectMode);
  const setConnectMode = useDeck((s) => s.setConnectMode);
  const conns = useDeck((s) => s.conns);
  const pendingFrom = useDeck((s) => s.pendingFrom);
  const removeConnection = useDeck((s) => s.removeConnection);
  const setConnLabel = useDeck((s) => s.setConnLabel);

  if (!panelOpen) return null;

  return (
    <div className="conn-panel">
      <div className="cp-head">
        <span className="cp-title">Verbindungen</span>
        <button className="ctl" onClick={() => setPanelOpen(false)}>✕</button>
      </div>
      <button
        className={`btn wide ${connectMode ? 'primary' : ''}`}
        onClick={() => setConnectMode(!connectMode)}
      >
        {connectMode ? 'Modus: Quelle wählen…' : 'Neue Verbindung'}
      </button>
      {connectMode ? (
        <div className="cp-hint">
          {pendingFrom ? `Quelle: ${CARD_META[pendingFrom].name} – jetzt Ziel klicken.` : 'Klicke erst die Quelle, dann das Ziel.'}
        </div>
      ) : null}
      <div className="cp-list">
        {conns.length === 0 ? <div className="cp-hint">Noch keine Linien.</div> : null}
        {conns.map((c) => (
          <div className="cp-row" key={c.id}>
            <span className="cp-dot" style={{ background: c.color }} />
            <span className="cp-route">{CARD_META[c.from].name} → {CARD_META[c.to].name}</span>
            <input value={c.label} placeholder="Name…" onChange={(e) => setConnLabel(c.id, e.target.value)} />
            <button className="ctl" title="Löschen" onClick={() => removeConnection(c.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
