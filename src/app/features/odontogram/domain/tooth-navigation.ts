import {
  buildLayout,
  GAP,
  LABEL_WIDTH,
  MIDLINE,
  OdontogramView,
  QUADRANT_LEFT,
  TOOTH,
} from './odontogram-layout';

export interface NavTooth {
  code: number;
  col: number;
}

export type NavKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End';

export function getVisibleRows(view: OdontogramView): NavTooth[][] {
  const layout = buildLayout(view);
  const yMap = new Map<number, typeof layout.teeth>();
  for (const tooth of layout.teeth) {
    const list = yMap.get(tooth.y) ?? [];
    list.push(tooth);
    yMap.set(tooth.y, list);
  }

  const sortedY = [...yMap.keys()].sort((a, b) => a - b);
  const rows: NavTooth[][] = [];

  for (const y of sortedY) {
    const teethInRow = (yMap.get(y) ?? []).sort((a, b) => a.x - b.x);
    const rowItems: NavTooth[] = teethInRow.map((t) => {
      let col: number;
      const step = TOOTH + GAP;
      if (view === 'full') {
        const adjustedX = t.x - LABEL_WIDTH;
        col = adjustedX >= 8 * step + MIDLINE
          ? Math.floor((adjustedX - MIDLINE) / step)
          : Math.floor(adjustedX / step);
      } else {
        col = Math.floor((t.x - QUADRANT_LEFT) / step);
      }
      return { code: t.code, col };
    });
    rows.push(rowItems);
  }

  return rows;
}

export function getReadingOrderTeeth(view: OdontogramView): number[] {
  const rows = getVisibleRows(view);
  const result: number[] = [];
  for (const row of rows) {
    for (const item of row) {
      result.push(item.code);
    }
  }
  return result;
}

export function getInitialFocusedTooth(
  view: OdontogramView,
  teethWithFindings: Set<number> | number[]
): number {
  const findingsSet = Array.isArray(teethWithFindings)
    ? new Set(teethWithFindings)
    : teethWithFindings;
  const readingOrder = getReadingOrderTeeth(view);

  for (const code of readingOrder) {
    if (findingsSet.has(code)) {
      return code;
    }
  }

  return readingOrder[0] ?? 18;
}

export function getNextTooth(
  currentCode: number,
  key: NavKey,
  view: OdontogramView
): number {
  const rows = getVisibleRows(view);

  let curRowIdx = -1;
  let curItemIdx = -1;

  for (let r = 0; r < rows.length; r++) {
    const idx = rows[r].findIndex((item) => item.code === currentCode);
    if (idx !== -1) {
      curRowIdx = r;
      curItemIdx = idx;
      break;
    }
  }

  if (curRowIdx === -1 || curItemIdx === -1) {
    return getReadingOrderTeeth(view)[0] ?? currentCode;
  }

  const currentRow = rows[curRowIdx];
  const currentItem = currentRow[curItemIdx];

  switch (key) {
    case 'ArrowLeft':
      return curItemIdx > 0 ? currentRow[curItemIdx - 1].code : currentCode;

    case 'ArrowRight':
      return curItemIdx < currentRow.length - 1 ? currentRow[curItemIdx + 1].code : currentCode;

    case 'Home':
      return currentRow[0].code;

    case 'End':
      return currentRow[currentRow.length - 1].code;

    case 'ArrowUp': {
      if (curRowIdx === 0) {
        return currentCode;
      }
      const targetRow = rows[curRowIdx - 1];
      return findClosestToothInRow(targetRow, currentItem.col);
    }

    case 'ArrowDown': {
      if (curRowIdx === rows.length - 1) {
        return currentCode;
      }
      const targetRow = rows[curRowIdx + 1];
      return findClosestToothInRow(targetRow, currentItem.col);
    }

    default:
      return currentCode;
  }
}

function findClosestToothInRow(row: NavTooth[], sourceCol: number): number {
  let closest = row[0];
  let minDiff = Math.abs(closest.col - sourceCol);

  for (let i = 1; i < row.length; i++) {
    const diff = Math.abs(row[i].col - sourceCol);
    if (diff < minDiff) {
      minDiff = diff;
      closest = row[i];
    }
  }

  return closest.code;
}
