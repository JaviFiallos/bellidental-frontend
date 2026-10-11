export type DocumentType = 'CI' | 'RUC' | 'PASAPORTE';

export interface Patient {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  birthDate: string; // ISO YYYY-MM-DD
  age: number | null;
  sex: string;
  bloodType: string | null;
  bloodTypeLabel: string | null;
  phoneE164: string | null;
  email: string | null;
  emergencyContactName: string | null;
  emergencyContactPhoneE164: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
