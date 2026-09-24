// SPDX-License-Identifier: MIT
/**
 * Inhalt einer Karte – kompakt (aufgeklappte Kachel) oder voll (Fenster).
 */
import type { CardKey } from '../../data';
import { INSTANCES, LOGS, ROUTES } from '../../data';
import paulImg from '../../assets/paul.png';
import { PaulChat, LiveTerminal } from './Live';

export function CardRows({ k }: { k: CardKey }) {
  if (k === 'tausch')
    return (
      <>
        {INSTANCES.slice(0, 3).map((i) => (
          <div className="row" key={i.ip}>
            <span className="k">{i.ip}</span>
            <span className="grow" />
            <span className={`badge ${i.status === 'AKTIV' ? 'on' : 'wait'}`}>{i.status}</span>
          </div>
        ))}
      </>
    );
  if (k === 'logs')
    return (
      <>
        {LOGS.slice(0, 3).map((l, i) => (
          <div className="row" key={i}>
            <span className={`badge ${l.lvl === 'WARN' || l.lvl === 'FEHLER' ? 'wait' : 'on'}`}>{l.lvl}</span>
            <span className="k">{l.text}</span>
          </div>
        ))}
      </>
    );
  if (k === 'terminal')
    return (
      <>
        <div className="row"><span className="k dollar">$</span><span className="k">git status</span></div>
        <div className="row"><span className="k dollar">$</span><span className="k">npm run build:all</span></div>
      </>
    );
  if (k === 'orch')
    return (
      <>
        <div className="row"><span className="k">blueprint → 4 tasks</span></div>
        <div className="row"><span className="k">dispatch an 2 worker</span></div>
      </>
    );
  if (k === 'llm')
    return (
      <>
        <div className="row"><span className="k">paul → 7B lokal</span><span className="grow" /><span className="badge on">AKTIV</span></div>
        <div className="row"><span className="k">webchat → gpt</span><span className="grow" /><span className="badge wait">KEIN KEY</span></div>
      </>
    );
  if (k === 'webchat')
    return (
      <div className="mini-msg">
        <div className="who">C</div>
        <div className="txt">Gerne, hier ein Entwurf…</div>
      </div>
    );
  // paul
  return (
    <>
      <div className="mini-msg"><div className="who">P</div><div className="txt">Ich bin verbunden. 9 Tools aktiv.</div></div>
      <div className="mini-msg"><div className="who">Ich</div><div className="txt">Zeig die laufenden Tasks.</div></div>
    </>
  );
}

export function CardFull({ k }: { k: CardKey }) {
  if (k === 'paul') return <PaulChat />;
  if (k === 'llm')
    return (
      <>
        <div className="portrait"><img src={paulImg} alt="Paul" /><div><div className="pname">Paul</div><div className="psub">Qwen2.5-7B · Q4_K_M</div></div></div>
        <div className="vram" style={{ marginTop: 10 }}><div className="vbar" style={{ width: '68%' }} /></div>
        <div className="vlabel">5.4 / 8 GB VRAM belegt</div>
        <table className="tbl" style={{ marginTop: 10 }}>
          <tbody>
            {ROUTES.map((r) => (
              <tr key={r.route}>
                <td>{r.route}</td><td>{r.ziel}</td>
                <td><span className={`badge ${r.status === 'AKTIV' ? 'on' : 'wait'}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  if (k === 'tausch')
    return (
      <table className="tbl">
        <tbody>
          {INSTANCES.map((i) => (
            <tr key={i.ip}>
              <td>{i.ip}</td><td>{i.rolle}</td>
              <td><span className={`badge ${i.status === 'AKTIV' ? 'on' : 'wait'}`}>{i.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  if (k === 'webchat')
    return (
      <>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <span className="chip on">Claude</span><span className="chip">ChatGPT</span><span className="chip">Gemini</span>
        </div>
        <div className="placeholder-area">Reines Chat-Interface.<br />Kein MCP, kein System-Zugriff.</div>
      </>
    );
  if (k === 'terminal') return <LiveTerminal />;
  if (k === 'logs')
    return (
      <div className="logs">
        {LOGS.map((l, i) => (
          <div key={i}><span className={`lvl ${l.lvl.toLowerCase()}`}>{l.lvl}</span>{l.text}</div>
        ))}
      </div>
    );
  // orch
  return (
    <div className="term">
      <div><span style={{ color: 'var(--orch)' }}>orch</span> blueprint → 4 tasks</div>
      <div className="c">dispatched an 2 worker</div>
      <div><span style={{ color: 'var(--orch)' }}>orch</span> monitor aktiv ▊</div>
    </div>
  );
}
