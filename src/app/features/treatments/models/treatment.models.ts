export interface Treatment {
  id: number;
  code: string;
  name: string;
  description: string | null;
  basePrice: number;
}

export interface PerformedTreatment {
  id: string;
  encounterId: string;
  treatmentId: number;
  treatmentCode: string;
  treatmentName: string;
  encounterDiagnosisId: string | null;
  dentalFindingId: string | null;
  toothCode: number | null;
  surfaceCode: string | null;
  quantity: number;
  price: number;
  total: number;
  notes: string | null;
  createdAt: string;
}

export interface RecordTreatmentRequest {
  treatmentId: number;
  quantity?: number;
  price?: number;
  encounterDiagnosisId?: string;
  dentalFindingId?: string;
  toothCode?: number;
  surfaceCode?: string;
  notes?: string;
}

export interface VoidTreatmentRequest {
  voidReason: string;
}

/** Diagnóstico activo que la página pasa a la sección (treatments no conoce el modelo de clinical). */
export interface DiagnosisOption {
  id: string;
  label: string;
}

/** Hallazgo pendiente del paciente que la página pasa a la sección (treatments no conoce el modelo de odontogram). */
export interface FindingOption {
  id: string;
  toothCode: number;
  surfaceCode: string | null;
  label: string;
}
