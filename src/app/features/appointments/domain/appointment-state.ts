import { AppointmentStatus, EncounterStatus } from '../models/appointment.models';

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
  encounterId?: string | null;
  encounterStatus?: EncounterStatus | null;
  encounterVoided?: boolean;
}): AppointmentDisplayState {
  // 1. ATTENDED, CANCELLED, NO_SHOW y RESCHEDULED dan su estado de siempre, haya o no checkedInAt
  switch (appointment.status) {
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
  }

  // 2. encounterId con encounterStatus === 'OPEN' y encounterVoided !== true → En atención
  if (
    appointment.encounterId &&
    appointment.encounterStatus === 'OPEN' &&
    appointment.encounterVoided !== true
  ) {
    return {
      key: 'in-progress',
      label: 'En atención',
      tone: 'in-progress',
    };
  }

  // 3. checkedInAt → En espera
  if (appointment.checkedInAt) {
    return {
      key: 'waiting',
      label: 'En espera',
      tone: 'waiting',
    };
  }

  // 4. PENDING y CONFIRMED
  if (appointment.status === 'CONFIRMED') {
    return {
      key: 'confirmed',
      label: 'Confirmada',
      tone: 'scheduled',
      isConfirmed: true,
    };
  }

  return {
    key: 'scheduled',
    label: 'Agendada',
    tone: 'scheduled',
  };
}

export type AppointmentActionType = 'check-in' | 'confirm' | 'no-show' | 'cancel' | 'reschedule';

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

  // 4. Reprogramar: PENDING o CONFIRMED sin check-in
  if (canUpdate && !checkedInAt) {
    actions.push('reschedule');
  }

  // 5. Cancelar: PENDING o CONFIRMED (con o sin llegada)
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

