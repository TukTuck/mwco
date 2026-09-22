// SPDX-License-Identifier: MIT
/**
 * Grid Store – Zustand State für das Fenster-Grid.
 *
 * ## Grid-Modell:
 * - 4 Spalten × 3 Zeilen (12 Slots)
 * - Jede Zelle hat: id, type, color, title, position (col/row), size (colSpan/rowSpan)
 * - Zellen können: verschoben, resized, gepinnt, minimiert werden
 *
 * ## Auto-Sort:
 * - 1 Fenster → Vollbild (4×3)
 * - 2 Fenster → 50/50 (je 2×3)
 * - 3 Fenster → 2 oben + 1 unten (2×2, 2×2, 4×1)
 * - 4 Fenster → 2×2 Grid (je 2×1.5)
 */

export type CellType = 'paul' | 'orchestrator' | 'terminal' | 'webchat' | 'logs' | 'blank';

export type CellColor = '🔵' | '🟣' | '🟢' | '🟡' | '🟠' | '🔴' | '⚪';

export const CELL_COLORS: CellColor[] = ['🔵', '🟣', '🟢', '🟡', '🟠', '🔴', '⚪'];

export const COLOR_HEX: Record<CellColor, string> = {
  '🔵': '#3b82f6',
  '🟣': '#8b5cf6',
  '🟢': '#22c55e',
  '🟡': '#eab308',
  '🟠': '#f97316',
  '🔴': '#ef4444',
  '⚪': '#9ca3af',
};

export interface GridCell {
  id: string;
  type: CellType;
  color: CellColor;
  title: string;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
  pinned: boolean;
  minimized: boolean;
  config: Record<string, unknown>;
}

export interface GridLayout {
  name: string;
  cells: GridCell[];
}

export const GRID_COLS = 4;
export const GRID_ROWS = 3;

// ── Default Layout ──────────────────────────────────

export const DEFAULT_CELLS: GridCell[] = [
  {
    id: 'paul-1',
    type: 'paul',
    color: '🔵',
    title: 'Paul',
    col: 0,
    row: 0,
    colSpan: 2,
    rowSpan: 2,
    pinned: true,
    minimized: false,
    config: {},
  },
  {
    id: 'terminal-1',
    type: 'terminal',
    color: '🟢',
    title: 'Terminal',
    col: 2,
    row: 0,
    colSpan: 2,
    rowSpan: 1,
    pinned: false,
    minimized: false,
    config: { shell: 'default' },
  },
  {
    id: 'orchestrator-1',
    type: 'orchestrator',
    color: '🟣',
    title: 'Orchestrator',
    col: 2,
    row: 1,
    colSpan: 2,
    rowSpan: 1,
    pinned: false,
    minimized: false,
    config: {},
  },
  {
    id: 'logs-1',
    type: 'logs',
    color: '⚪',
    title: 'Logs',
    col: 0,
    row: 2,
    colSpan: 4,
    rowSpan: 1,
    pinned: false,
    minimized: false,
    config: {},
  },
];

// ── Auto-Sort Presets ──────────────────────────────────

export interface AutoSortPreset {
  name: string;
  description: string;
  apply: (cells: GridCell[]) => GridCell[];
}

export const AUTO_SORT_PRESETS: AutoSortPreset[] = [
  {
    name: 'Vollbild',
    description: '1 Fenster → Vollbild',
    apply: (cells) => {
      const visible = cells.filter((c) => !c.minimized);
      if (visible.length === 0) return cells;
      return cells.map((c, i) => ({
        ...c,
        col: 0,
        row: 0,
        colSpan: GRID_COLS,
        rowSpan: GRID_ROWS,
        minimized: i > 0 ? true : c.minimized,
      }));
    },
  },
  {
    name: '50/50',
    description: '2 Fenster → nebeneinander',
    apply: (cells) => {
      const visible = cells.filter((c) => !c.minimized);
      return cells.map((c, i) => {
        const vi = visible.indexOf(c);
        if (vi === -1) return c;
        if (vi === 0) return { ...c, col: 0, row: 0, colSpan: 2, rowSpan: GRID_ROWS };
        if (vi === 1) return { ...c, col: 2, row: 0, colSpan: 2, rowSpan: GRID_ROWS };
        return { ...c, minimized: true };
      });
    },
  },
  {
    name: '2+1',
    description: '3 Fenster → 2 oben + 1 unten',
    apply: (cells) => {
      const visible = cells.filter((c) => !c.minimized);
      return cells.map((c) => {
        const vi = visible.indexOf(c);
        if (vi === -1) return c;
        if (vi === 0) return { ...c, col: 0, row: 0, colSpan: 2, rowSpan: 2 };
        if (vi === 1) return { ...c, col: 2, row: 0, colSpan: 2, rowSpan: 2 };
        if (vi === 2) return { ...c, col: 0, row: 2, colSpan: GRID_COLS, rowSpan: 1 };
        return { ...c, minimized: true };
      });
    },
  },
  {
    name: '2×2',
    description: '4 Fenster → Quadranten',
    apply: (cells) => {
      const visible = cells.filter((c) => !c.minimized);
      const positions = [
        { col: 0, row: 0 },
        { col: 2, row: 0 },
        { col: 0, row: 1 },
        { col: 2, row: 1 },
      ];
      return cells.map((c) => {
        const vi = visible.indexOf(c);
        if (vi === -1) return c;
        if (vi < 4) {
          const pos = positions[vi];
          return {
            ...c,
            col: pos.col,
            row: pos.row,
            colSpan: 2,
            rowSpan: vi < 2 ? 1 : 2,
          };
        }
        return { ...c, minimized: true };
      });
    },
  },
];

// ── Store Interface ──────────────────────────────────

export interface GridState {
  cells: GridCell[];
  selectedCellId: string | null;
  dragState: { cellId: string; startX: number; startY: number } | null;

  // Actions
  addCell: (type: CellType, title: string, color: CellColor) => void;
  removeCell: (id: string) => void;
  moveCell: (id: string, col: number, row: number) => void;
  resizeCell: (id: string, colSpan: number, rowSpan: number) => void;
  selectCell: (id: string | null) => void;
  togglePin: (id: string) => void;
  toggleMinimize: (id: string) => void;
  updateCellColor: (id: string, color: CellColor) => void;
  updateCellTitle: (id: string, title: string) => void;
  autoSort: (presetIndex: number) => void;
  loadLayout: (cells: GridCell[]) => void;
  getLayout: () => GridCell[];
}

let nextId = 1;

export function createGridStore(): GridState {
  return {
    cells: [...DEFAULT_CELLS],
    selectedCellId: null,
    dragState: null,

    addCell(type, title, color) {
      const id = `${type}-${Date.now()}-${nextId++}`;
      const newCell: GridCell = {
        id,
        type,
        color,
        title,
        col: 0,
        row: 0,
        colSpan: 2,
        rowSpan: 1,
        pinned: false,
        minimized: false,
        config: {},
      };
      this.cells = [...this.cells, newCell];
    },

    removeCell(id) {
      this.cells = this.cells.filter((c) => c.id !== id);
      if (this.selectedCellId === id) this.selectedCellId = null;
    },

    moveCell(id, col, row) {
      this.cells = this.cells.map((c) =>
        c.id === id
          ? {
              ...c,
              col: Math.max(0, Math.min(GRID_COLS - c.colSpan, col)),
              row: Math.max(0, Math.min(GRID_ROWS - c.rowSpan, row)),
            }
          : c
      );
    },

    resizeCell(id, colSpan, rowSpan) {
      this.cells = this.cells.map((c) =>
        c.id === id
          ? {
              ...c,
              colSpan: Math.max(1, Math.min(GRID_COLS, colSpan)),
              rowSpan: Math.max(1, Math.min(GRID_ROWS, rowSpan)),
            }
          : c
      );
    },

    selectCell(id) {
      this.selectedCellId = id;
    },

    togglePin(id) {
      this.cells = this.cells.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c));
    },

    toggleMinimize(id) {
      this.cells = this.cells.map((c) => (c.id === id ? { ...c, minimized: !c.minimized } : c));
    },

    updateCellColor(id, color) {
      this.cells = this.cells.map((c) => (c.id === id ? { ...c, color } : c));
    },

    updateCellTitle(id, title) {
      this.cells = this.cells.map((c) => (c.id === id ? { ...c, title } : c));
    },

    autoSort(presetIndex) {
      const preset = AUTO_SORT_PRESETS[presetIndex];
      if (preset) {
        this.cells = preset.apply(this.cells);
      }
    },

    loadLayout(cells) {
      this.cells = cells;
    },

    getLayout() {
      return [...this.cells];
    },
  };
}
