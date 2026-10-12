import { Appointment } from '../models/appointment.models';
import { Shift } from '../models/schedule.models';

export const DEFAULT_START_HOUR = 8;
export const DEFAULT_END_HOUR = 20;
export const REM_PER_HOUR = 8;

export interface AgendaTimeRange {
  startHour: number;
  endHour: number;
  totalHours: number;
  totalHeightRem: number;
  hours: number[];
}

export interface ShadedInterval {
  topRem: number;
  heightRem: number;
}

export interface PositionedAppointment {
  appointment: Appointment;
  topRem: number;
  heightRem: number;
}

export function calculateAgendaTimeRange(
  shiftTimes: { startTime: string; endTime: string }[],
  appointmentTimes: { startMinutes: number; endMinutes: number }[],
  minutesOfDayFn: (time: string) => number
): AgendaTimeRange {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;

  for (const shift of shiftTimes) {
    if (shift.startTime) {
      const min = minutesOfDayFn(shift.startTime);
      const h = Math.floor(min / 60);
      if (h < startHour) startHour = h;
    }
    if (shift.endTime) {
      const min = minutesOfDayFn(shift.endTime);
      const h = Math.ceil(min / 60);
      if (h > endHour) endHour = h;
    }
  }

  for (const appt of appointmentTimes) {
    const startH = Math.floor(appt.startMinutes / 60);
    const endH = Math.ceil(appt.endMinutes / 60);
    if (startH < startHour) startHour = startH;
    if (endH > endHour) endHour = endH;
  }

  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push(h);
  }

  const totalHours = endHour - startHour;
  const totalHeightRem = totalHours * REM_PER_HOUR;

  return {
    startHour,
    endHour,
    totalHours,
    totalHeightRem,
    hours,
  };
}

export function minutesToRemOffset(minutes: number, startHour: number): number {
  return ((minutes - startHour * 60) / 60) * REM_PER_HOUR;
}

export function durationToRemHeight(startMinutes: number, endMinutes: number): number {
  const duration = Math.max(15, endMinutes - startMinutes);
  return (duration / 60) * REM_PER_HOUR;
}

export function calculateShades(
  shifts: Shift[],
  timeRange: AgendaTimeRange,
  minutesOfDayFn: (time: string) => number
): ShadedInterval[] {
  const dayStartMin = timeRange.startHour * 60;
  const dayEndMin = timeRange.endHour * 60;

  if (!shifts || shifts.length === 0) {
    return [
      {
        topRem: 0,
        heightRem: timeRange.totalHeightRem,
      },
    ];
  }

  // Convertir turnos a intervalos en minutos
  const intervals = shifts
    .map((s) => ({
      start: minutesOfDayFn(s.startTime),
      end: minutesOfDayFn(s.endTime),
    }))
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);

  if (intervals.length === 0) {
    return [
      {
        topRem: 0,
        heightRem: timeRange.totalHeightRem,
      },
    ];
  }

  // Fusionar intervalos solapados
  const merged: { start: number; end: number }[] = [];
  for (const item of intervals) {
    if (merged.length === 0) {
      merged.push({ ...item });
    } else {
      const prev = merged[merged.length - 1];
      if (item.start <= prev.end) {
        prev.end = Math.max(prev.end, item.end);
      } else {
        merged.push({ ...item });
      }
    }
  }

  // Calcular intervalos no cubiertos (sombreados)
  const shades: ShadedInterval[] = [];
  let current = dayStartMin;

  for (const shift of merged) {
    if (shift.start > current) {
      const startMin = Math.max(dayStartMin, current);
      const endMin = Math.min(dayEndMin, shift.start);
      if (endMin > startMin) {
        shades.push({
          topRem: minutesToRemOffset(startMin, timeRange.startHour),
          heightRem: ((endMin - startMin) / 60) * REM_PER_HOUR,
        });
      }
    }
    current = Math.max(current, shift.end);
  }

  if (current < dayEndMin) {
    shades.push({
      topRem: minutesToRemOffset(current, timeRange.startHour),
      heightRem: ((dayEndMin - current) / 60) * REM_PER_HOUR,
    });
  }

  return shades;
}

export function calculatePositionedAppointment(
  appointment: Appointment,
  timeRange: AgendaTimeRange,
  minutesOfDayFn: (time: string) => number
): PositionedAppointment {
  const startMin = minutesOfDayFn(appointment.startAt);
  const endMin = minutesOfDayFn(appointment.endAt);
  return {
    appointment,
    topRem: minutesToRemOffset(startMin, timeRange.startHour),
    heightRem: durationToRemHeight(startMin, endMin),
  };
}
