import { Encounter } from '../models/encounter.models';

export type VitalSignField =
  | 'bpSystolic'
  | 'bpDiastolic'
  | 'heartRate'
  | 'temperature'
  | 'respiratoryRate';

export type EncounterTextField =
  | 'stomatognathicExam'
  | 'diagnosticPlan'
  | 'therapeuticPlan'
  | 'educationalPlan';

export type EncounterIndicatorField = 'periodontalDisease' | 'fluorosis' | 'malocclusion';

export type EncounterExtraField = EncounterTextField | EncounterIndicatorField;

interface VitalSignRule {
  min: number;
  max: number;
  decimals: 0 | 1;
}

// Rangos idénticos a los del backend (UpdateEncounterRequest).
export const VITAL_SIGN_RULES: Record<VitalSignField, VitalSignRule> = {
  bpSystolic: { min: 50, max: 260, decimals: 0 },
  bpDiastolic: { min: 30, max: 160, decimals: 0 },
  heartRate: { min: 30, max: 220, decimals: 0 },
  temperature: { min: 34, max: 43, decimals: 1 },
  respiratoryRate: { min: 5, max: 60, decimals: 0 },
};

/** Devuelve el mensaje de error del campo, o null si el valor es válido (null = vacío, válido). */
export function vitalSignError(field: VitalSignField, value: number | null): string | null {
  if (value === null) return null;
  const rule = VITAL_SIGN_RULES[field];
  const hasValidDecimals =
    rule.decimals === 0 ? Number.isInteger(value) : Math.round(value * 10) / 10 === value;
  if (!Number.isFinite(value) || value < rule.min || value > rule.max || !hasValidDecimals) {
    return rule.decimals === 0
      ? `Usa un número entero entre ${rule.min} y ${rule.max}`
      : `Usa un valor entre ${rule.min.toFixed(1)} y ${rule.max.toFixed(1)}, con un decimal`;
  }
  return null;
}

/** Secciones del 033 que faltan para considerarlo completo. Los indicadores y planes son opcionales. */
export function missing033Sections(
  encounter: Pick<Encounter, VitalSignField | 'stomatognathicExam'>
): string[] {
  const missing: string[] = [];
  const vitalSignsComplete = (Object.keys(VITAL_SIGN_RULES) as VitalSignField[]).every(
    (field) => encounter[field] !== null && encounter[field] !== undefined
  );
  if (!vitalSignsComplete) {
    missing.push('signos vitales');
  }
  if (!encounter.stomatognathicExam?.trim()) {
    missing.push('examen');
  }
  return missing;
}
