import { AuditEntry } from '../models/audit.models';
import { toEcuadorLocal } from '../../../shared/utils/e164';

/** Campos internos (ids, UUID, fechas técnicas) que el director no debe ver. */
export const HIDDEN_AUDIT_FIELDS: ReadonlySet<string> = new Set([
  'id',
  'dentalFindingId',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'googleEventId',
  'patientId',
  'patient',
  'encounterId',
  'appointmentId',
  'professionalId',
  'specialtyId',
  'treatmentId',
  'icd10Id',
  'encounterDiagnosisId',
  'dentalConditionId',
  'condition',
  'clinicalRecord',
  'prescriptionId',
  'medicationId',
  'medicationPresetId',
  'openedBy',
  'receivedBy',
  'createdBy',
  'rescheduledFromId',
]);

export const AUDIT_FIELD_LABELS: Readonly<Record<string, string>> = {
  chiefComplaint: 'Motivo de consulta',
  currentIllness: 'Enfermedad actual',
  bpSystolic: 'Presión sistólica',
  bpDiastolic: 'Presión diastólica',
  heartRate: 'Frecuencia cardiaca',
  temperature: 'Temperatura',
  respiratoryRate: 'Frecuencia respiratoria',
  stomatognathicExam: 'Examen estomatognático',
  stomatognathicRegions: 'Regiones del examen',
  periodontalDisease: 'Enfermedad periodontal',
  malocclusion: 'Maloclusión',
  fluorosis: 'Fluorosis',
  diagnosticExams: 'Exámenes del plan',
  planDescription: 'Descripción del plan',
  status: 'Estado',
  startAt: 'Inicio',
  endAt: 'Fin',
  closedAt: 'Cerrada el',
  voidedAt: 'Anulado el',
  voidReason: 'Motivo de anulación',
  documentType: 'Tipo de documento',
  documentNumber: 'Número de documento',
  firstName: 'Nombres',
  lastName: 'Apellidos',
  birthDate: 'Fecha de nacimiento',
  sex: 'Sexo',
  bloodType: 'Tipo de sangre',
  phoneE164: 'Teléfono',
  email: 'Correo',
  adminNotes: 'Observaciones',
  emergencyContactName: 'Contacto de emergencia',
  emergencyContactPhoneE164: 'Teléfono de emergencia',
  active: 'Activo',
  amount: 'Monto',
  method: 'Método de pago',
  receiptNumber: 'N.º de comprobante',
  paidAt: 'Fecha de pago',
  source: 'Origen',
  reason: 'Motivo',
  notes: 'Notas',
  checkedInAt: 'Llegada',
  certainty: 'Certeza',
  toothCode: 'Pieza',
  endToothCode: 'Pieza final',
  surfaceCode: 'Cara',
  grade: 'Grado',
  quantity: 'Cantidad',
  price: 'Precio',
  prescribedAt: 'Emitida el',
  generalInstructions: 'Indicaciones generales',
  dose: 'Dosis',
  frequency: 'Frecuencia',
  duration: 'Duración',
  instructions: 'Indicaciones',
  recordNumber: 'N.º de historia clínica',
  openedAt: 'Abierta el',
  noKnownHistory: 'No refiere antecedentes',
  currentMedication: 'Medicación actual',
  scope: 'Tipo',
  relative: 'Pariente',
  description: 'Descripción',
  recordedAt: 'Registrado el',
};

const AUDIT_ENUM_LABELS: Readonly<Record<string, string>> = {
  OPEN: 'Abierta',
  COMPLETED: 'Completada',
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  ATTENDED: 'Atendida',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
  RESCHEDULED: 'Reprogramada',
  DONE: 'Realizado',
  DRAFT: 'Borrador',
  ISSUED: 'Emitida',
  PRESUMPTIVE: 'Presuntivo',
  DEFINITIVE: 'Definitivo',
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta',
  RECEPTION: 'Recepción',
  PROFESSIONAL: 'Profesional',
  BOT: 'Bot',
  WALK_IN: 'Sin cita',
  PERSONAL: 'Personal',
  FAMILY: 'Familiar',
};

const PHONE_FIELDS: ReadonlySet<string> = new Set(['phoneE164', 'emergencyContactPhoneE164']);
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T/;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const dateTimeFormatter = new Intl.DateTimeFormat('es-EC', {
  timeZone: 'America/Guayaquil',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export type AuditActionLabel = 'Creó' | 'Modificó' | 'Anuló' | 'Eliminó';
export type AuditActionTone = 'scheduled' | 'waiting' | 'cancelled' | 'no-show';

export interface AuditChangeRow {
  label: string;
  before: string;
  after: string;
}

export function isHiddenAuditField(field: string): boolean {
  return HIDDEN_AUDIT_FIELDS.has(field);
}

export function auditFieldLabel(field: string): string {
  return AUDIT_FIELD_LABELS[field] ?? field;
}

/** Texto legible de un valor de auditoría; los valores siempre llegan como texto desde el backend. */
export function formatAuditValue(field: string, value: string | null): string {
  if (value === null || value === '') return '—';
  if (value === 'true') return 'Sí';
  if (value === 'false') return 'No';
  if (PHONE_FIELDS.has(field)) return toEcuadorLocal(value);
  if (DATE_TIME_PATTERN.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return dateTimeFormatter.format(date);
  }
  const dateOnly = DATE_ONLY_PATTERN.exec(value);
  if (dateOnly) {
    return `${Number(dateOnly[3])}/${Number(dateOnly[2])}/${dateOnly[1]}`;
  }
  return AUDIT_ENUM_LABELS[value] ?? value;
}

/** Filas visibles de una revisión (sin campos internos). Para ADD se muestra solo el valor nuevo. */
export function auditChangeRows(entry: AuditEntry): AuditChangeRow[] {
  return entry.changes
    .filter((change) => !isHiddenAuditField(change.field))
    .map((change) => ({
      label: auditFieldLabel(change.field),
      before: formatAuditValue(change.field, change.oldValue),
      after: formatAuditValue(change.field, change.newValue),
    }));
}

export function auditActionLabel(entry: AuditEntry): AuditActionLabel {
  if (entry.type === 'ADD') return 'Creó';
  if (entry.type === 'DEL') return 'Eliminó';
  const voidedNow = entry.changes.some(
    (change) => change.field === 'voidedAt' && change.oldValue === null && !!change.newValue
  );
  return voidedNow ? 'Anuló' : 'Modificó';
}

export function auditActionTone(label: AuditActionLabel): AuditActionTone {
  switch (label) {
    case 'Creó':
      return 'scheduled';
    case 'Anuló':
      return 'cancelled';
    case 'Eliminó':
      return 'no-show';
    default:
      return 'waiting';
  }
}

export function auditUserLabel(username: string | null): string {
  if (username === null) return 'Sistema';
  if (username === 'bot_whatsapp') return 'Bot de WhatsApp';
  return username;
}
