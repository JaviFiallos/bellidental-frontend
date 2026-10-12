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
   * Retorna el rango de inicio y fin de una fecha dada con offset -05:00.
   * from: "YYYY-MM-DDT00:00:00-05:00"
   * to:   "YYYY-MM-DDT23:59:59-05:00"
   */
  dayRange(date: string | Date): { from: string; to: string } {
    const dateStr = typeof date === 'string' ? date.slice(0, 10) : this.formatDate(date);
    return {
      from: `${dateStr}T00:00:00-05:00`,
      to: `${dateStr}T23:59:59-05:00`,
    };
  }

  /**
   * Suma o resta n días a una fecha y retorna la fecha resultante en formato YYYY-MM-DD.
   */
  addDays(date: string | Date, n: number): string {
    const dateStr = typeof date === 'string' ? date.slice(0, 10) : this.formatDate(date);
    const [year, month, day] = dateStr.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day + n));
    return utcDate.toISOString().slice(0, 10);
  }

  /**
   * Convierte una hora en formato HH:mm, HH:mm:ss o ISO a los minutos transcurridos del día (0..1439) en America/Guayaquil.
   */
  minutesOfDay(isoOrTime: string): number {
    if (!isoOrTime) return 0;

    const timeMatch = isoOrTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      return hours * 60 + minutes;
    }

    const date = new Date(isoOrTime);
    if (isNaN(date.getTime())) return 0;

    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: this.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.format(date).split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return hours * 60 + minutes;
  }

  private formatDate(date: Date): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  }

  /**
   * Retorna el rango de inicio y fin del día actual con offset -05:00.
   * from: "YYYY-MM-DDT00:00:00-05:00"
   * to:   "YYYY-MM-DDT23:59:59-05:00"
   */
  todayRange(): { from: string; to: string } {
    return this.dayRange(this.todayDateString());
  }
}
