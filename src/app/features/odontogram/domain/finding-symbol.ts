import {
  DentalCondition,
  Finding,
  FindingStatus,
  OdontogramCatalog,
  SurfaceCode,
} from '../models/odontogram.models';
import { getSurfaceName } from './surface-layout';
import { getToothName } from './tooth-names';

export interface FaceMark {
  kind: 'fill' | 'asterisk';
  color: string;
  conditionName: string;
  conditionCode: string;
  status: FindingStatus;
}

export interface ToothMarks {
  faces: Partial<Record<SurfaceCode, FaceMark>>;
  mobility?: { grade: number; color: string };
  recession?: { grade: number; color: string };
  pending009b: Finding[];
}

export interface MarksMap {
  byTooth: Record<number, ToothMarks>;
  pending009b: Finding[];
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

function getOrCreateToothMarks(byTooth: Record<number, ToothMarks>, code: number): ToothMarks {
  if (!byTooth[code]) {
    byTooth[code] = {
      faces: {},
      pending009b: [],
    };
  }
  return byTooth[code];
}

export function buildMarks(findings: Finding[], catalog: OdontogramCatalog): MarksMap {
  const conditionMap = new Map<number, DentalCondition>();
  for (const cond of catalog.conditions) {
    conditionMap.set(cond.id, cond);
  }

  const byTooth: Record<number, ToothMarks> = {};
  const pending009b: Finding[] = [];

  for (const finding of findings) {
    const condition = conditionMap.get(finding.conditionId);
    const conditionCode = condition?.code || '';
    const conditionName = condition?.name || '';
    // Sin símbolo no se inventa un color clínico: gris neutro (el aria-label conserva el hallazgo).
    const color = finding.symbol?.color ?? 'var(--slate-500)';

    // 1. Hallazgo de superficie
    if (finding.surfaceCode) {
      const toothMarks = getOrCreateToothMarks(byTooth, finding.toothCode);
      const isAsterisk = finding.symbol?.shape === 'ASTERISK';
      toothMarks.faces[finding.surfaceCode] = {
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
      const toothMarks = getOrCreateToothMarks(byTooth, finding.toothCode);
      toothMarks.mobility = { grade: finding.grade, color };
      continue;
    }

    if (conditionCode === 'RECESSION' && finding.grade != null) {
      const toothMarks = getOrCreateToothMarks(byTooth, finding.toothCode);
      toothMarks.recession = { grade: finding.grade, color };
      continue;
    }

    // 3. Hallazgos reservados para 009b (TOOTH con otra forma o SPAN)
    pending009b.push(finding);

    // Los asignamos a las piezas afectadas para accesibilidad
    const toothMarks = getOrCreateToothMarks(byTooth, finding.toothCode);
    toothMarks.pending009b.push(finding);

    if (finding.endToothCode && finding.endToothCode !== finding.toothCode) {
      const endMarks = getOrCreateToothMarks(byTooth, finding.endToothCode);
      endMarks.pending009b.push(finding);
    }
  }

  return { byTooth, pending009b };
}

export function buildAccessibleToothLabel(
  toothCode: number,
  catalog: OdontogramCatalog,
  marks?: ToothMarks
): string {
  const toothName = getToothName(toothCode);
  const items: string[] = [];

  if (marks) {
    // Caras en orden
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

    // Hallazgos pendientes 009b
    const condMap = new Map<number, string>(catalog.conditions.map((c) => [c.id, c.name]));
    for (const p of marks.pending009b) {
      const cName = condMap.get(p.conditionId) || 'Hallazgo';
      const statusLabel = p.status === 'PENDING' ? 'Pendiente' : 'Realizado';
      items.push(`${cName} (${statusLabel})`);
    }
  }

  if (items.length === 0) {
    return `${toothCode} ${toothName}: sin hallazgos`;
  }

  return `${toothCode} ${toothName}: ${items.join('; ')}`;
}
