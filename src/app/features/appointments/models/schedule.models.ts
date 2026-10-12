export interface Shift {
  startTime: string;
  endTime: string;
}

export interface EffectiveDay {
  date: string;
  shifts: Shift[];
}
