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

/** Un error con `responseType: 'blob'` llega como Blob: si su texto es JSON con `message`, se usa ese mensaje. */
export async function readBlobErrorMessage(blob: Blob): Promise<string | null> {
  try {
    const body: unknown = JSON.parse(await blob.text());
    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' && body.message) {
      return body.message;
    }
  } catch {
    // El cuerpo no es JSON: se usa el mensaje estándar.
  }
  return null;
}
