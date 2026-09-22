// SPDX-License-Identifier: MIT
/**
 * Zentraler UI-State (zustand): Ansicht, Karten, Fenster, Zoom, Launcher, Verbindung.
 */
import { create } from 'zustand';
import { CARD_META, INITIAL_CARDS, type CardKey, type ViewId } from '../data';

export interface CardState { key: CardKey; x: number; y: number; open: boolean }
export interface WinState { id: number; key: CardKey; x: number; y: number }
export interface Zoom { x: number; y: number; s: number }

let nextWinId = 1;

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
  moveWin: (id, x, y) =>
    set((s) => ({ wins: s.wins.map((w) => (w.id === id ? { ...w, x, y } : w)) })),
  dockWin: (id, x, y) =>
    set((s) => {
      const win = s.wins.find((w) => w.id === id);
      if (!win) return s;
      return {
        wins: s.wins.filter((w) => w.id !== id),
        cards: [...s.cards, { key: win.key, x, y, open: false }],
      };
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
  connect: () => {
    // Platzhalter: echte Verbindung folgt über window.agentDeck / WebSocket.
    set({ connected: !get().connected });
  },
}));

export function metaOf(k: CardKey) {
  return CARD_META[k];
}
