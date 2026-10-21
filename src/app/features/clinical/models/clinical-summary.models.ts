export interface ClinicalSummaryProfessional {
  id: string;
  fullName: string;
  licenseNumber: string;
}

export interface ClinicalSummaryDiagnosis {
  id: string;
  code: string;
  description: string;
  certainty: 'PRESUMPTIVE' | 'DEFINITIVE';
  notes?: string | null;
}

export interface ClinicalSummaryTreatment {
  id: string;
  code: string;
  name: string;
  toothCode?: number | null;
  surfaceCode?: string | null;
  quantity: number;
}

export interface ClinicalSummaryPrescriptionItem {
  medicationName: string;
  concentration?: string | null;
  presentation?: string | null;
  dose?: string | null;
  frequency?: string | null;
  duration?: string | null;
  quantity?: string | null;
}

export interface ClinicalSummaryPrescription {
  id: string;
  prescribedAt: string;
  generalInstructions?: string | null;
  items: ClinicalSummaryPrescriptionItem[];
}

export interface ClinicalSession {
  encounterId: string;
  sessionNumber: number;
  startAt: string;
  status: 'OPEN' | 'COMPLETED';
  professional: ClinicalSummaryProfessional;
  diagnoses: ClinicalSummaryDiagnosis[];
  treatments: ClinicalSummaryTreatment[];
  prescriptions: ClinicalSummaryPrescription[];
}

export interface ClinicalSummary {
  patientId: string;
  clinicName: string;
  recordNumber: string | null;
  openedAt: string | null;
  openedBy: ClinicalSummaryProfessional | null;
  sessions: ClinicalSession[];
}
