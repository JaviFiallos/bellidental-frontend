export interface Specialty {
  id: string;
  name: string;
  defaultDurationMinutes: number;
}

export interface Professional {
  id: string;
  userId: string;
  fullName: string;
  licenseNumber: string;
  colorTag: string;
  specialties: Specialty[];
  active: boolean;
}
