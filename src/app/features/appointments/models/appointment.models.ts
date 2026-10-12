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
  specialtyId: number;
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

export interface AvailableSlot {
  startAt: string;
  endAt: string;
}

export interface CreateAppointmentRequest {
  patientId: string;
  professionalId: string;
  specialtyId: number;
  startAt: string;
  endAt?: string;
  reason?: string;
  notes?: string;
}

export interface WalkInAppointmentRequest {
  patientId: string;
  professionalId: string;
  specialtyId: number;
}

export interface RescheduleAppointmentRequest {
  startAt: string;
  endAt?: string;
  professionalId?: string;
  specialtyId?: number;
}
