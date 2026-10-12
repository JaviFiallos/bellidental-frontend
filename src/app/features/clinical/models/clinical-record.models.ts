export interface HistoryEntry {
  id: string;
  conditionId: number;
  conditionName: string;
  scope: 'PERSONAL' | 'FAMILY';
  relative?: string | null;
  description?: string | null;
  active: boolean;
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
