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
  | 'patients';

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
}

export interface AuditHistoryRequest {
  entity: AuditEntityName;
  id: string;
  title: string;
}
