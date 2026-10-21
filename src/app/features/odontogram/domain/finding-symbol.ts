import {
  Arch,
  DentalCondition,
  Finding,
  FindingStatus,
  OdontogramCatalog,
  SurfaceCode,
  SymbolShape,
} from '../models/odontogram.models';
import { getSurfaceName } from './surface-layout';
import { getToothName } from './tooth-names';
import {
  getArch,
  LO_TEETH,
  toPermanentHomologue,
  UP_TEETH,
} from './odontogram-layout';

export interface FaceMark {
  kind: 'fill' | 'asterisk';
  color: string;
  conditionName: string;
  conditionCode: string;
  status: FindingStatus;
}

export interface ToothMarkItem {
  shape: SymbolShape;
  color: string;
  secondaryColor: string | null;
  filled: boolean;
  conditionCode: string;
  conditionName: string;
  status: FindingStatus;
}

export interface ToothMarks {
  faces: Partial<Record<SurfaceCode, FaceMark>>;
  mobility?: { grade: number; color: string };
  recession?: { grade: number; color: string };
  toothMarks: ToothMarkItem[];
  missing: boolean;
}

export interface SpanItem {
  startCode: number;
  endCode: number;
  arch: Arch;
  shape: SymbolShape;
  color: string;
  lineStyle: 'SOLID' | 'DOTTED';
  conditionName: string;
  status: FindingStatus;
}

export interface MarksMap {
  byTooth: Record<number, ToothMarks>;
  spans: SpanItem[];
}

export function toRomanNumeral(grade: number): string {
  switch (grade) {
    case 1:
      return 'I';
    case 2:
      return 'II';
    case 3:
      return 'III';
    case 4:
      return 'IV';
    default:
      return String(grade);
  }
}

const SHAPE_DRAWING_ORDER: Record<string, number> = {
  RECTANGLE: 1,
  DOUBLE_SQUARE: 2,
  TRIANGLE: 3,
  CIRCLE_CROSS: 4,
  CROSS: 5,
};

function getOrCreateToothMarks(byTooth: Record<number, ToothMarks>, code: number): ToothMarks {
  if (!byTooth[code]) {
    byTooth[code] = {
      faces: {},
      toothMarks: [],
      missing: false,
    };
  }
  return byTooth[code];
}

export function isToothInSpan(toothCode: number, span: SpanItem): boolean {
  const toothArch = getArch(toothCode);
  if (toothArch !== span.arch) {
    return false;
  }

  const permTooth = toPermanentHomologue(toothCode);
  const permStart = toPermanentHomologue(span.startCode);
  const permEnd = toPermanentHomologue(span.endCode);

  const archTeeth: readonly number[] = span.arch === 'UPPER' ? UP_TEETH : LO_TEETH;
  const toothIdx = archTeeth.indexOf(permTooth);
  const startIdx = archTeeth.indexOf(permStart);
  const endIdx = archTeeth.indexOf(permEnd);

  if (toothIdx === -1 || startIdx === -1 || endIdx === -1) {
    return false;
  }

  const minIdx = Math.min(startIdx, endIdx);
  const maxIdx = Math.max(startIdx, endIdx);
  return toothIdx >= minIdx && toothIdx <= maxIdx;
}

export function buildMarks(findings: Finding[], catalog: OdontogramCatalog): MarksMap {
  const conditionMap = new Map<number, DentalCondition>();
  for (const cond of catalog.conditions) {
    conditionMap.set(cond.id, cond);
  }

  const byTooth: Record<number, ToothMarks> = {};
  const spans: SpanItem[] = [];

  for (const finding of findings) {
    const condition = conditionMap.get(finding.conditionId);
    const conditionCode = condition?.code || '';
    const conditionName = condition?.name || '';
    const color = finding.symbol?.color ?? 'var(--slate-500)';

    // 1. Hallazgo de superficie
    if (finding.surfaceCode) {
      const marks = getOrCreateToothMarks(byTooth, finding.toothCode);
      const isAsterisk = finding.symbol?.shape === 'ASTERISK';
      marks.faces[finding.surfaceCode] = {
        kind: isAsterisk ? 'asterisk' : 'fill',
        color,
        conditionName,
        conditionCode,
        status: finding.status,
      };
      continue;
    }

    // 2. Hallazgo periodontal (MOBILITY / RECESSION)
    if (conditionCode === 'MOBILITY' && finding.grade != null) {
      const marks = getOrCreateToothMarks(byTooth, finding.toothCode);
      marks.mobility = { grade: finding.grade, color };
      continue;
    }

    if (conditionCode === 'RECESSION' && finding.grade != null) {
      const marks = getOrCreateToothMarks(byTooth, finding.toothCode);
      marks.recession = { grade: finding.grade, color };
      continue;
    }

    // 3. Hallazgos en rango (SPAN)
    if (condition?.scope === 'SPAN') {
      const startCode = finding.toothCode;
      const endCode = finding.endToothCode ?? finding.toothCode;
      const arch = getArch(startCode);
      const shape = finding.symbol?.shape ?? 'SQUARES_LINE';
      const lineStyle = finding.symbol?.lineStyle ?? 'SOLID';

      spans.push({
        startCode,
        endCode,
        arch,
        shape,
        color,
        lineStyle,
        conditionName,
        status: finding.status,
      });
      continue;
    }

    // 4. Hallazgos de pieza completa (TOOTH)
    const marks = getOrCreateToothMarks(byTooth, finding.toothCode);
    if (conditionCode === 'MISSING_CARIES' || conditionCode === 'MISSING_OTHER') {
      marks.missing = true;
    }

    if (finding.symbol?.shape && finding.symbol.shape !== 'NUMBER') {
      marks.toothMarks.push({
        shape: finding.symbol.shape,
        color,
        secondaryColor: finding.symbol.secondaryColor ?? null,
        filled: finding.symbol.filled ?? false,
        conditionCode,
        conditionName,
        status: finding.status,
      });
    }
  }

  // Ordenar marcas de cada pieza de abajo a arriba
  for (const marks of Object.values(byTooth)) {
    marks.toothMarks.sort(
      (a, b) => (SHAPE_DRAWING_ORDER[a.shape] ?? 99) - (SHAPE_DRAWING_ORDER[b.shape] ?? 99)
    );
  }

  return { byTooth, spans };
}

export function buildAccessibleToothLabel(
  toothCode: number,
  catalog: OdontogramCatalog,
  marks?: ToothMarks,
  spans?: SpanItem[]
): string {
  const toothName = getToothName(toothCode);
  const items: string[] = [];

  if (marks) {
    // Caras en orden V, L/P, M, D, O
    const facesOrder: SurfaceCode[] = ['V', 'L', 'M', 'D', 'O'];
    for (const face of facesOrder) {
      const faceMark = marks.faces[face];
      if (faceMark) {
        const sName = getSurfaceName(toothCode, face);
        const statusLabel = faceMark.status === 'PENDING' ? 'Pendiente' : 'Realizado';
        items.push(`${sName} ${faceMark.conditionName} (${statusLabel})`);
      }
    }

    // Movilidad
    if (marks.mobility) {
      items.push(`movilidad ${marks.mobility.grade}`);
    }

    // Recesión
    if (marks.recession) {
      items.push(`recesión ${toRomanNumeral(marks.recession.grade)}`);
    }

    // Marcas de pieza
    for (const tm of marks.toothMarks) {
      const statusLabel = tm.status === 'PENDING' ? 'Pendiente' : 'Realizado';
      items.push(`${tm.conditionName} (${statusLabel})`);
    }
  }

  // Prótesis en rango que incluyan a esta pieza
  if (spans) {
    for (const span of spans) {
      if (isToothInSpan(toothCode, span)) {
        const statusLabel = span.status === 'PENDING' ? 'Pendiente' : 'Realizado';
        items.push(`${span.conditionName} de ${span.startCode} a ${span.endCode} (${statusLabel})`);
      }
    }
  }

  const isMissing = marks?.missing ?? false;
  const prefix = isMissing ? 'ausente: ' : '';

  if (items.length === 0) {
    return `${prefix}${toothCode} ${toothName}: sin hallazgos`;
  }

  return `${prefix}${toothCode} ${toothName}: ${items.join('; ')}`;
}
