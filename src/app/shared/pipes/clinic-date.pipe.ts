import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'clinicDate',
  standalone: true,
})
export class ClinicDatePipe implements PipeTransform {
  private readonly shortFormatter = new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  private readonly longFormatter = new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  transform(value: Date | string | number | null | undefined, format: 'short' | 'long' = 'short'): string {
    if (!value) return '';

    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';

    if (format === 'long') {
      return this.longFormatter.format(date);
    }

    // Retorna por defecto formato corto "sáb 10 oct" (sin punto final en abreviaturas si es-EC lo agrega)
    const formatted = this.shortFormatter.format(date);
    return formatted.replace(/\./g, '');
  }
}
