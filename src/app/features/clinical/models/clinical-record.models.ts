export interface HistoryEntry {
  id: string;
  conditionId: number;
  conditionName: string;
  scope: 'PERSONAL' | 'FAMILY';
  relative?: string | null;
  description?: string | null;
  active: boolean;
  recordedAt?: string;
  voidedAt?: string | null;
}

export interface MedicalHistoryCondition {
  id: number;
  name: string;
  displayOrder: number;
}

export interface CreateHistoryEntryRequest {
  conditionId: number;
  scope: 'PERSONAL' | 'FAMILY';
  relative?: string | null;
  description?: string | null;
}

export interface UpdateClinicalRecordRequest {
  noKnownHistory?: boolean;
  currentMedication?: string | null;
}

export interface ClinicalRecord {
  id: string;
  patientId?: string;
  recordNumber: string;
  openedAt: string;
  noKnownHistory: boolean;
  currentMedication?: string | null;
  historyEntries: HistoryEntry[];
}

