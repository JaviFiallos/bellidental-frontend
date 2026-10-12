import { EncounterStatus } from '../../appointments';

export type DiagnosisCertainty = 'PRESUMPTIVE' | 'DEFINITIVE';

export interface Diagnosis {
  id: string;
  icd10Id: number;
  code: string;
  description: string;
  certainty: DiagnosisCertainty;
  notes?: string | null;
  voidedAt?: string | null;
}

export interface Encounter {
  id: string;
  appointmentId: string;
  patientId: string;
  professionalId: string;
  status: EncounterStatus;
  startAt: string;
  endAt?: string | null;
  closedAt?: string | null;
  chiefComplaint?: string | null;
  currentIllness?: string | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  heartRate?: number | null;
  temperature?: number | null;
  respiratoryRate?: number | null;
  stomatognathicExam?: string | null;
  periodontalDisease?: string | null;
  fluorosis?: string | null;
  malocclusion?: string | null;
  diagnosticPlan?: string | null;
  therapeuticPlan?: string | null;
  educationalPlan?: string | null;
  voidedAt?: string | null;
  voidReason?: string | null;
  diagnoses?: Diagnosis[];
}

export interface OpenEncounterRequest {
  chiefComplaint: string;
}

export interface UpdateEncounterRequest {
  chiefComplaint: string;
  currentIllness?: string | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  heartRate?: number | null;
  temperature?: number | null;
  respiratoryRate?: number | null;
  stomatognathicExam?: string | null;
  periodontalDisease?: string | null;
  fluorosis?: string | null;
  malocclusion?: string | null;
  diagnosticPlan?: string | null;
  therapeuticPlan?: string | null;
  educationalPlan?: string | null;
}

export interface AddDiagnosisRequest {
  icd10Id: number;
  certainty: DiagnosisCertainty;
  notes?: string | null;
}
