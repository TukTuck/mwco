// SPDX-License-Identifier: MIT
import { LOGS } from '../data';
import { bridge } from '../bridge';
import { useBridge } from '../useBridge';

export function ProtokolleView() {
  const rows = useBridge(() => bridge.logs(), LOGS);
  const exportLogs = () => {
    const text = rows.map((l) => `[${l.t}] ${l.lvl.padEnd(6)} ${l.text}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mwco-protokolle.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="view">
      <div className="view-head">
        <span className="vh-note">{rows.length} Zeilen · live</span>
        <button className="btn" onClick={exportLogs}>Exportieren</button>
      </div>
      <div className="panel">
        <div className="logs big">
          {rows.map((l, i) => (
            <div key={i}>
              <span className="ts">{l.t}</span>
              <span className={`lvl ${l.lvl.toLowerCase()}`}>{l.lvl}</span>
              {l.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
