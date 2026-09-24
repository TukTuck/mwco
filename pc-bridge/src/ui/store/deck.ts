// SPDX-License-Identifier: MIT
/**
 * Zentraler UI-State (zustand): Ansicht, Karten, Fenster, Zoom, Launcher, Verbindung,
 * und jetzt: selbst setzbare/benennbare Verbindungen (Linien).
 */
import { create } from 'zustand';
import { CARD_META, INITIAL_CARDS, INITIAL_WIRES, type CardKey, type ViewId } from '../data';

export interface CardState { key: CardKey; x: number; y: number; open: boolean }
export interface WinState { id: number; key: CardKey; x: number; y: number }
export interface Zoom { x: number; y: number; s: number }
export interface Conn { id: number; from: CardKey; to: CardKey; label: string; color: string }

let nextWinId = 1;
let nextConnId = 1;

const initialConns: Conn[] = INITIAL_WIRES.map((w) => ({
  id: nextConnId++, from: w.from, to: w.to, label: '', color: w.color,
}));

interface DeckState {
  view: ViewId;
  setView: (v: ViewId) => void;

  cards: CardState[];
  wins: WinState[];
  toggleOpen: (k: CardKey) => void;
  moveCard: (k: CardKey, x: number, y: number) => void;
  toWindow: (k: CardKey, x: number, y: number) => void;
  moveWin: (id: number, x: number, y: number) => void;
  dockWin: (id: number, x: number, y: number) => void;
  closeWin: (id: number) => void;

  zoom: Zoom;
  setZoom: (z: Zoom) => void;
  activeWire: number;
  setActiveWire: (i: number) => void;

  launcherOpen: boolean;
  setLauncher: (b: boolean) => void;

  connUrl: string;
  setConnUrl: (s: string) => void;
  connected: boolean;
  connect: () => void;

  // Verbindungs-Editor
  conns: Conn[];
  connectMode: boolean;
  setConnectMode: (b: boolean) => void;
  pendingFrom: CardKey | null;
  pendingWire: { from: CardKey; to: CardKey } | null;
  clickConnect: (k: CardKey) => void;
  cancelPending: () => void;
  addConnection: (label: string) => void;
  removeConnection: (id: number) => void;
  setConnLabel: (id: number, label: string) => void;
  panelOpen: boolean;
  setPanelOpen: (b: boolean) => void;
}

export const useDeck = create<DeckState>((set, get) => ({
  view: 'uebersicht',
  setView: (v) => set({ view: v }),

  cards: INITIAL_CARDS.map((c) => ({ ...c, open: false })),
  wins: [],
  toggleOpen: (k) =>
    set((s) => ({ cards: s.cards.map((c) => (c.key === k ? { ...c, open: !c.open } : c)) })),
  moveCard: (k, x, y) =>
    set((s) => ({ cards: s.cards.map((c) => (c.key === k ? { ...c, x, y } : c)) })),
  toWindow: (k, x, y) =>
    set((s) => ({
      cards: s.cards.filter((c) => c.key !== k),
      wins: [...s.wins, { id: nextWinId++, key: k, x: Math.max(8, x - 120), y: Math.max(8, y - 20) }],
    })),
  moveWin: (id, x, y) => set((s) => ({ wins: s.wins.map((w) => (w.id === id ? { ...w, x, y } : w)) })),
  dockWin: (id, x, y) =>
    set((s) => {
      const win = s.wins.find((w) => w.id === id);
      if (!win) return s;
      return { wins: s.wins.filter((w) => w.id !== id), cards: [...s.cards, { key: win.key, x, y, open: false }] };
    }),
  closeWin: (id) => set((s) => ({ wins: s.wins.filter((w) => w.id !== id) })),

  zoom: { x: 0, y: 0, s: 1 },
  setZoom: (z) => set({ zoom: z }),
  activeWire: -1,
  setActiveWire: (i) => set({ activeWire: i }),

  launcherOpen: false,
  setLauncher: (b) => set({ launcherOpen: b }),

  connUrl: 'http://127.0.0.1:18028',
  setConnUrl: (u) => set({ connUrl: u }),
  connected: false,
  connect: () => set({ connected: !get().connected }),

  conns: initialConns,
  connectMode: false,
  setConnectMode: (b) => set({ connectMode: b, pendingFrom: null, pendingWire: null }),
  pendingFrom: null,
  pendingWire: null,
  clickConnect: (k) => {
    const { pendingFrom } = get();
    if (!pendingFrom) { set({ pendingFrom: k }); return; }
    if (pendingFrom === k) { set({ pendingFrom: null }); return; }
    set({ pendingWire: { from: pendingFrom, to: k }, pendingFrom: null });
  },
  cancelPending: () => set({ pendingWire: null, pendingFrom: null }),
  addConnection: (label) => {
    const { pendingWire } = get();
    if (!pendingWire) return;
    set((s) => ({
      conns: [...s.conns, { id: nextConnId++, from: pendingWire.from, to: pendingWire.to, label, color: CARD_META[pendingWire.from].color }],
      pendingWire: null,
    }));
  },
  removeConnection: (id) => set((s) => ({ conns: s.conns.filter((c) => c.id !== id) })),
  setConnLabel: (id, label) =>
    set((s) => ({ conns: s.conns.map((c) => (c.id === id ? { ...c, label } : c)) })),
  panelOpen: false,
  setPanelOpen: (b) => set({ panelOpen: b }),
}));

export function metaOf(k: CardKey) {
  return CARD_META[k];
}
