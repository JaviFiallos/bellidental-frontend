import { ApiResponse } from '../../../core/api/api.models';
import { Patient } from '../../patients';
import { ClinicalRecord } from '../models/clinical-record.models';
import { Diagnosis, Encounter } from '../models/encounter.models';
import { Icd10Code } from '../models/icd10.models';

export const mockEncounterOpen: Encounter = {
  id: 'enc-1',
  appointmentId: 'appt-1',
  patientId: 'pat-1',
  professionalId: 'prof-1',
  status: 'OPEN',
  startAt: '2026-10-12T09:00:00-05:00',
  chiefComplaint: 'Paciente refiere dolor en molar',
  currentIllness: 'Evolución de 3 días con molestia',
  diagnoses: [],
};

export const mockEncounterApiResponse: ApiResponse<Encounter> = {
  success: true,
  message: 'Atención obtenida',
  data: mockEncounterOpen,
};

export const mockPatientPat1: Patient = {
  id: 'pat-1',
  documentType: 'CI',
  documentNumber: '1712345678',
  firstName: 'Juan',
  lastName: 'Pérez',
  fullName: 'Juan Pérez',
  birthDate: '1995-05-10',
  age: 31,
  sex: 'M',
  bloodType: 'O_POS',
  bloodTypeLabel: 'O+',
  phoneE164: '593987654321',
  email: 'juan.perez@example.com',
  emergencyContactName: null,
  emergencyContactPhoneE164: null,
  adminNotes: null,
  active: true,
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

export const mockPatientApiResponse: ApiResponse<Patient> = {
  success: true,
  message: 'Paciente obtenido',
  data: mockPatientPat1,
};

export const mockClinicalRecordPat1: ClinicalRecord = {
  id: 'rec-1',
  patientId: 'pat-1',
  recordNumber: 'HC-00123',
  openedAt: '2026-01-01T10:00:00Z',
  noKnownHistory: false,
  currentMedication: 'Paracetamol 500mg',
  historyEntries: [
    {
      id: 'hist-1',
      conditionId: 1,
      conditionName: 'Diabetes',
      scope: 'PERSONAL',
      active: true,
    },
  ],
};

export const mockClinicalRecordApiResponse: ApiResponse<ClinicalRecord> = {
  success: true,
  message: 'Historia clínica obtenida',
  data: mockClinicalRecordPat1,
};

export const mockIcd10K02: Icd10Code = {
  id: 101,
  code: 'K02.1',
  description: 'Caries de la dentina',
  category: 'Enfermedades de los dientes',
};

export const mockIcd10SearchApiResponse: ApiResponse<Icd10Code[]> = {
  success: true,
  message: 'Códigos CIE-10 obtenidos',
  data: [mockIcd10K02],
};

export const mockDiagnosisK02: Diagnosis = {
  id: 'diag-1',
  icd10Id: 101,
  code: 'K02.1',
  description: 'Caries de la dentina',
  certainty: 'DEFINITIVE',
  voidedAt: null,
};

export const mockDiagnosisApiResponse: ApiResponse<Diagnosis> = {
  success: true,
  message: 'Diagnóstico agregado',
  data: mockDiagnosisK02,
};

export const mockEncounterCompleted: Encounter = {
  ...mockEncounterOpen,
  status: 'COMPLETED',
  closedAt: '2026-10-12T09:45:00-05:00',
  diagnoses: [mockDiagnosisK02],
};

export const mockEncounterCompletedApiResponse: ApiResponse<Encounter> = {
  success: true,
  message: 'Atención completada',
  data: mockEncounterCompleted,
};

export const mockConditions = [
  { id: 1, name: 'Alergia a antibióticos', displayOrder: 1 },
  { id: 2, name: 'Alergia a anestesia', displayOrder: 2 },
  { id: 3, name: 'Hemorragias', displayOrder: 3 },
  { id: 4, name: 'VIH/SIDA', displayOrder: 4 },
  { id: 5, name: 'Tuberculosis', displayOrder: 5 },
  { id: 6, name: 'Asma', displayOrder: 6 },
  { id: 7, name: 'Diabetes', displayOrder: 7 },
  { id: 8, name: 'Hipertensión', displayOrder: 8 },
  { id: 9, name: 'Enfermedad cardíaca', displayOrder: 9 },
  { id: 10, name: 'Otro', displayOrder: 10 },
];

export const mockConditionsApiResponse: ApiResponse<typeof mockConditions> = {
  success: true,
  message: 'Catálogo de condiciones obtenido',
  data: mockConditions,
};

