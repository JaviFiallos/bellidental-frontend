import { Arch } from '../models/odontogram.models';

export const TOOTH = 40;
export const DECIDUOUS = 32;
export const GAP = 6;
export const MIDLINE = 16;
export const LABEL_WIDTH = 100;
export const RIGHT_PAD = 8;
export const CELL_HEIGHT = 20;
export const FONT = 15;

export const WIDTH = 854;
export const HEIGHT = 414;
export const QUADRANT_WIDTH = 378;
export const QUADRANT_UPPER_HEIGHT = 234;
export const QUADRANT_LOWER_HEIGHT = 242;

export const UP_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
export const LO_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

export const QUAD1_TEETH = [18, 17, 16, 15, 14, 13, 12, 11] as const;
export const QUAD2_TEETH = [21, 22, 23, 24, 25, 26, 27, 28] as const;
export const QUAD4_TEETH = [48, 47, 46, 45, 44, 43, 42, 41] as const;
export const QUAD3_TEETH = [31, 32, 33, 34, 35, 36, 37, 38] as const;

export const DUP_MAP: Record<number, number> = {
  15: 55,
  14: 54,
  13: 53,
  12: 52,
  11: 51,
  21: 61,
  22: 62,
  23: 63,
  24: 64,
  25: 65,
};

export const DLO_MAP: Record<number, number> = {
  45: 85,
  44: 84,
  43: 83,
  42: 82,
  41: 81,
  31: 71,
  32: 72,
  33: 73,
  34: 74,
  35: 75,
};

export const DECIDUOUS_TO_PERMANENT: Record<number, number> = {
  55: 15, 54: 14, 53: 13, 52: 12, 51: 11,
  61: 21, 62: 22, 63: 23, 64: 24, 65: 25,
  85: 45, 84: 44, 83: 43, 82: 42, 81: 41,
  71: 31, 72: 32, 73: 33, 74: 34, 75: 35,
};

export function toPermanentHomologue(code: number): number {
  return DECIDUOUS_TO_PERMANENT[code] ?? code;
}

export function getArch(code: number): Arch {
  const quad = Math.floor(code / 10);
  return quad === 1 || quad === 2 || quad === 5 || quad === 6 ? 'UPPER' : 'LOWER';
}

export type OdontogramView = 'full' | 1 | 2 | 3 | 4;

export interface LayoutTooth {
  code: number;
  x: number;
  y: number;
  size: number;
  shape: 'square' | 'circle';
  numberX: number;
  numberY: number;
}

export type PeriodontalRowType = 'recU' | 'movU' | 'movL' | 'recL';

export interface LayoutPeriodontalCell {
  row: PeriodontalRowType;
  column: number;
  x: number;
  y: number;
  permanentCode: number;
  deciduousCode?: number;
}

export interface LayoutLabel {
  text: string;
  x: number;
  y: number;
  anchor?: 'start' | 'end';
}

export interface OdontogramLayout {
  view: OdontogramView;
  width: number;
  height: number;
  labels: LayoutLabel[];
  teeth: LayoutTooth[];
  periodontalCells: LayoutPeriodontalCell[];
  midlineX: number;
  separatorY: number;
  separatorX1: number;
  separatorX2: number;
}

export function columnX(index: number): number {
  return LABEL_WIDTH + index * (TOOTH + GAP) + (index >= 8 ? MIDLINE : 0);
}

/** Margen izquierdo de la vista por cuadrante (sin columna de etiquetas). */
export const QUADRANT_LEFT = 8;

export function quadrantColumnX(index: number): number {
  return QUADRANT_LEFT + index * (TOOTH + GAP);
}

export function columnCenter(code: number, view: OdontogramView = 'full'): number | null {
  const perm = toPermanentHomologue(code);

  if (view === 'full') {
    const upIdx = (UP_TEETH as readonly number[]).indexOf(perm);
    if (upIdx !== -1) {
      return columnX(upIdx) + TOOTH / 2;
    }
    const loIdx = (LO_TEETH as readonly number[]).indexOf(perm);
    if (loIdx !== -1) {
      return columnX(loIdx) + TOOTH / 2;
    }
    return null;
  }

  if (view === 1) {
    const idx = (QUAD1_TEETH as readonly number[]).indexOf(perm);
    return idx !== -1 ? quadrantColumnX(idx) + TOOTH / 2 : null;
  }

  if (view === 2) {
    const idx = (QUAD2_TEETH as readonly number[]).indexOf(perm);
    return idx !== -1 ? quadrantColumnX(idx) + TOOTH / 2 : null;
  }

  if (view === 4) {
    const idx = (QUAD4_TEETH as readonly number[]).indexOf(perm);
    return idx !== -1 ? quadrantColumnX(idx) + TOOTH / 2 : null;
  }

  if (view === 3) {
    const idx = (QUAD3_TEETH as readonly number[]).indexOf(perm);
    return idx !== -1 ? quadrantColumnX(idx) + TOOTH / 2 : null;
  }

  return null;
}

export function buildLayout(view: OdontogramView = 'full'): OdontogramLayout {
  if (view === 'full') {
    return buildFullLayout();
  }
  return buildQuadrantLayout(view);
}

function buildFullLayout(): OdontogramLayout {
  const midlineX = (columnX(7) + TOOTH + columnX(8)) / 2; // 473
  const separatorY = 206;
  const separatorX1 = LABEL_WIDTH - 4; // 96
  const separatorX2 = WIDTH - 4; // 850

  const labels: LayoutLabel[] = [
    { text: 'RECESIÓN', x: LABEL_WIDTH - 10, y: 14, anchor: 'end' },
    { text: 'MOVILIDAD', x: LABEL_WIDTH - 10, y: 38, anchor: 'end' },
    { text: 'VESTIBULAR', x: LABEL_WIDTH - 10, y: 116, anchor: 'end' },
    { text: 'TEMPORALES', x: LABEL_WIDTH - 10, y: 178, anchor: 'end' },
    { text: 'LINGUAL', x: LABEL_WIDTH - 10, y: 206, anchor: 'end' },
    { text: 'TEMPORALES', x: LABEL_WIDTH - 10, y: 234, anchor: 'end' },
    { text: 'VESTIBULAR', x: LABEL_WIDTH - 10, y: 296, anchor: 'end' },
    { text: 'MOVILIDAD', x: LABEL_WIDTH - 10, y: 376, anchor: 'end' },
    { text: 'RECESIÓN', x: LABEL_WIDTH - 10, y: 400, anchor: 'end' },
  ];

  const teeth: LayoutTooth[] = [];
  const periodontalCells: LayoutPeriodontalCell[] = [];

  // Superiores (col 0 a 15)
  UP_TEETH.forEach((permCode, colIndex) => {
    const colX = columnX(colIndex);
    const decCode = DUP_MAP[permCode];

    periodontalCells.push({
      row: 'recU',
      column: colIndex,
      x: colX,
      y: 4,
      permanentCode: permCode,
      deciduousCode: decCode,
    });
    periodontalCells.push({
      row: 'movU',
      column: colIndex,
      x: colX,
      y: 28,
      permanentCode: permCode,
      deciduousCode: decCode,
    });

    teeth.push({
      code: permCode,
      x: colX,
      y: 96,
      size: TOOTH,
      shape: 'square',
      numberX: colX + TOOTH / 2,
      numberY: 90,
    });

    if (decCode) {
      const decX = colX + (TOOTH - DECIDUOUS) / 2;
      teeth.push({
        code: decCode,
        x: decX,
        y: 162,
        size: DECIDUOUS,
        shape: 'circle',
        numberX: colX + TOOTH / 2,
        numberY: 156,
      });
    }
  });

  // Inferiores (col 0 a 15)
  LO_TEETH.forEach((permCode, colIndex) => {
    const colX = columnX(colIndex);
    const decCode = DLO_MAP[permCode];

    if (decCode) {
      const decX = colX + (TOOTH - DECIDUOUS) / 2;
      teeth.push({
        code: decCode,
        x: decX,
        y: 218,
        size: DECIDUOUS,
        shape: 'circle',
        numberX: colX + TOOTH / 2,
        numberY: 268,
      });
    }

    teeth.push({
      code: permCode,
      x: colX,
      y: 276,
      size: TOOTH,
      shape: 'square',
      numberX: colX + TOOTH / 2,
      numberY: 336,
    });

    periodontalCells.push({
      row: 'movL',
      column: colIndex,
      x: colX,
      y: 366,
      permanentCode: permCode,
      deciduousCode: decCode,
    });
    periodontalCells.push({
      row: 'recL',
      column: colIndex,
      x: colX,
      y: 390,
      permanentCode: permCode,
      deciduousCode: decCode,
    });
  });

  return {
    view: 'full',
    width: WIDTH,
    height: HEIGHT,
    labels,
    teeth,
    periodontalCells,
    midlineX,
    separatorY,
    separatorX1,
    separatorX2,
  };
}

function buildQuadrantLayout(quad: 1 | 2 | 3 | 4): OdontogramLayout {
  const isUpper = quad === 1 || quad === 2;
  const height = isUpper ? QUADRANT_UPPER_HEIGHT : QUADRANT_LOWER_HEIGHT;
  const teethList =
    quad === 1 ? QUAD1_TEETH : quad === 2 ? QUAD2_TEETH : quad === 4 ? QUAD4_TEETH : QUAD3_TEETH;
  const decMap = isUpper ? DUP_MAP : DLO_MAP;

  const labels: LayoutLabel[] = isUpper
    ? [
        { text: 'RECESIÓN', x: 8, y: 14, anchor: 'start' },
        { text: 'MOVILIDAD', x: 8, y: 56, anchor: 'start' },
      ]
    : [
        { text: 'MOVILIDAD', x: 8, y: 168, anchor: 'start' },
        { text: 'RECESIÓN', x: 8, y: 212, anchor: 'start' },
      ];

  const teeth: LayoutTooth[] = [];
  const periodontalCells: LayoutPeriodontalCell[] = [];

  teethList.forEach((permCode, colIndex) => {
    const colX = quadrantColumnX(colIndex);
    const decCode = decMap[permCode];

    if (isUpper) {
      // Cuadrantes superiores (1 y 2)
      periodontalCells.push({
        row: 'recU',
        column: colIndex,
        x: colX,
        y: 20,
        permanentCode: permCode,
        deciduousCode: decCode,
      });
      periodontalCells.push({
        row: 'movU',
        column: colIndex,
        x: colX,
        y: 62,
        permanentCode: permCode,
        deciduousCode: decCode,
      });

      teeth.push({
        code: permCode,
        x: colX,
        y: 130,
        size: TOOTH,
        shape: 'square',
        numberX: colX + TOOTH / 2,
        numberY: 124,
      });

      if (decCode) {
        const decX = colX + (TOOTH - DECIDUOUS) / 2;
        teeth.push({
          code: decCode,
          x: decX,
          y: 196,
          size: DECIDUOUS,
          shape: 'circle',
          numberX: colX + TOOTH / 2,
          numberY: 190,
        });
      }
    } else {
      // Cuadrantes inferiores (4 y 3) en espejo
      if (decCode) {
        const decX = colX + (TOOTH - DECIDUOUS) / 2;
        teeth.push({
          code: decCode,
          x: decX,
          y: 6,
          size: DECIDUOUS,
          shape: 'circle',
          numberX: colX + TOOTH / 2,
          numberY: 56,
        });
      }

      teeth.push({
        code: permCode,
        x: colX,
        y: 64,
        size: TOOTH,
        shape: 'square',
        numberX: colX + TOOTH / 2,
        numberY: 124,
      });

      periodontalCells.push({
        row: 'movL',
        column: colIndex,
        x: colX,
        y: 174,
        permanentCode: permCode,
        deciduousCode: decCode,
      });
      periodontalCells.push({
        row: 'recL',
        column: colIndex,
        x: colX,
        y: 218,
        permanentCode: permCode,
        deciduousCode: decCode,
      });
    }
  });

  return {
    view: quad,
    width: QUADRANT_WIDTH,
    height,
    labels,
    teeth,
    periodontalCells,
    midlineX: 0,
    separatorY: 0,
    separatorX1: 0,
    separatorX2: 0,
  };
}
