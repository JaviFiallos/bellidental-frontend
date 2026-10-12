import { SurfaceCode } from '../models/odontogram.models';

export type RegionPosition = 'top' | 'right' | 'bottom' | 'left' | 'center';

export interface RegionGeom {
  position: RegionPosition;
  path: string;
  centroid: [number, number];
}

export function isUpperTooth(code: number): boolean {
  const quadrant = Math.floor(code / 10);
  return quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;
}

export function isLeftDistalTooth(code: number): boolean {
  const quadrant = Math.floor(code / 10);
  return quadrant === 1 || quadrant === 4 || quadrant === 5 || quadrant === 8;
}

/**
 * Región → Cara según el cuadrante y arcada de la pieza (Criterio 11)
 */
export function getRegionFace(toothCode: number, region: RegionPosition): SurfaceCode {
  if (region === 'center') return 'O';
  const upper = isUpperTooth(toothCode);
  const leftDistal = isLeftDistalTooth(toothCode);

  if (region === 'top') {
    return upper ? 'V' : 'L';
  }
  if (region === 'bottom') {
    return upper ? 'L' : 'V';
  }
  if (region === 'left') {
    return leftDistal ? 'D' : 'M';
  }
  // region === 'right'
  return leftDistal ? 'M' : 'D';
}

/**
 * Cara → Región (inversa de getRegionFace)
 */
export function getFaceRegion(toothCode: number, face: SurfaceCode): RegionPosition {
  if (face === 'O') return 'center';
  const upper = isUpperTooth(toothCode);
  const leftDistal = isLeftDistalTooth(toothCode);

  if (face === 'V') {
    return upper ? 'top' : 'bottom';
  }
  if (face === 'L') {
    return upper ? 'bottom' : 'top';
  }
  if (face === 'M') {
    return leftDistal ? 'right' : 'left';
  }
  // face === 'D'
  return leftDistal ? 'left' : 'right';
}

/**
 * Nombre en minúsculas de la cara clínica (Criterio 12)
 */
export function getSurfaceName(toothCode: number, face: SurfaceCode): string {
  if (face === 'V') return 'vestibular';
  if (face === 'M') return 'mesial';
  if (face === 'D') return 'distal';
  if (face === 'L') {
    return isUpperTooth(toothCode) ? 'palatina' : 'lingual';
  }
  if (face === 'O') {
    const pos = toothCode % 10;
    return pos <= 3 ? 'incisal' : 'oclusal';
  }
  return face;
}

/**
 * Geometría de las 5 regiones de una pieza cuadrada o circular (Criterio 10)
 */
export function buildRegionPaths(
  x: number,
  y: number,
  s: number,
  shape: 'square' | 'circle'
): Record<RegionPosition, RegionGeom> {
  if (shape === 'square') {
    const k = s * 0.3;
    const r2 = (n: number) => Number(n.toFixed(2));

    const t = `M${r2(x)} ${r2(y)}L${r2(x + s)} ${r2(y)}L${r2(x + s - k)} ${r2(y + k)}L${r2(x + k)} ${r2(y + k)}Z`;
    const r = `M${r2(x + s)} ${r2(y)}L${r2(x + s)} ${r2(y + s)}L${r2(x + s - k)} ${r2(y + s - k)}L${r2(x + s - k)} ${r2(y + k)}Z`;
    const b = `M${r2(x)} ${r2(y + s)}L${r2(x + s)} ${r2(y + s)}L${r2(x + s - k)} ${r2(y + s - k)}L${r2(x + k)} ${r2(y + s - k)}Z`;
    const l = `M${r2(x)} ${r2(y)}L${r2(x + k)} ${r2(y + k)}L${r2(x + k)} ${r2(y + s - k)}L${r2(x)} ${r2(y + s)}Z`;
    const c = `M${r2(x + k)} ${r2(y + k)}h${r2(s - 2 * k)}v${r2(s - 2 * k)}h${r2(-(s - 2 * k))}Z`;

    return {
      top: { position: 'top', path: t, centroid: [r2(x + s / 2), r2(y + k / 2)] },
      right: { position: 'right', path: r, centroid: [r2(x + s - k / 2), r2(y + s / 2)] },
      bottom: { position: 'bottom', path: b, centroid: [r2(x + s / 2), r2(y + s - k / 2)] },
      left: { position: 'left', path: l, centroid: [r2(x + k / 2), r2(y + s / 2)] },
      center: { position: 'center', path: c, centroid: [r2(x + s / 2), r2(y + s / 2)] },
    };
  }

  // shape === 'circle' (temporal)
  const cx = x + s / 2;
  const cy = y + s / 2;
  const R = s / 2;
  const r = s * 0.22;
  const pt = (rad: number, deg: number) => [
    cx + rad * Math.cos((deg * Math.PI) / 180),
    cy + rad * Math.sin((deg * Math.PI) / 180),
  ];
  const r2 = (n: number) => Number(n.toFixed(2));

  const sector = (a1: number, a2: number) => {
    const [x1, y1] = pt(R, a1);
    const [x2, y2] = pt(R, a2);
    const [x3, y3] = pt(r, a2);
    const [x4, y4] = pt(r, a1);
    return `M${r2(x1)} ${r2(y1)}A${r2(R)} ${r2(R)} 0 0 1 ${r2(x2)} ${r2(y2)}L${r2(x3)} ${r2(y3)}A${r2(r)} ${r2(r)} 0 0 0 ${r2(x4)} ${r2(y4)}Z`;
  };

  const midR = (R + r) / 2;
  return {
    top: {
      position: 'top',
      path: sector(-135, -45),
      centroid: [r2(cx), r2(cy - midR)],
    },
    right: {
      position: 'right',
      path: sector(-45, 45),
      centroid: [r2(cx + midR), r2(cy)],
    },
    bottom: {
      position: 'bottom',
      path: sector(45, 135),
      centroid: [r2(cx), r2(cy + midR)],
    },
    left: {
      position: 'left',
      path: sector(135, 225),
      centroid: [r2(cx - midR), r2(cy)],
    },
    center: {
      position: 'center',
      path: `M${r2(cx - r)} ${r2(cy)}a${r2(r)} ${r2(r)} 0 1 0 ${r2(2 * r)} 0a${r2(r)} ${r2(r)} 0 1 0 ${r2(-2 * r)} 0Z`,
      centroid: [r2(cx), r2(cy)],
    },
  };
}

/**
 * Dibuja un asterisco de 3 segmentos cruzados en el centroide de la región (Criterio 14 / 009b Criterio 3)
 */
export function buildAsteriskPath(
  centroid: [number, number],
  s: number,
  position?: RegionPosition
): string {
  const [cx, cy] = centroid;
  const regionHeight = position === 'center' ? 0.4 * s : 0.3 * s;
  const maxLen = Math.min(0.36 * s, 0.9 * regionHeight);
  const h = maxLen / 2; // mitad de longitud total
  const dx = h * 0.5; // cos(60°) = 0.5
  const dy = h * (Math.sqrt(3) / 2); // sin(60°) = ~0.866
  const r2 = (n: number) => Number(n.toFixed(2));

  // 0° (horizontal)
  const l1 = `M${r2(cx - h)} ${r2(cy)}L${r2(cx + h)} ${r2(cy)}`;
  // 60°
  const l2 = `M${r2(cx - dx)} ${r2(cy - dy)}L${r2(cx + dx)} ${r2(cy + dy)}`;
  // 120°
  const l3 = `M${r2(cx + dx)} ${r2(cy - dy)}L${r2(cx - dx)} ${r2(cy + dy)}`;

  return `${l1}${l2}${l3}`;
}
