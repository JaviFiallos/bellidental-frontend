import { HttpErrorResponse } from '@angular/common/http';

export function getApiErrorMessage(err: HttpErrorResponse): string {
  if (err.status === 0) {
    return 'No se pudo conectar con el servidor.';
  }
  if (err.status === 403) {
    return 'No tienes permiso para esta acción.';
  }
  if (err.status === 404) {
    return 'No encontrado.';
  }
  if (err.error && typeof err.error === 'object' && err.error.message) {
    return err.error.message;
  }
  return 'Ocurrió un error inesperado.';
}
