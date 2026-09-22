// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useDeck } from '../store/deck';
import { SUGGESTIONS } from '../data';
import paulImg from '../assets/paul.png';

export function Launcher() {
  const open = useDeck((s) => s.launcherOpen);
  const setLauncher = useDeck((s) => s.setLauncher);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  if (!open) return null;
  const list = SUGGESTIONS.filter((s) => s.text.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="launcher">
      <div className="lin">
        <img src={paulImg} alt="" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && list[0]) setLauncher(false); }}
          placeholder="Paul fragen oder Befehl…"
        />
        <kbd>ESC</kbd>
      </div>
      <div className="sugg">
        {(list.length ? list : SUGGESTIONS).map((s, i) => (
          <div className="sug" key={i} style={{ '--sc': s.color } as CSSProperties} onClick={() => setLauncher(false)}>
            <div className="si">{s.icon}</div>
            {s.text}
            <span className="sk">{s.art}</span>
          </div>
        ))}
      </div>
      <div className="lfoot"><span>↑↓ wählen</span><span>↵ ausführen</span><span>Paul läuft lokal · Qwen 7B</span></div>
    </div>
  );
}
