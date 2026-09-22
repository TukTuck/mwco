// SPDX-License-Identifier: MIT
import { useState } from 'react';
import { ZEITPLAN } from '../data';

export function ZeitplanView() {
  const [rows, setRows] = useState(ZEITPLAN);
  return (
    <div className="view">
      <div className="view-head"><span className="vh-note">Wiederkehrende Abläufe · cron-artig</span></div>
      <div className="panel">
        {rows.map((r, i) => (
          <div className="taskrow" key={i}>
            <span className="tid mono">{r.zeit}</span>
            <span className="tt">{r.was}</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={r.an}
                onChange={() => setRows(rows.map((x, j) => (j === i ? { ...x, an: !x.an } : x)))}
              />
              <span className="sl" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
