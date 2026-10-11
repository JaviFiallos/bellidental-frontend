export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ATTENDED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export type AppointmentSource =
  | 'RECEPTION'
  | 'PROFESSIONAL'
  | 'BOT'
  | 'WALK_IN';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  professionalName: string;
  colorTag?: string;
  specialtyId: string;
  specialtyName: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  reason?: string | null;
  notes?: string | null;
  checkedInAt?: string | null;
  rescheduledFromId?: string | null;
}
