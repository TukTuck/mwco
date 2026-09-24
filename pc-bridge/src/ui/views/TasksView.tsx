// SPDX-License-Identifier: MIT
import { TASKS } from '../data';
import { bridge } from '../bridge';
import { useBridge } from '../useBridge';

const STATUS_CLS: Record<string, string> = { läuft: 'on', fertig: 'on', offen: 'wait', fehler: 'wait' };

export function TasksView() {
  const tasks = useBridge(() => bridge.tasks(), TASKS);
  const done = tasks.filter((t) => t.status === 'fertig').length;
  return (
    <div className="view">
      <div className="view-head">
        <span className="vh-note">Blueprint → {tasks.length} Tasks · {done} fertig · 1 läuft</span>
        <button className="btn primary">Neues Blueprint</button>
      </div>
      <div className="panel">
        {tasks.map((t) => (
          <div className="taskrow" key={t.id}>
            <span className="tid mono">{t.id}</span>
            <span className="tt">{t.titel}</span>
            <span className="tw dim">{t.worker}</span>
            <span className={`badge ${STATUS_CLS[t.status]}`}>{t.status.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
