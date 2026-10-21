export interface Shift {
  startTime: string;
  endTime: string;
}

export interface EffectiveDay {
  date: string;
  shifts: Shift[];
}

export interface Schedule {
  id: number;
  weekday: number | null;
  specificDate: string | null;
  startTime: string | null;
  endTime: string | null;
  available: boolean;
}

/** Cuerpo de alta o edición: semana tipo (`weekday`) o excepción (`specificDate`), nunca ambos. */
export interface ScheduleRequest {
  weekday: number | null;
  specificDate: string | null;
  startTime: string | null;
  endTime: string | null;
  available: boolean;
}

/** 1 = lunes … 7 = domingo (ISO), igual que el backend. */
export const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};
