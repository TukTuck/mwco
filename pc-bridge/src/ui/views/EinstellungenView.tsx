// SPDX-License-Identifier: MIT
import { useState } from 'react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel sec">
      <div className="sec-title">{title}</div>
      {children}
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="frow">
      <span className="flabel">{label}</span>
      {children}
    </div>
  );
}

export function EinstellungenView() {
  const [s, setS] = useState({
    paul: 'qwen2.5-7b-q4_k_m.gguf',
    orch: 'qwen2.5-1.5b-q4_k_m.gguf',
    vram: '8',
    claude: 'sk-ant-••••',
    gpt: '',
    gemini: '',
    hotkey: 'Ctrl+Shift+P',
    port: '18028',
  });
  const set = (k: keyof typeof s) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS({ ...s, [k]: e.target.value });

  return (
    <div className="view">
      <Section title="Modelle (lokal)">
        <Row label="Paul (7B)"><input value={s.paul} onChange={set('paul')} /></Row>
        <Row label="Orchestrator (1.5B)"><input value={s.orch} onChange={set('orch')} /></Row>
        <Row label="VRAM-Budget (GB)"><input value={s.vram} onChange={set('vram')} /></Row>
      </Section>
      <Section title="API-Keys (WebChat-Routen)">
        <Row label="Claude"><input type="password" value={s.claude} onChange={set('claude')} /></Row>
        <Row label="ChatGPT"><input type="password" placeholder="kein Key – Route pausiert" value={s.gpt} onChange={set('gpt')} /></Row>
        <Row label="Gemini"><input type="password" value={s.gemini} onChange={set('gemini')} /></Row>
      </Section>
      <Section title="Steuerung & Verbindung">
        <Row label="Paul-Hotkey"><input value={s.hotkey} onChange={set('hotkey')} /></Row>
        <Row label="Bridge-Port"><input value={s.port} onChange={set('port')} /></Row>
      </Section>
      <div className="view-foot"><button className="btn primary">Speichern</button></div>
    </div>
  );
}
