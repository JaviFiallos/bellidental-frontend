import { HttpTestingController } from '@angular/common/http/testing';
import { ApiResponse } from '../../../core/api/api.models';
import {
  Finding,
  OdontogramCatalog,
  PatientOdontogram,
  Tooth,
  ToothType,
} from '../../odontogram';
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

// --- Odontograma Fixtures (009a) ---

function buildTeethCatalog(): Tooth[] {
  const teeth: Tooth[] = [];
  const quadrants = [1, 2, 3, 4, 5, 6, 7, 8];

  for (const q of quadrants) {
    const isDeciduous = q >= 5;
    const maxPos = isDeciduous ? 5 : 8;
    const arch = q === 1 || q === 2 || q === 5 || q === 6 ? 'UPPER' : 'LOWER';

    for (let pos = 1; pos <= maxPos; pos++) {
      let type: ToothType;
      if (pos <= 2) {
        type = 'INCISOR';
      } else if (pos === 3) {
        type = 'CANINE';
      } else if (pos <= 5) {
        type = isDeciduous ? 'MOLAR' : 'PREMOLAR';
      } else {
        type = 'MOLAR';
      }

      teeth.push({
        code: q * 10 + pos,
        dentition: isDeciduous ? 'DECIDUOUS' : 'PERMANENT',
        arch,
        quadrant: q,
        position: pos,
        type,
      });
    }
  }

  return teeth;
}

export const mockOdontogramCatalog: OdontogramCatalog = {
  teeth: buildTeethCatalog(),
  surfaces: [
    { code: 'O', name: 'Oclusal / Incisal' },
    { code: 'V', name: 'Vestibular' },
    { code: 'L', name: 'Lingual / Palatina' },
    { code: 'M', name: 'Mesial' },
    { code: 'D', name: 'Distal' },
  ],
  conditions: [
    {
      id: 1,
      code: 'MOBILITY',
      name: 'Movilidad',
      category: 'PERIODONTAL',
      scope: 'TOOTH',
      gradeMin: 0,
      gradeMax: 3,
      symbols: [
        {
          id: 1,
          status: 'DONE',
          shape: 'NUMBER',
          color: '#1E88E5',
          secondaryColor: null,
          filled: false,
          lineStyle: 'SOLID',
        },
      ],
    },
    {
      id: 2,
      code: 'RECESSION',
      name: 'Recesión',
      category: 'PERIODONTAL',
      scope: 'TOOTH',
      gradeMin: 1,
      gradeMax: 4,
      symbols: [
        {
          id: 2,
          status: 'DONE',
          shape: 'NUMBER',
          color: '#1E88E5',
          secondaryColor: null,
          filled: false,
          lineStyle: 'SOLID',
        },
      ],
    },
    {
      id: 3,
      code: 'CARIES',
      name: 'Caries',
      category: 'DENTAL',
      scope: 'SURFACE',
      gradeMin: null,
      gradeMax: null,
      symbols: [
        {
          id: 3,
          status: 'PENDING',
          shape: 'CIRCLE',
          color: '#D32F2F',
          secondaryColor: null,
          filled: true,
          lineStyle: 'SOLID',
        },
      ],
    },
    {
      id: 4,
      code: 'FILLING',
      name: 'Obturación',
      category: 'DENTAL',
      scope: 'SURFACE',
      gradeMin: null,
      gradeMax: null,
      symbols: [
        {
          id: 4,
          status: 'DONE',
          shape: 'CIRCLE',
          color: '#1E88E5',
          secondaryColor: null,
          filled: true,
          lineStyle: 'SOLID',
        },
      ],
    },
    {
      id: 5,
      code: 'SEALANT',
      name: 'Sellante',
      category: 'DENTAL',
      scope: 'SURFACE',
      gradeMin: null,
      gradeMax: null,
      symbols: [
        {
          id: 5,
          status: 'PENDING',
          shape: 'ASTERISK',
          color: '#D32F2F',
          secondaryColor: null,
          filled: false,
          lineStyle: 'SOLID',
        },
        {
          id: 6,
          status: 'DONE',
          shape: 'ASTERISK',
          color: '#1E88E5',
          secondaryColor: null,
          filled: false,
          lineStyle: 'SOLID',
        },
      ],
    },
    {
      id: 6,
      code: 'EXTRACTION',
      name: 'Extracción indicada',
      category: 'DENTAL',
      scope: 'TOOTH',
      gradeMin: null,
      gradeMax: null,
      symbols: [
        {
          id: 7,
          status: 'PENDING',
          shape: 'CROSS',
          color: '#D32F2F',
          secondaryColor: null,
          filled: false,
          lineStyle: 'SOLID',
        },
      ],
    },
    {
      id: 7,
      code: 'MISSING_CARIES',
      name: 'Perdido por caries',
      category: 'DENTAL',
      scope: 'TOOTH',
      gradeMin: null,
      gradeMax: null,
      symbols: [
        {
          id: 8,
          status: 'DONE',
          shape: 'CROSS',
          color: '#1E88E5',
          secondaryColor: null,
          filled: false,
          lineStyle: 'SOLID',
        },
      ],
    },
    {
      id: 8,
      code: 'MISSING_OTHER',
      name: 'Perdido por otra causa',
      category: 'DENTAL',
      scope: 'TOOTH',
      gradeMin: null,
      gradeMax: null,
      symbols: [
        {
          id: 9,
          status: 'DONE',
          shape: 'CROSS',
          color: '#1E88E5',
          secondaryColor: null,
          filled: false,
          lineStyle: 'SOLID',
        },
      ],
    },
    {
      id: 9,
      code: 'ROOT_CANAL',
      name: 'Endodoncia',
      category: 'DENTAL',
      scope: 'TOOTH',
      gradeMin: null,
      gradeMax: null,
      symbols: [
        {
          id: 10,
          status: 'DONE',
          shape: 'TRIANGLE',
          color: '#1E88E5',
          secondaryColor: null,
          filled: false,
          lineStyle: 'SOLID',
        },
      ],
    },
    {
      id: 10,
      code: 'CROWN',
      name: 'Corona',
      category: 'DENTAL',
      scope: 'TOOTH',
      gradeMin: null,
      gradeMax: null,
      symbols: [
        {
          id: 11,
          status: 'DONE',
          shape: 'DOUBLE_SQUARE',
          color: '#1E88E5',
          secondaryColor: null,
          filled: false,
          lineStyle: 'SOLID',
        },
      ],
    },
    {
      id: 11,
      code: 'FIXED_PROSTHESIS',
      name: 'Prótesis fija',
      category: 'DENTAL',
      scope: 'SPAN',
      gradeMin: null,
      gradeMax: null,
      symbols: [
        {
          id: 12,
          status: 'DONE',
          shape: 'SQUARES_LINE',
          color: '#000000',
          secondaryColor: null,
          filled: true,
          lineStyle: 'SOLID',
        },
      ],
    },
    {
      id: 12,
      code: 'REMOVABLE_PROSTHESIS',
      name: 'Prótesis removible',
      category: 'DENTAL',
      scope: 'SPAN',
      gradeMin: null,
      gradeMax: null,
      symbols: [
        {
          id: 13,
          status: 'DONE',
          shape: 'DOUBLE_SQUARE',
          color: '#000000',
          secondaryColor: null,
          filled: false,
          lineStyle: 'SOLID',
        },
      ],
    },
    {
      id: 13,
      code: 'TOTAL_PROSTHESIS',
      name: 'Prótesis total',
      category: 'DENTAL',
      scope: 'SPAN',
      gradeMin: null,
      gradeMax: null,
      symbols: [
        {
          id: 14,
          status: 'DONE',
          shape: 'EQUALS',
          color: '#000000',
          secondaryColor: null,
          filled: false,
          lineStyle: 'SOLID',
        },
      ],
    },
    {
      id: 14,
      code: 'OTHER',
      name: 'Otro hallazgo',
      category: 'DENTAL',
      scope: 'TOOTH',
      gradeMin: null,
      gradeMax: null,
      symbols: [
        {
          id: 15,
          status: 'DONE',
          shape: 'CIRCLE_CROSS',
          color: '#1E88E5',
          secondaryColor: null,
          filled: false,
          lineStyle: 'SOLID',
        },
      ],
    },
  ],
};

export const mockPatientOdontogramEmpty: PatientOdontogram = {
  patientId: 'pat-1',
  findings: [],
  indices: {
    cpoC: 0,
    cpoP: 0,
    cpoO: 0,
    cpoTotal: 0,
    ceoC: 0,
    ceoE: 0,
    ceoO: 0,
    ceoTotal: 0,
  },
  cariesSurfaces: {},
};

export const mockPatientOdontogramWithFindings: PatientOdontogram = {
  patientId: 'pat-1',
  findings: [
    {
      id: 'f-1',
      toothCode: 16,
      endToothCode: null,
      surfaceCode: 'M',
      surfaceLabel: 'mesial',
      conditionId: 3, // CARIES
      status: 'PENDING',
      grade: null,
      notes: null,
      createdAt: '2026-10-12T09:10:00Z',
      symbol: {
        id: 3,
        status: 'PENDING',
        shape: 'CIRCLE',
        color: '#D32F2F',
        secondaryColor: null,
        filled: true,
        lineStyle: 'SOLID',
      },
    },
    {
      id: 'f-2',
      toothCode: 21,
      endToothCode: null,
      surfaceCode: 'D',
      surfaceLabel: 'distal',
      conditionId: 4, // FILLING
      status: 'DONE',
      grade: null,
      notes: null,
      createdAt: '2026-10-12T09:15:00Z',
      symbol: {
        id: 4,
        status: 'DONE',
        shape: 'CIRCLE',
        color: '#1E88E5',
        secondaryColor: null,
        filled: true,
        lineStyle: 'SOLID',
      },
    },
    {
      id: 'f-3',
      toothCode: 31,
      endToothCode: null,
      surfaceCode: null,
      surfaceLabel: null,
      conditionId: 1, // MOBILITY
      status: 'DONE',
      grade: 2,
      notes: null,
      createdAt: '2026-10-12T09:20:00Z',
      symbol: {
        id: 1,
        status: 'DONE',
        shape: 'NUMBER',
        color: '#1E88E5',
        secondaryColor: null,
        filled: false,
        lineStyle: 'SOLID',
      },
    },
    {
      id: 'f-4',
      toothCode: 41,
      endToothCode: null,
      surfaceCode: null,
      surfaceLabel: null,
      conditionId: 2, // RECESSION
      status: 'DONE',
      grade: 2,
      notes: null,
      createdAt: '2026-10-12T09:25:00Z',
      symbol: {
        id: 2,
        status: 'DONE',
        shape: 'NUMBER',
        color: '#1E88E5',
        secondaryColor: null,
        filled: false,
        lineStyle: 'SOLID',
      },
    },
  ],
  indices: {
    cpoC: 1,
    cpoP: 0,
    cpoO: 1,
    cpoTotal: 2,
    ceoC: 0,
    ceoE: 0,
    ceoO: 0,
    ceoTotal: 0,
  },
  cariesSurfaces: { '16': 1 },
};

export function flushOdontogram(
  httpMock: HttpTestingController,
  patientId = 'pat-1',
  odontogram: PatientOdontogram = mockPatientOdontogramEmpty,
  encounterId = 'enc-1',
  encounterFindings: Finding[] = []
): void {
  const catReqs = httpMock.match('/api/v1/odontogram/catalog');
  catReqs.forEach((req) =>
    req.flush({ success: true, message: 'Catálogo obtenido', data: mockOdontogramCatalog })
  );

  const odoReqs = httpMock.match(`/api/v1/patients/${patientId}/odontogram`);
  odoReqs.forEach((req) =>
    req.flush({ success: true, message: 'Odontograma obtenido', data: odontogram })
  );

  const encReqs = httpMock.match(
    (req) => req.url === `/api/v1/encounters/${encounterId}/findings` && req.method === 'GET'
  );
  encReqs.forEach((req) =>
    req.flush({
      success: true,
      message: 'Hallazgos de la atención obtenidos',
      data: encounterFindings,
    })
  );
}

