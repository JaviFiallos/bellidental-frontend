export type EncounterPeriodKind = 'dia' | 'semana' | 'mes';

export interface EncounterPeriod {
  kind: EncounterPeriodKind;
  unit: 'día' | 'semana' | 'mes';
  /** Fecha que ancla el período (YYYY-MM-DD). Se guarda en la URL. */
  anchorDate: string;
  /** Primer día del período (YYYY-MM-DD). */
  from: string;
  /** Último día del período (YYYY-MM-DD). */
  to: string;
  label: string;
  isToday: boolean;
}

const UNIT_BY_KIND: Record<EncounterPeriodKind, EncounterPeriod['unit']> = {
  dia: 'día',
  semana: 'semana',
  mes: 'mes',
};

const MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

const WEEKDAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toUtcDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Suma días a una fecha YYYY-MM-DD con aritmética UTC (sin zona local). */
export function addCalendarDays(value: string, days: number): string {
  const date = toUtcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
}

/** Día ISO de la semana: 1 = lunes … 7 = domingo. */
function isoWeekday(value: string): number {
  const weekday = toUtcDate(value).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function isValidDateString(value: string | null): value is string {
  return value !== null && DATE_PATTERN.test(value) && toDateString(toUtcDate(value)) === value;
}

function rangeFor(kind: EncounterPeriodKind, anchorDate: string): { from: string; to: string } {
  if (kind === 'dia') {
    return { from: anchorDate, to: anchorDate };
  }
  if (kind === 'semana') {
    const from = addCalendarDays(anchorDate, 1 - isoWeekday(anchorDate));
    return { from, to: addCalendarDays(from, 6) };
  }
  const [year, month] = anchorDate.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

function dayLabel(anchorDate: string): string {
  const date = toUtcDate(anchorDate);
  return `${WEEKDAYS_LONG[date.getUTCDay()]}, ${date.getUTCDate()} de ${MONTHS_LONG[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

function weekLabel(from: string, to: string): string {
  const start = toUtcDate(from);
  const end = toUtcDate(to);
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  const startMonth = MONTHS_SHORT[start.getUTCMonth()];
  const endMonth = MONTHS_SHORT[end.getUTCMonth()];

  if (startYear !== endYear) {
    return `${start.getUTCDate()} ${startMonth} ${startYear} – ${end.getUTCDate()} ${endMonth} ${endYear}`;
  }
  if (start.getUTCMonth() !== end.getUTCMonth()) {
    return `${start.getUTCDate()} ${startMonth} – ${end.getUTCDate()} ${endMonth} ${endYear}`;
  }
  return `${start.getUTCDate()} – ${end.getUTCDate()} ${endMonth} ${endYear}`;
}

function monthLabel(anchorDate: string): string {
  const date = toUtcDate(anchorDate);
  return `${MONTHS_LONG[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Construye el período que contiene `anchorDate` según el tipo (día, semana lunes–domingo o mes). */
export function buildEncounterPeriod(
  kind: EncounterPeriodKind,
  anchorDate: string,
  todayDate: string
): EncounterPeriod {
  const { from, to } = rangeFor(kind, anchorDate);
  const label =
    kind === 'dia' ? dayLabel(anchorDate) : kind === 'semana' ? weekLabel(from, to) : monthLabel(anchorDate);
  return {
    kind,
    unit: UNIT_BY_KIND[kind],
    anchorDate,
    from,
    to,
    label,
    isToday: from <= todayDate && todayDate <= to,
  };
}

/** Lee `periodo` y `fecha` de la URL; valores ausentes o inválidos caen en semana y hoy. */
export function parseEncounterPeriod(
  kindParam: string | null,
  dateParam: string | null,
  todayDate: string
): EncounterPeriod {
  const kind: EncounterPeriodKind =
    kindParam === 'dia' || kindParam === 'semana' || kindParam === 'mes' ? kindParam : 'semana';
  const anchorDate = isValidDateString(dateParam) ? dateParam : todayDate;
  return buildEncounterPeriod(kind, anchorDate, todayDate);
}

/** Nueva fecha de ancla al mover ‹ (-1) o › (+1): día = 1 día, semana = 7 días, mes = 1 mes (día 1). */
export function shiftEncounterAnchor(
  period: Pick<EncounterPeriod, 'kind' | 'anchorDate'>,
  direction: -1 | 1
): string {
  if (period.kind === 'dia') {
    return addCalendarDays(period.anchorDate, direction);
  }
  if (period.kind === 'semana') {
    return addCalendarDays(period.anchorDate, 7 * direction);
  }
  const [year, month] = period.anchorDate.split('-').map(Number);
  return toDateString(new Date(Date.UTC(year, month - 1 + direction, 1)));
}
