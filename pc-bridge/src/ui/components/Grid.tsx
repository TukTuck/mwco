// SPDX-License-Identifier: MIT
/**
 * Grid Component – das Herzstück der Agent Deck UI.
 *
 * Zeigt ein CSS-Grid mit verschiebbaren, resize-baren Zellen.
 * Dark Mode Default, Farbcodierung pro Zelle.
 */

import React, { useCallback } from 'react';
import {
  type GridCell as GridCellType,
  type GridState,
  GRID_COLS,
  GRID_ROWS,
  COLOR_HEX,
} from '../store/gridStore';
import { GridCellComponent } from './GridCell';

interface GridProps {
  state: GridState;
}

export function Grid({ state }: GridProps) {
  const visibleCells = state.cells.filter((c) => !c.minimized);

  const handleDragStart = useCallback(
    (cellId: string, e: React.MouseEvent) => {
      state.selectCell(cellId);
      // Drag-Logik würde hier mit DnD-Library implementiert
    },
    [state]
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
        gap: '4px',
        padding: '4px',
        height: '100%',
        width: '100%',
        backgroundColor: '#0a0a0a',
      }}
    >
      {visibleCells.map((cell) => (
        <GridCellComponent
          key={cell.id}
          cell={cell}
          isSelected={state.selectedCellId === cell.id}
          onSelect={() => state.selectCell(cell.id)}
          onClose={() => state.removeCell(cell.id)}
          onPin={() => state.togglePin(cell.id)}
          onMinimize={() => state.toggleMinimize(cell.id)}
          onDragStart={(e) => handleDragStart(cell.id, e)}
        />
      ))}
    </div>
  );
}
