import {
  buildCalendarPeriod,
  CalendarPeriod,
  CalendarPeriodKind,
  isValidDateString,
  rangeLabel,
  shiftCalendarAnchor,
} from '../../../shared/utils/calendar-period';

export type StatsPeriodKind = CalendarPeriodKind | 'rango';

export interface StatsPeriod {
  kind: StatsPeriodKind;
  /** Primer día del período (YYYY-MM-DD, inclusivo). */
  from: string;
  /** Último día del período (YYYY-MM-DD, inclusivo). */
  to: string;
  label: string;
  /** Fecha de ancla para ‹ › (en rango, el día inicial). */
  anchorDate: string;
  unit: CalendarPeriod['unit'];
  isToday: boolean;
}

const MAX_RANGE_DAYS = 366;
const MS_PER_DAY = 86_400_000;

const percentFormatter = new Intl.NumberFormat('es-EC', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function inclusiveDays(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / MS_PER_DAY) + 1;
}

/** Valida un rango de fechas inclusivo; devuelve el mensaje de error o null si es válido. */
export function validateStatsRange(from: string, to: string): string | null {
  if (!from || !to) {
    return 'Elige las dos fechas.';
  }
  if (from > to) {
    return 'La fecha inicial no puede ser posterior a la final.';
  }
  if (inclusiveDays(from, to) > MAX_RANGE_DAYS) {
    return 'El rango no puede superar 366 días.';
  }
  return null;
}

function buildRangePeriod(from: string, to: string, todayDate: string): StatsPeriod {
  return {
    kind: 'rango',
    from,
    to,
    label: rangeLabel(from, to),
    anchorDate: from,
    unit: 'día',
    isToday: from <= todayDate && todayDate <= to,
  };
}

/** Período de la URL (`periodo`, `fecha`, `desde`, `hasta`). Por defecto el mes actual (o defaultKind); valores inválidos también. */
export function parseStatsPeriod(
  kindParam: string | null,
  dateParam: string | null,
  fromParam: string | null,
  toParam: string | null,
  todayDate: string,
  defaultKind: CalendarPeriodKind = 'mes'
): StatsPeriod {
  const defaultPeriod = buildCalendarPeriod(defaultKind, todayDate, todayDate);

  if (kindParam === 'rango') {
    const isValidRange =
      isValidDateString(fromParam) &&
      isValidDateString(toParam) &&
      validateStatsRange(fromParam, toParam) === null;
    return isValidRange ? buildRangePeriod(fromParam, toParam, todayDate) : defaultPeriod;
  }

  if (kindParam !== 'dia' && kindParam !== 'semana' && kindParam !== 'mes') {
    return defaultPeriod;
  }
  const anchorDate = isValidDateString(dateParam) ? dateParam : todayDate;
  return buildCalendarPeriod(kindParam, anchorDate, todayDate);
}

/** Nueva fecha de ancla al mover ‹ o ›; en rango no se usa y se devuelve el ancla actual. */
export function shiftStatsAnchor(period: StatsPeriod, direction: -1 | 1): string {
  const kind = period.kind;
  if (kind === 'rango') {
    return period.anchorDate;
  }
  return shiftCalendarAnchor({ kind, anchorDate: period.anchorDate }, direction);
}

/** Porcentaje con una decimal y coma, p. ej. "5,9 %". */
export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)} %`;
}
