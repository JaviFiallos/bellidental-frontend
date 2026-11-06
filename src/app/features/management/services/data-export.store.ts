import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from '../../../core/services/notification.service';
import { DataExportApi } from './data-export.api';

const FALLBACK_FILE_NAME = 'bellidental-export.zip';

/** Estado de la descarga de datos. Se provee en la página (no es singleton). */
@Injectable()
export class DataExportStore {
  private readonly dataExportApi = inject(DataExportApi);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly exporting = signal<boolean>(false);

  /** Ignora el clic si ya hay una exportación en curso (evita descargas dobles). */
  export(): void {
    if (this.exporting()) {
      return;
    }
    this.exporting.set(true);

    this.dataExportApi
      .download()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.exporting.set(false);
          this.saveFile(response);
          this.notifications.success('Exportación descargada.');
        },
        error: (err: HttpErrorResponse) => {
          this.exporting.set(false);
          this.notifications.error(exportErrorMessage(err));
        },
      });
  }

  private saveFile(response: HttpResponse<Blob>): void {
    const fileName = fileNameFromDisposition(response.headers.get('Content-Disposition'));
    const objectUrl = URL.createObjectURL(response.body as Blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revocar en el mismo tick del clic puede cancelar la descarga en algunos navegadores.
    setTimeout(() => URL.revokeObjectURL(objectUrl));
  }
}

/** Extrae `filename="..."` de `Content-Disposition`; si falta, usa un nombre por defecto. */
function fileNameFromDisposition(disposition: string | null): string {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1]?.trim() || FALLBACK_FILE_NAME;
}

function exportErrorMessage(err: HttpErrorResponse): string {
  if (err.status === 403) {
    return 'Solo el director puede exportar los datos.';
  }
  return 'No se pudo exportar los datos.';
}
