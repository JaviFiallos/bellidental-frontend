import { DocumentType } from '../../patients';

export interface Specialty {
  id: number;
  name: string;
  defaultDurationMinutes: number;
}

export interface Professional {
  id: string;
  /** `null` cuando el profesional no tiene cuenta de usuario. */
  userId: string | null;
  fullName: string;
  licenseNumber: string;
  colorTag: string | null;
  specialties: Specialty[];
  active: boolean;
}

export interface ProfessionalDetail extends Professional {
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  phoneE164: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfessionalRequest {
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  phoneE164?: string;
  colorTag: string;
  specialtyIds: number[];
}

export type UpdateProfessionalRequest = Partial<CreateProfessionalRequest>;
