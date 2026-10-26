export type DocumentType = 'CI' | 'RUC' | 'PASAPORTE';

export type Sex = 'M' | 'F';

export type BloodType =
  | 'O_POS'
  | 'O_NEG'
  | 'A_POS'
  | 'A_NEG'
  | 'B_POS'
  | 'B_NEG'
  | 'AB_POS'
  | 'AB_NEG';

export interface Patient {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  birthDate: string; // ISO YYYY-MM-DD
  age: number | null;
  sex: Sex;
  bloodType: BloodType | null;
  bloodTypeLabel: string | null;
  phoneE164: string | null;
  email: string | null;
  emergencyContactName: string | null;
  emergencyContactPhoneE164: string | null;
  adminNotes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Cuerpo de POST /api/v1/patients: los opcionales vacíos se omiten. */
export interface CreatePatientRequest {
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string; // YYYY-MM-DD
  sex: Sex;
  bloodType?: BloodType;
  phoneE164?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhoneE164?: string;
  adminNotes?: string;
}

/**
 * Cuerpo de PUT /api/v1/patients/{id} (actualización parcial).
 * Los opcionales de texto vacíos se envían como "" para borrarlos; bloodType vacío va como null.
 */
export interface UpdatePatientRequest {
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: Sex;
  bloodType: BloodType | null;
  phoneE164: string;
  email: string;
  emergencyContactName: string;
  emergencyContactPhoneE164: string;
  adminNotes: string;
}

export type PatientListView = 'ATTENDED' | 'CREATED';

export interface PatientListItem {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  age: number | null;
  lastEncounterAt: string | null;
  createdAt: string;
  pendingBalance: number | null; // null sin BILLING_READ
}

export interface PatientListFilters {
  view?: PatientListView;
  from?: string | null;
  to?: string | null;
  withBalance?: boolean;
  query?: string | null;
  page?: number;
  size?: number;
}
