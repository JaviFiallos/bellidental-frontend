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

export type AppointmentActionType = 'check-in' | 'confirm' | 'no-show' | 'cancel';

export function availableActions(
  appointment: {
    status: AppointmentStatus;
    startAt: string;
    checkedInAt?: string | null;
  },
  now: Date,
  isToday: boolean,
  hasPermission: (permission: string) => boolean = () => true
): AppointmentActionType[] {
  const { status, startAt, checkedInAt } = appointment;

  if (status !== 'PENDING' && status !== 'CONFIRMED') {
    return [];
  }

  const actions: AppointmentActionType[] = [];
  const canUpdate = hasPermission('APPOINTMENT_UPDATE');
  const canCancel = hasPermission('APPOINTMENT_CANCEL');

  const startDate = new Date(startAt);
  const startHasPassed = !isNaN(startDate.getTime()) && startDate.getTime() <= now.getTime();

  // 1. Llegó (check-in): PENDING o CONFIRMED sin check-in en el día de hoy
  if (canUpdate && isToday && !checkedInAt) {
    actions.push('check-in');
  }

  // 2. Confirmar: solo PENDING
  if (canUpdate && status === 'PENDING') {
    actions.push('confirm');
  }

  // 3. No asistió: PENDING o CONFIRMED sin check-in cuando startAt ya pasó
  if (canUpdate && !checkedInAt && startHasPassed) {
    actions.push('no-show');
  }

  // 4. Cancelar: PENDING o CONFIRMED (con o sin llegada)
  if (canCancel) {
    actions.push('cancel');
  }

  return actions;
}

export function canQuickCheckIn(
  appointment: {
    status: AppointmentStatus;
    startAt: string;
    endAt: string;
    checkedInAt?: string | null;
  },
  now: Date,
  isToday: boolean,
  hasPermission: (permission: string) => boolean
): boolean {
  const actions = availableActions(appointment, now, isToday, hasPermission);
  if (!actions.includes('check-in')) {
    return false;
  }

  const startMs = new Date(appointment.startAt).getTime();
  const endMs = new Date(appointment.endAt).getTime();
  const durationMinutes = Math.round((endMs - startMs) / 60000);
  return durationMinutes >= 30;
}

