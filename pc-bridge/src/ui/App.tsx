// SPDX-License-Identifier: MIT
/**
 * App – Root: Sidebar links + Topbar oben + Ansicht. Kein rechter/linker Rand unten.
 */
import { useEffect } from 'react';
import { useDeck } from './store/deck';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Launcher } from './components/Launcher';
import { TischView } from './components/tisch/TischView';
import { ProtokolleView } from './views/ProtokolleView';
import { EinstellungenView } from './views/EinstellungenView';
import { AustauschView } from './views/AustauschView';
import { TasksView } from './views/TasksView';
import { ZeitplanView } from './views/ZeitplanView';

export function App() {
  const view = useDeck((s) => s.view);
  const setLauncher = useDeck((s) => s.setLauncher);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setLauncher(!useDeck.getState().launcherOpen);
      }
      if (e.key === 'Escape') setLauncher(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setLauncher]);

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="content">
          {view === 'uebersicht' && <TischView />}
          {view === 'protokolle' && <ProtokolleView />}
          {view === 'einstellungen' && <EinstellungenView />}
          {view === 'austausch' && <AustauschView />}
          {view === 'tasks' && <TasksView />}
          {view === 'zeitplan' && <ZeitplanView />}
        </div>
      </div>
      <Launcher />
    </div>
  );
}
