import type { AbstractControl } from '@angular/forms';

/**
 * Mensaje en español del primer error de validación de un campo de paciente.
 * Solo se muestra cuando el campo fue tocado (al salir del campo o al enviar).
 */
export function patientFieldErrorMessage(control: AbstractControl): string | null {
  const errors = control.errors;
  if (!errors || !control.touched) return null;

  if (errors['required']) return 'Campo obligatorio';
  if (errors['cedula']) return 'Cédula no válida';
  if (errors['phone']) return 'Teléfono no válido (ej. 0987 654 321)';
  if (errors['email']) return 'Correo no válido';
  if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
  return 'Revisa este campo';
}
