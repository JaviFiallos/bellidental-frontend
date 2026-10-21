import { Appointment } from '../models/appointment.models';
import { Shift } from '../models/schedule.models';

export const DEFAULT_START_HOUR = 8;
export const DEFAULT_END_HOUR = 20;

export interface AgendaTimeRange {
  startHour: number;
  endHour: number;
  totalHours: number;
  hours: number[];
}

export interface ShadedInterval {
  topHours: number;
  heightHours: number;
}

export interface PositionedAppointment {
  appointment: Appointment;
  topHours: number;
  heightHours: number;
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

  return {
    startHour,
    endHour,
    totalHours,
    hours,
  };
}

export function minutesToHoursOffset(minutes: number, startHour: number): number {
  return (minutes - startHour * 60) / 60;
}

export function durationToHours(startMinutes: number, endMinutes: number): number {
  const duration = Math.max(15, endMinutes - startMinutes);
  return duration / 60;
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
        topHours: 0,
        heightHours: timeRange.totalHours,
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
        topHours: 0,
        heightHours: timeRange.totalHours,
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
          topHours: minutesToHoursOffset(startMin, timeRange.startHour),
          heightHours: (endMin - startMin) / 60,
        });
      }
    }
    current = Math.max(current, shift.end);
  }

  if (current < dayEndMin) {
    shades.push({
      topHours: minutesToHoursOffset(current, timeRange.startHour),
      heightHours: (dayEndMin - current) / 60,
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
    topHours: minutesToHoursOffset(startMin, timeRange.startHour),
    heightHours: durationToHours(startMin, endMin),
  };
}

export function slotAtOffset(
  offsetY: number,
  columnHeight: number,
  timeRange: AgendaTimeRange,
  shifts: Shift[],
  now: Date,
  isToday: boolean,
  minutesOfDayFn: (time: string) => number,
  date: string,
  todayDateString?: string
): string | null {
  if (offsetY < 0 || columnHeight <= 0 || timeRange.totalHours <= 0) {
    return null;
  }

  if (todayDateString && date && date < todayDateString) {
    return null;
  }

  const hoursFromTop = offsetY / (columnHeight / timeRange.totalHours);
  const totalMinutes = timeRange.startHour * 60 + hoursFromTop * 60;
  const slotMinutes = Math.floor(totalMinutes / 15) * 15;

  if (slotMinutes < timeRange.startHour * 60 || slotMinutes >= timeRange.endHour * 60) {
    return null;
  }

  if (isToday) {
    const nowMinutes = minutesOfDayFn(now.toISOString());
    if (slotMinutes <= nowMinutes) {
      return null;
    }
  }

  if (!shifts || shifts.length === 0) {
    return null;
  }

  const insideShift = shifts.some((s) => {
    const start = minutesOfDayFn(s.startTime);
    const end = minutesOfDayFn(s.endTime);
    return slotMinutes >= start && slotMinutes < end;
  });

  if (!insideShift) {
    return null;
  }

  const h = Math.floor(slotMinutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (slotMinutes % 60).toString().padStart(2, '0');

  return date ? `${date}T${h}:${m}:00` : `${h}:${m}`;
}
