// SPDX-License-Identifier: MIT
/**
 * Stateful Live-Komponenten: Paul-Chat und Terminal, an die Bridge angebunden.
 */
import { useState } from 'react';
import { bridge } from '../../bridge';

export function PaulChat() {
  const [msgs, setMsgs] = useState<Array<{ who: 'me' | 'paul'; text: string }>>([
    { who: 'paul', text: 'Ich bin verbunden. 9 Tools aktiv.' },
  ]);
  const [input, setInput] = useState('');

  const send = async () => {
    const q = input.trim();
    if (!q) return;
    setInput('');
    setMsgs((m) => [...m, { who: 'me', text: q }]);
    const answer = await bridge.paulChat(q);
    setMsgs((m) => [...m, { who: 'paul', text: answer }]);
  };

  return (
    <>
      <div className="taskcard">
        <div className="t"><span className="dot" style={{ background: 'var(--orch)' }} />Paul · live</div>
        <div className="steps" style={{ marginTop: 8 }}>
          {msgs.slice(-4).map((m, i) => (
            <div className="step" key={i} style={{ color: m.who === 'me' ? 'var(--dim)' : 'var(--text)' }}>
              <span className="cb" style={m.who === 'paul' ? { borderColor: 'var(--paul)', color: 'var(--paul)' } : undefined}>
                {m.who === 'paul' ? 'P' : '›'}
              </span>
              {m.text}
            </div>
          ))}
        </div>
      </div>
      <div className="chat-input">
        <div className="chips"><span className="chip on">Auto</span><span className="chip">Free</span><span className="chip">Code</span></div>
        <input
          placeholder="Paul fragen…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
        />
        <button onClick={send}>↑</button>
      </div>
    </>
  );
}

export function LiveTerminal() {
  const [lines, setLines] = useState<string[]>(['$ (bereit)']);
  const [input, setInput] = useState('');

  const run = async () => {
    const cmd = input.trim();
    if (!cmd) return;
    setInput('');
    setLines((l) => [...l, `$ ${cmd}`]);
    const out = await bridge.terminal(cmd);
    setLines((l) => [...l, ...out.split('\n')]);
  };

  return (
    <div className="term">
      {lines.slice(-8).map((l, i) => (
        <div key={i} className={l.startsWith('$') ? '' : 'c'}>{l}</div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <span className="p">~/mwco $</span>
        <input
          className="term-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') run(); }}
          placeholder="Befehl…"
        />
      </div>
    </div>
  );
}
