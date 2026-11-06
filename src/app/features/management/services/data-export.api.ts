import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataExportApi {
  private readonly http = inject(HttpClient);

  /**
   * ZIP binario con un CSV por tabla (sin `ApiResponse`). El nombre del archivo viene en `Content-Disposition`.
   * Solo ADMIN (director). Los errores llegan como `HttpErrorResponse` con el cuerpo en `Blob`.
   */
  download(): Observable<HttpResponse<Blob>> {
    return this.http.get('/api/v1/admin/export', { responseType: 'blob', observe: 'response' });
  }
}
