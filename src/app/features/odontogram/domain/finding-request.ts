import {
  CreateFindingRequest,
  DentalCondition,
  Finding,
  FindingStatus,
  OdontogramCatalog,
  SurfaceCode,
} from '../models/odontogram.models';
import { getSurfaceName } from './surface-layout';

export interface CreateFindingParams {
  toothCode: number;
  surfaceCode?: SurfaceCode | null;
  condition: DentalCondition;
  status: FindingStatus;
  grade?: number | null;
  notes?: string | null;
}

/**
 * Estados que tienen símbolo configurado en el catálogo para esta condición.
 */
export function allowedStatuses(condition: DentalCondition): FindingStatus[] {
  if (!condition.symbols || condition.symbols.length === 0) {
    return ['PENDING'];
  }
  const statuses = Array.from(new Set(condition.symbols.map((s) => s.status)));
  return statuses.length > 0 ? statuses : ['PENDING'];
}

/**
 * Determina el estado efectivo para una condición dada la preferencia seleccionada.
 * Si la condición solo admite un estado, siempre devuelve ese estado único.
 */
export function effectiveStatus(
  condition: DentalCondition,
  selectedStatus: FindingStatus
): FindingStatus {
  const allowed = allowedStatuses(condition);
  if (allowed.includes(selectedStatus)) {
    return selectedStatus;
  }
  return allowed[0] ?? 'PENDING';
}

/**
 * Construye el body CreateFindingRequest según las reglas del contrato backend.
 */
export function createRequest(params: CreateFindingParams): CreateFindingRequest {
  const effective = effectiveStatus(params.condition, params.status);
  const req: CreateFindingRequest = {
    toothCode: params.toothCode,
    conditionId: params.condition.id,
    status: effective,
  };

  if (params.condition.scope === 'SURFACE' && params.surfaceCode) {
    req.surfaceCode = params.surfaceCode;
  }

  if (
    params.condition.gradeMin != null &&
    params.condition.gradeMax != null &&
    params.grade != null
  ) {
    req.grade = params.grade;
  }

  if (params.condition.code === 'OTHER' && params.notes) {
    req.notes = params.notes.trim();
  }

  return req;
}

/**
 * Genera el texto descriptivo para lastAction ("Caries registrada en 16 mesial").
 */
export function buildFindingDescription(
  condition: DentalCondition | undefined,
  toothCode: number,
  surfaceCode?: SurfaceCode | null,
  grade?: number | null
): string {
  const condName = condition?.name ?? 'Hallazgo';
  if (condition?.scope === 'SURFACE' && surfaceCode) {
    const sName = getSurfaceName(toothCode, surfaceCode);
    return `${condName} registrada en ${toothCode} ${sName}`;
  }
  if (grade != null) {
    return `${condName} (grado ${grade}) registrada en ${toothCode}`;
  }
  return `${condName} registrada en ${toothCode}`;
}

/**
 * Devuelve la descripción de ubicación para un hallazgo en la lista de vigentes:
 * cara ('mesial', 'oclusal') | 'pieza' | 'grado 2' | 'de 15 a 13'
 */
export function getFindingWhere(finding: Finding): string {
  if (finding.endToothCode != null) {
    return `de ${finding.toothCode} a ${finding.endToothCode}`;
  }
  if (finding.surfaceCode != null) {
    return finding.surfaceLabel || getSurfaceName(finding.toothCode, finding.surfaceCode);
  }
  if (finding.grade != null) {
    return `grado ${finding.grade}`;
  }
  return 'pieza';
}

/**
 * Obtiene el nombre de la condición de un hallazgo utilizando el catálogo si está disponible.
 */
export function getConditionName(finding: Finding, catalog?: OdontogramCatalog | null): string {
  if (catalog?.conditions) {
    const cond = catalog.conditions.find((c) => c.id === finding.conditionId);
    if (cond) return cond.name;
  }
  return 'Hallazgo';
}
