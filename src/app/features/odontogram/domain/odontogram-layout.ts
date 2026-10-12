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

export const UP_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
export const LO_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

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
}

export interface OdontogramLayout {
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

export function buildLayout(): OdontogramLayout {
  const midlineX = (columnX(7) + TOOTH + columnX(8)) / 2; // 473
  const separatorY = 206;
  const separatorX1 = LABEL_WIDTH - 4; // 96
  const separatorX2 = WIDTH - 4; // 850

  const labels: LayoutLabel[] = [
    { text: 'RECESIÓN', x: LABEL_WIDTH - 10, y: 14 },
    { text: 'MOVILIDAD', x: LABEL_WIDTH - 10, y: 38 },
    { text: 'VESTIBULAR', x: LABEL_WIDTH - 10, y: 116 },
    { text: 'TEMPORALES', x: LABEL_WIDTH - 10, y: 178 },
    { text: 'LINGUAL', x: LABEL_WIDTH - 10, y: 206 },
    { text: 'TEMPORALES', x: LABEL_WIDTH - 10, y: 234 },
    { text: 'VESTIBULAR', x: LABEL_WIDTH - 10, y: 296 },
    { text: 'MOVILIDAD', x: LABEL_WIDTH - 10, y: 376 },
    { text: 'RECESIÓN', x: LABEL_WIDTH - 10, y: 400 },
  ];

  const teeth: LayoutTooth[] = [];
  const periodontalCells: LayoutPeriodontalCell[] = [];

  // Superiores (col 0 a 15)
  UP_TEETH.forEach((permCode, colIndex) => {
    const colX = columnX(colIndex);

    // Casillas periodontales superiores
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

    // Pieza permanente superior
    teeth.push({
      code: permCode,
      x: colX,
      y: 96,
      size: TOOTH,
      shape: 'square',
      numberX: colX + TOOTH / 2,
      numberY: 90,
    });

    // Pieza temporal superior si existe
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

    // Pieza temporal inferior si existe
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

    // Pieza permanente inferior
    teeth.push({
      code: permCode,
      x: colX,
      y: 276,
      size: TOOTH,
      shape: 'square',
      numberX: colX + TOOTH / 2,
      numberY: 336,
    });

    // Casillas periodontales inferiores
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
