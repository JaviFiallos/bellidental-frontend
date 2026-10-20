import { MedicalHistoryCondition, HistoryEntry } from '../models/clinical-record.models';
import { ClinicalSession, ClinicalSummaryDiagnosis } from '../models/clinical-summary.models';
import { Diagnosis, Encounter } from '../models/encounter.models';

export interface Form033AgeGroupMarks {
  menor1: boolean;
  de1a4: boolean;
  de5a9Prog: boolean;
  de5a14NoProg: boolean;
  de10a14Prog: boolean;
  de15a19: boolean;
  mayor20: boolean;
  embarazada: boolean;
}

export interface Form033HistoryResult {
  conditionMarks: Record<number, boolean>;
  lines: string[];
}

export interface Form033VitalSigns {
  bp: string;
  heartRate: string;
  temperature: string;
  respiratoryRate: string;
}

export interface Form033PlanMarks {
  biometria: boolean;
  quimicaSanguinea: boolean;
  rayosX: boolean;
  otros: boolean;
}

export interface Form033DiagnosisItem {
  index: number;
  code: string;
  description: string;
  isPresumptive: boolean;
  isDefinitive: boolean;
}

export type Form033Severity = 'LEVE' | 'MODERADA' | 'SEVERA';
export type Form033Malocclusion = 'ANGLE_I' | 'ANGLE_II' | 'ANGLE_III';

export interface Form033OralHealthMarks {
  periodontal: Form033Severity | null;
  malocclusion: Form033Malocclusion | null;
  fluorosis: Form033Severity | null;
}

const CLINIC_TIME_ZONE = 'America/Guayaquil';
const CLINIC_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const clinicDateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Devuelve la fecha calendario (YYYY-MM-DD) de un valor del backend. Las fechas sin hora (LocalDate)
 * se usan tal cual; los instantes con zona (OffsetDateTime) se convierten a America/Guayaquil.
 * Retorna cadena vacía si el valor no es una fecha válida.
 */
export function toClinicDateKey(value: string | null | undefined): string {
  if (!value) return '';
  if (CLINIC_DATE_KEY_PATTERN.test(value)) return value;
  const instant = new Date(value);
  if (isNaN(instant.getTime())) return '';
  return clinicDateKeyFormatter.format(instant);
}

/**
 * Formatea una fecha del backend como dd/MM/yyyy en America/Guayaquil.
 */
export function formatClinicDate(value: string | null | undefined): string {
  const [year, month, day] = toClinicDateKey(value).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
}

/**
 * Calcula la edad en años cumplidos entre la fecha de nacimiento y la fecha de referencia (zona de la clínica).
 */
export function calculateAgeAtDate(birthDateStr: string, referenceDateStr: string): number {
  const referenceKey = toClinicDateKey(referenceDateStr);
  if (!birthDateStr || !referenceKey) return 0;
  const [birthYear, birthMonth, birthDay] = birthDateStr.slice(0, 10).split('-').map(Number);
  const [referenceYear, referenceMonth, referenceDay] = referenceKey.split('-').map(Number);
  let age = referenceYear - birthYear;
  if (referenceMonth < birthMonth || (referenceMonth === birthMonth && referenceDay < birthDay)) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Convierte un texto libre en renglones (uno por salto de línea), descartando las líneas en blanco.
 */
export function splitTextLines(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Completa las líneas con renglones vacíos hasta `minimumCount`: el formulario dibuja los renglones aunque estén vacíos.
 * Si hay más líneas que renglones, se muestran todas.
 */
export function toRuledLines(lines: string[], minimumCount: number): string[] {
  const missing = Math.max(0, minimumCount - lines.length);
  return [...lines, ...Array.from({ length: missing }, () => '')];
}

/**
 * Determina las marcas X para los 8 grupos de edad del formulario 033.
 */
export function getAgeGroupMarks(age: number): Form033AgeGroupMarks {
  return {
    menor1: age < 1,
    de1a4: age >= 1 && age <= 4,
    de5a9Prog: false,
    de5a14NoProg: age >= 5 && age <= 14,
    de10a14Prog: false,
    de15a19: age >= 15 && age <= 19,
    mayor20: age >= 20,
    embarazada: false,
  };
}

/**
 * Resuelve las marcas de antecedentes por condición y las líneas descriptivas.
 */
export function getHistoryMarks(
  conditions: MedicalHistoryCondition[],
  entries: HistoryEntry[],
  noKnownHistory: boolean,
  currentMedication?: string | null
): Form033HistoryResult {
  const activeEntries = (entries || []).filter((e) => e.active);
  const conditionMarks: Record<number, boolean> = {};

  for (const cond of conditions) {
    const hasActive = activeEntries.some((e) => e.conditionId === cond.id);
    conditionMarks[cond.id] = hasActive;
  }

  const lines: string[] = [];

  if (activeEntries.length === 0) {
    if (noKnownHistory) {
      lines.push('NO REFIERE ANTECEDENTES PERSONALES NI FAMILIARES');
    }
  } else {
    const hasPersonal = activeEntries.some((e) => e.scope === 'PERSONAL');
    if (!hasPersonal) {
      lines.push('No refiere antecedentes personales');
    }

    const sortedEntries = [...activeEntries].sort((a, b) => {
      const condA = conditions.find((c) => c.id === a.conditionId);
      const condB = conditions.find((c) => c.id === b.conditionId);
      return (condA?.displayOrder ?? 99) - (condB?.displayOrder ?? 99);
    });

    for (const entry of sortedEntries) {
      const cond = conditions.find((c) => c.id === entry.conditionId);
      const order = cond?.displayOrder ?? '';
      const name = cond?.name ?? entry.conditionName;

      let lineText = '';
      if (entry.scope === 'PERSONAL') {
        lineText = `${order}. ${name} (personal)`;
      } else {
        const rel = entry.relative ? `, ${entry.relative}` : '';
        lineText = `${order}. ${name} (familiar${rel})`;
      }

      if (entry.description?.trim()) {
        lineText += `: ${entry.description.trim()}`;
      }
      lines.push(lineText);
    }
  }

  if (currentMedication?.trim()) {
    lines.push(`Medicación actual: ${currentMedication.trim()}`);
  }

  return { conditionMarks, lines };
}

/**
 * Formatea los signos vitales del encounter.
 */
export function formatVitalSigns(encounter: Encounter | null): Form033VitalSigns {
  if (!encounter) {
    return { bp: '', heartRate: '', temperature: '', respiratoryRate: '' };
  }

  let bp = '';
  if (encounter.bpSystolic != null && encounter.bpDiastolic != null) {
    bp = `${encounter.bpSystolic}/${encounter.bpDiastolic}`;
  }

  const heartRate = encounter.heartRate != null ? String(encounter.heartRate) : '';
  const temperature = encounter.temperature != null ? encounter.temperature.toFixed(1) : '';
  const respiratoryRate = encounter.respiratoryRate != null ? String(encounter.respiratoryRate) : '';

  return { bp, heartRate, temperature, respiratoryRate };
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Determina las casillas marcadas de planes y genera las líneas de texto.
 */
export function getPlanMarks(
  diagnosticPlan?: string | null,
  therapeuticPlan?: string | null,
  educationalPlan?: string | null
): { marks: Form033PlanMarks; lines: string[] } {
  const normDiag = diagnosticPlan ? normalizeText(diagnosticPlan) : '';

  const biometria = normDiag.includes('biometria');
  const quimicaSanguinea = normDiag.includes('quimica sanguinea');
  const rayosX = /\brx\b|\brayos[ -]x\b/.test(normDiag);

  const marks: Form033PlanMarks = {
    biometria,
    quimicaSanguinea,
    rayosX,
    otros: false,
  };

  const lines: string[] = [];
  if (diagnosticPlan?.trim()) {
    lines.push(`Diagnóstico: ${diagnosticPlan.trim()}`);
  }
  if (therapeuticPlan?.trim()) {
    lines.push(`Terapéutico: ${therapeuticPlan.trim()}`);
  }
  if (educationalPlan?.trim()) {
    lines.push(`Educacional: ${educationalPlan.trim()}`);
  }

  return { marks, lines };
}

/**
 * Obtiene los primeros 4 diagnósticos no anulados para la sección 11.
 */
export function getFirst4Diagnoses(
  diagnoses: Diagnosis[] | ClinicalSummaryDiagnosis[] | undefined
): Form033DiagnosisItem[] {
  const active = (diagnoses || []).filter((d) => {
    return !('voidedAt' in d) || !d.voidedAt;
  });

  const items: Form033DiagnosisItem[] = [];
  for (let i = 0; i < 4; i++) {
    const d = active[i];
    if (d) {
      items.push({
        index: i + 1,
        code: d.code || '',
        description: d.description || '',
        isPresumptive: d.certainty === 'PRESUMPTIVE',
        isDefinitive: d.certainty === 'DEFINITIVE',
      });
    } else {
      items.push({
        index: i + 1,
        code: '',
        description: '',
        isPresumptive: false,
        isDefinitive: false,
      });
    }
  }

  return items;
}

const SEVERITY_VALUES: readonly Form033Severity[] = ['LEVE', 'MODERADA', 'SEVERA'];
const MALOCCLUSION_VALUES: readonly Form033Malocclusion[] = ['ANGLE_I', 'ANGLE_II', 'ANGLE_III'];

function matchValue<T extends string>(value: string | null | undefined, options: readonly T[]): T | null {
  return options.find((option) => option === value) ?? null;
}

/**
 * Indicadores de salud bucal de la atención: compara con los valores exactos que acepta el backend.
 */
export function getOralHealthIndicators(encounter: Encounter | null): Form033OralHealthMarks {
  return {
    periodontal: matchValue(encounter?.periodontalDisease, SEVERITY_VALUES),
    malocclusion: matchValue(encounter?.malocclusion, MALOCCLUSION_VALUES),
    fluorosis: matchValue(encounter?.fluorosis, SEVERITY_VALUES),
  };
}

/** Renglones de la sección 12 que caben en una hoja 2 (4 por sesión × 9 sesiones del papel). */
export const FORM033_TREATMENT_ROWS_PER_SHEET = 36;

/** Renglones mínimos de cada sesión: el formulario dibuja 4 por sesión. */
export const FORM033_SESSION_MIN_ROWS = 4;

/**
 * Caracteres que caben en un renglón de cada columna de la sección 12 (Arial 6,5 pt, con margen de seguridad).
 * Son estimaciones: si la vista previa corta una línea, bajar el valor de la columna.
 */
const FORM033_TREATMENT_CHARS = {
  diagnoses: 34,
  procedures: 36,
  prescriptions: 30,
} as const;

export interface Form033TreatmentSession {
  /** null en las sesiones en blanco que completan la hoja. */
  sessionNumber: number | null;
  date: string;
  professionalCode: string;
  rowCount: number;
  diagnosisRows: string[];
  procedureRows: string[];
  prescriptionRows: string[];
}

/**
 * Parte un texto en renglones de como máximo `capacity` caracteres, cortando por palabras
 * (una palabra más larga que el renglón se parte a la fuerza).
 */
export function wrapTreatmentText(text: string, capacity: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter((part) => part.length > 0)) {
    let remaining = word;
    while (remaining.length > capacity) {
      if (current) {
        lines.push(current);
        current = '';
      }
      lines.push(remaining.slice(0, capacity));
      remaining = remaining.slice(capacity);
    }
    if (!current) {
      current = remaining;
    } else if (`${current} ${remaining}`.length <= capacity) {
      current = `${current} ${remaining}`;
    } else {
      lines.push(current);
      current = remaining;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

function wrapEachLine(lines: string[], capacity: number): string[] {
  return lines.flatMap((line) => wrapTreatmentText(line, capacity));
}

function createBlankTreatmentSession(rowCount: number): Form033TreatmentSession {
  return {
    sessionNumber: null,
    date: '',
    professionalCode: '',
    rowCount,
    diagnosisRows: toRuledLines([], rowCount),
    procedureRows: toRuledLines([], rowCount),
    prescriptionRows: toRuledLines([], rowCount),
  };
}

/**
 * Convierte una sesión clínica en los renglones de la sección 12. Cada sesión ocupa al menos 4 renglones y
 * crece con su columna más larga; las columnas se completan con renglones vacíos hasta esa altura.
 */
export function buildTreatmentSession(session: ClinicalSession): Form033TreatmentSession {
  const diagnosisLines = wrapEachLine(
    (session.diagnoses ?? []).map(formatDiagnosisLine),
    FORM033_TREATMENT_CHARS.diagnoses
  );
  const procedureLines = wrapEachLine(
    (session.treatments ?? []).map(formatTreatmentLine),
    FORM033_TREATMENT_CHARS.procedures
  );
  const prescriptionLines = wrapEachLine(
    formatPrescriptionLines(session.prescriptions),
    FORM033_TREATMENT_CHARS.prescriptions
  );
  const rowCount = Math.max(
    FORM033_SESSION_MIN_ROWS,
    diagnosisLines.length,
    procedureLines.length,
    prescriptionLines.length
  );

  return {
    sessionNumber: session.sessionNumber,
    date: formatSessionDate(session.startAt),
    professionalCode: session.professional?.licenseNumber || '',
    rowCount,
    diagnosisRows: toRuledLines(diagnosisLines, rowCount),
    procedureRows: toRuledLines(procedureLines, rowCount),
    prescriptionRows: toRuledLines(prescriptionLines, rowCount),
  };
}

/**
 * Completa una hoja con sesiones en blanco hasta llenar sus renglones: en el papel las 9 filas se dibujan siempre.
 * Cada sesión en blanco ocupa 4 renglones; el sobrante se suma a la última.
 */
function fillSheetWithBlankSessions(sheet: Form033TreatmentSession[]): Form033TreatmentSession[] {
  const usedRows = sheet.reduce((total, session) => total + session.rowCount, 0);
  const remainingRows = FORM033_TREATMENT_ROWS_PER_SHEET - usedRows;
  if (remainingRows <= 0) {
    return sheet;
  }
  const blankCount = Math.max(1, Math.floor(remainingRows / FORM033_SESSION_MIN_ROWS));
  const blanks = Array.from({ length: blankCount }, (_, index) =>
    createBlankTreatmentSession(
      index === blankCount - 1 ? remainingRows - index * FORM033_SESSION_MIN_ROWS : FORM033_SESSION_MIN_ROWS
    )
  );
  return [...sheet, ...blanks];
}

/**
 * Reparte las sesiones en hojas 2 según sus renglones: una sesión pasa entera a la hoja siguiente si no cabe,
 * nunca se corta. Cada hoja se completa con sesiones en blanco. Retorna al menos una hoja.
 */
export function chunkTreatmentSessionsForSheets(
  sessions: ClinicalSession[] | undefined | null
): Form033TreatmentSession[][] {
  const sheets: Form033TreatmentSession[][] = [];
  let current: Form033TreatmentSession[] = [];
  let usedRows = 0;

  for (const session of (sessions ?? []).map(buildTreatmentSession)) {
    if (current.length > 0 && usedRows + session.rowCount > FORM033_TREATMENT_ROWS_PER_SHEET) {
      sheets.push(current);
      current = [];
      usedRows = 0;
    }
    current.push(session);
    usedRows += session.rowCount;
  }
  sheets.push(current);

  return sheets.map(fillSheetWithBlankSessions);
}

/**
 * Formatea una fecha de sesión a dd/MM/yyyy en America/Guayaquil.
 */
export function formatSessionDate(dateStr: string | null | undefined): string {
  return formatClinicDate(dateStr);
}

/**
 * Formatea una línea de diagnóstico para la sección 12: K02.1 Caries de la dentina (DEF) — notas
 */
export function formatDiagnosisLine(d: ClinicalSummaryDiagnosis): string {
  const cert = d.certainty === 'DEFINITIVE' ? 'DEF' : 'PRE';
  const desc = d.description ? ` ${d.description}` : '';
  const base = `${d.code}${desc} (${cert})`.trim();
  if (d.notes?.trim()) {
    return `${base} — ${d.notes.trim()}`;
  }
  return base;
}

/**
 * Formatea una línea de procedimiento para la sección 12: D2391 Resina 1 cara · 16 O ×2
 */
export function formatTreatmentLine(t: {
  code: string;
  name: string;
  toothCode?: number | null;
  surfaceCode?: string | null;
  quantity?: number | null;
}): string {
  let toothFace = '';
  if (t.toothCode || t.surfaceCode) {
    const parts: string[] = [];
    if (t.toothCode) parts.push(String(t.toothCode));
    if (t.surfaceCode) parts.push(t.surfaceCode);
    toothFace = ` · ${parts.join(' ')}`;
  }
  const qty = t.quantity && t.quantity > 1 ? ` ×${t.quantity}` : '';
  return `${t.code} ${t.name}${toothFace}${qty}`.trim();
}

/**
 * Formatea las líneas de prescripciones para la sección 12: Amoxicilina 500 mg cápsula — 1 c/8 h, 7 días
 */
export function formatPrescriptionLines(
  prescriptions: {
    generalInstructions?: string | null;
    items: {
      medicationName: string;
      concentration?: string | null;
      presentation?: string | null;
      dose?: string | null;
      frequency?: string | null;
      duration?: string | null;
      quantity?: string | null;
    }[];
  }[] | undefined | null
): string[] {
  const lines: string[] = [];
  for (const rx of prescriptions || []) {
    for (const item of rx.items || []) {
      const medParts = [item.medicationName, item.concentration, item.presentation].filter(Boolean);
      const medText = medParts.join(' ').trim();
      const posParts = [item.dose, item.frequency, item.duration].filter(Boolean);
      const posText = posParts.join(', ').trim();
      if (medText && posText) {
        lines.push(`${medText} — ${posText}`);
      } else if (medText) {
        lines.push(medText);
      } else if (posText) {
        lines.push(posText);
      }
    }
    if (rx.generalInstructions?.trim()) {
      lines.push(`Indicaciones: ${rx.generalInstructions.trim()}`);
    }
  }
  return lines;
}

