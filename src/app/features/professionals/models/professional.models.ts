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
  colorTag: string;
  specialties: Specialty[];
  active: boolean;
}
