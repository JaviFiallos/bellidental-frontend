export interface Specialty {
  id: number;
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
