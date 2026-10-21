import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'clinicTime',
  standalone: true,
})
export class ClinicTimePipe implements PipeTransform {
  private readonly timeFormatter = new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  transform(value: Date | string | number | null | undefined): string {
    if (!value) return '';

    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';

    return this.timeFormatter.format(date);
  }
}
