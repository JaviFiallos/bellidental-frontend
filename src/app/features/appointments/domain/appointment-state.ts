import { AppointmentStatus } from '../models/appointment.models';

export type AppointmentDisplayTone =
  | 'scheduled'
  | 'waiting'
  | 'in-progress'
  | 'attended'
  | 'no-show'
  | 'cancelled';

export interface AppointmentDisplayState {
  key: string;
  label: string;
  tone: AppointmentDisplayTone;
  isConfirmed?: boolean;
}

export function appointmentDisplayState(appointment: {
  status: AppointmentStatus;
  checkedInAt?: string | null;
}): AppointmentDisplayState {
  if (appointment.checkedInAt) {
    return {
      key: 'waiting',
      label: 'En espera',
      tone: 'waiting',
    };
  }

  switch (appointment.status) {
    case 'PENDING':
      return {
        key: 'scheduled',
        label: 'Agendada',
        tone: 'scheduled',
      };
    case 'CONFIRMED':
      return {
        key: 'confirmed',
        label: 'Confirmada',
        tone: 'scheduled',
        isConfirmed: true,
      };
    case 'ATTENDED':
      return {
        key: 'attended',
        label: 'Atendida',
        tone: 'attended',
      };
    case 'NO_SHOW':
      return {
        key: 'no-show',
        label: 'No asistió',
        tone: 'no-show',
      };
    case 'CANCELLED':
      return {
        key: 'cancelled',
        label: 'Cancelada',
        tone: 'cancelled',
      };
    case 'RESCHEDULED':
      return {
        key: 'rescheduled',
        label: 'Reprogramada',
        tone: 'cancelled',
      };
    default:
      return {
        key: 'scheduled',
        label: 'Agendada',
        tone: 'scheduled',
      };
  }
}
