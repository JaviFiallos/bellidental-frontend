import { Appointment } from '../../appointments';

export type BoardColumnKey = 'scheduled' | 'waiting' | 'in-progress' | 'attended';

export function boardColumn(appointment: Appointment): BoardColumnKey | null {
  if (
    appointment.status === 'ATTENDED' ||
    appointment.encounterStatus === 'COMPLETED' ||
    appointment.encounterVoided === true
  ) {
    return 'attended';
  }

  if (appointment.encounterStatus === 'OPEN' && !appointment.encounterVoided) {
    return 'in-progress';
  }

  if (
    appointment.status === 'CANCELLED' ||
    appointment.status === 'RESCHEDULED' ||
    appointment.status === 'NO_SHOW'
  ) {
    return null;
  }

  if (
    (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED') &&
    appointment.checkedInAt
  ) {
    return 'waiting';
  }

  if (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED') {
    return 'scheduled';
  }

  return null;
}
