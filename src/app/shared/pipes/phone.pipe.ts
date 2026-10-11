import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phone',
  standalone: true,
})
export class PhonePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';

    const trimmed = value.trim();
    // Normalizar quitando prefijo de país Ecuador (+593 o 593)
    let cleaned = trimmed.replace(/^\+?593/, '0');

    // Quitar caracteres no numéricos
    const digits = cleaned.replace(/\D/g, '');

    // Formato estándar celular Ecuador (10 dígitos: 0987 654 321)
    if (digits.length === 10 && digits.startsWith('0')) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }

    // Formato teléfono fijo Ecuador con código de área (9 dígitos: 02 234 5678)
    if (digits.length === 9 && digits.startsWith('0')) {
      return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    }

    return trimmed;
  }
}
