import { addCalendarDays } from '../../../shared/utils/calendar-period';
import { DailyStat } from '../models/dashboard.models';

export type DailyGranularity = 'day' | 'week' | 'month';

export interface DailyBucket {
  label: string;
  ariaLabel: string;
  appointments: number;
  completedEncounters: number;
  newPatients: number;
  collected: number;
}

export interface DailyGroupedSeries {
  granularity: DailyGranularity;
  buckets: DailyBucket[];
}

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const WEEKDAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function toUtcDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function inclusiveDays(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (isNaN(start) || isNaN(end) || start > end) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

/** ISO weekday: 1 = lunes ... 7 = domingo */
function isoWeekday(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * Agrupa las estadísticas diarias en función de la amplitud del rango:
 * - <= 31 días: por día
 * - 32 a 92 días: por semana (lunes a domingo)
 * - > 92 días: por mes
 * Días sin datos se rellenan con 0.
 */
export function groupDailyStats(
  byDay: DailyStat[],
  from: string,
  to: string
): DailyGroupedSeries {
  const daysCount = inclusiveDays(from, to);
  if (daysCount <= 0) {
    return { granularity: 'day', buckets: [] };
  }

  const map = new Map<string, DailyStat>();
  for (const item of byDay) {
    map.set(item.date, item);
  }

  const allDays: DailyStat[] = [];
  let cur = from;
  while (cur <= to) {
    const stat = map.get(cur);
    allDays.push(
      stat ?? {
        date: cur,
        appointments: 0,
        completedEncounters: 0,
        newPatients: 0,
        collected: 0,
      }
    );
    cur = addCalendarDays(cur, 1);
  }

  if (daysCount <= 31) {
    return {
      granularity: 'day',
      buckets: allDays.map((d) => {
        const date = toUtcDate(d.date);
        const dayNum = date.getUTCDate();
        const weekdayIdx = date.getUTCDay();
        const monthIdx = date.getUTCMonth();
        const year = date.getUTCFullYear();
        return {
          label: `${WEEKDAYS_SHORT[weekdayIdx]} ${dayNum}`,
          ariaLabel: `${WEEKDAYS_LONG[weekdayIdx]}, ${dayNum} de ${MONTHS_LONG[monthIdx]} de ${year}`,
          appointments: d.appointments,
          completedEncounters: d.completedEncounters,
          newPatients: d.newPatients,
          collected: d.collected,
        };
      }),
    };
  }

  if (daysCount <= 92) {
    const buckets: DailyBucket[] = [];
    let currentWeekDays: DailyStat[] = [];

    for (let i = 0; i < allDays.length; i++) {
      const d = allDays[i];
      const date = toUtcDate(d.date);
      const isMonday = isoWeekday(date) === 1;

      if (isMonday && currentWeekDays.length > 0) {
        buckets.push(buildWeekBucket(currentWeekDays));
        currentWeekDays = [];
      }
      currentWeekDays.push(d);
    }
    if (currentWeekDays.length > 0) {
      buckets.push(buildWeekBucket(currentWeekDays));
    }

    return {
      granularity: 'week',
      buckets,
    };
  }

  // > 92 días: por mes
  const monthMap = new Map<string, DailyStat[]>();
  for (const d of allDays) {
    const monthKey = d.date.slice(0, 7); // YYYY-MM
    const existing = monthMap.get(monthKey);
    if (existing) {
      existing.push(d);
    } else {
      monthMap.set(monthKey, [d]);
    }
  }

  const buckets: DailyBucket[] = [];
  for (const [monthKey, days] of monthMap.entries()) {
    const [yearStr, monthStr] = monthKey.split('-');
    const year = Number(yearStr);
    const monthIdx = Number(monthStr) - 1;

    let appointments = 0;
    let completedEncounters = 0;
    let newPatients = 0;
    let collected = 0;

    for (const d of days) {
      appointments += d.appointments;
      completedEncounters += d.completedEncounters;
      newPatients += d.newPatients;
      collected += d.collected;
    }

    buckets.push({
      label: `${MONTHS_SHORT[monthIdx]} ${year}`,
      ariaLabel: `${MONTHS_LONG[monthIdx]} de ${year}`,
      appointments,
      completedEncounters,
      newPatients,
      collected,
    });
  }

  return {
    granularity: 'month',
    buckets,
  };
}

function buildWeekBucket(days: DailyStat[]): DailyBucket {
  const firstDate = toUtcDate(days[0].date);
  const lastDate = toUtcDate(days[days.length - 1].date);

  let appointments = 0;
  let completedEncounters = 0;
  let newPatients = 0;
  let collected = 0;

  for (const d of days) {
    appointments += d.appointments;
    completedEncounters += d.completedEncounters;
    newPatients += d.newPatients;
    collected += d.collected;
  }

  const firstDayNum = firstDate.getUTCDate();
  const firstMonthShort = MONTHS_SHORT[firstDate.getUTCMonth()];
  const label = `sem. ${firstDayNum} ${firstMonthShort}`;

  const lastDayNum = lastDate.getUTCDate();
  const lastMonthLong = MONTHS_LONG[lastDate.getUTCMonth()];
  const lastYear = lastDate.getUTCFullYear();
  const firstMonthLong = MONTHS_LONG[firstDate.getUTCMonth()];

  const ariaLabel =
    firstDate.getUTCMonth() === lastDate.getUTCMonth()
      ? `Semana del ${firstDayNum} al ${lastDayNum} de ${lastMonthLong} de ${lastYear}`
      : `Semana del ${firstDayNum} de ${firstMonthLong} al ${lastDayNum} de ${lastMonthLong} de ${lastYear}`;

  return {
    label,
    ariaLabel,
    appointments,
    completedEncounters,
    newPatients,
    collected,
  };
}
