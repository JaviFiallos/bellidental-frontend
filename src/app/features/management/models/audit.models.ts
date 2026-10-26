/** Entidades que el backend audita (nombres de la ruta `GET /api/v1/audit/{entity}/{id}`). */
export type AuditEntityName =
  | 'clinical-records'
  | 'medical-history-entries'
  | 'encounters'
  | 'encounter-diagnoses'
  | 'dental-findings'
  | 'performed-treatments'
  | 'prescriptions'
  | 'prescription-items'
  | 'payments'
  | 'appointments'
  | 'patients'
  | 'treatments'
  | 'specialties';

export type AuditRevisionType = 'ADD' | 'MOD' | 'DEL';

/** `field` es el nombre Java del campo; los valores llegan siempre como texto (o null). */
export interface AuditFieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface AuditEntry {
  revision: number;
  /** Instante UTC (ISO con zona). */
  at: string;
  userId: string | null;
  /** null = proceso sin usuario (tareas programadas). */
  username: string | null;
  type: AuditRevisionType;
  changes: AuditFieldChange[];
  entity?: AuditEntityName;
  entityId?: string;
}

export interface AuditLogEntry {
  revision: number;
  at: string;
  userId: string | null;
  username: string | null;
  entity: AuditEntityName;
  entityId: string;
  type: AuditRevisionType;
  patientId: string | null;
  patientName: string | null;
}

export interface AuditLogQuery {
  from: string;
  to: string;
  entity?: AuditEntityName | '';
  userId?: string | '';
  patientId?: string | '';
  page?: number;
  size?: number;
}

export interface AuditHistoryRequest {
  entity: AuditEntityName;
  id: string;
  title: string;
  isEncounterFull?: boolean;
}
