import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ClinicClock {
  readonly timeZone = 'America/Guayaquil';

  /**
   * Retorna una instancia de Date que representa el momento actual.
   */
  now(): Date {
    return new Date();
  }

  /**
   * Retorna la fecha de hoy en formato YYYY-MM-DD según America/Guayaquil.
   */
  todayDateString(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(this.now());
  }

  /**
   * Retorna el rango de inicio y fin del día actual con offset -05:00.
   * from: "YYYY-MM-DDT00:00:00-05:00"
   * to:   "YYYY-MM-DDT23:59:59-05:00"
   */
  todayRange(): { from: string; to: string } {
    const today = this.todayDateString();
    return {
      from: `${today}T00:00:00-05:00`,
      to: `${today}T23:59:59-05:00`,
    };
  }
}
