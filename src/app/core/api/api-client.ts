import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { from, Observable, OperatorFunction, throwError } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { ApiError, ApiResponse } from './api.models';
import { getApiErrorMessage, readBlobErrorMessage } from './api-error-messages';

@Injectable({
  providedIn: 'root',
})
export class ApiClient {
  private readonly http = inject(HttpClient);

  get<T>(
    url: string,
    options?: {
      params?: HttpParams | { [param: string]: string | number | boolean | readonly (string | number | boolean)[] };
    }
  ): Observable<T> {
    return this.http.get<ApiResponse<T>>(url, options).pipe(this.unwrap<T>());
  }

  post<T>(
    url: string,
    body?: unknown,
    options?: {
      params?: HttpParams | { [param: string]: string | number | boolean | readonly (string | number | boolean)[] };
    }
  ): Observable<T> {
    return this.http.post<ApiResponse<T>>(url, body, options).pipe(this.unwrap<T>());
  }

  put<T>(
    url: string,
    body?: unknown,
    options?: {
      params?: HttpParams | { [param: string]: string | number | boolean | readonly (string | number | boolean)[] };
    }
  ): Observable<T> {
    return this.http.put<ApiResponse<T>>(url, body, options).pipe(this.unwrap<T>());
  }

  /** Descarga binaria (PDF) con el token del interceptor. Sin `ApiResponse`: el error del Blob se lee como JSON. */
  getBlob(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError((err: HttpErrorResponse) =>
        from(this.toBlobApiError(err)).pipe(mergeMap((apiError) => throwError(() => apiError)))
      )
    );
  }

  private async toBlobApiError(err: HttpErrorResponse): Promise<ApiError> {
    const blobMessage = err.error instanceof Blob ? await readBlobErrorMessage(err.error) : null;
    return { status: err.status, message: blobMessage ?? getApiErrorMessage(err) };
  }

  private unwrap<T>(): OperatorFunction<ApiResponse<T>, T> {
    return (source$) =>
      source$.pipe(
        map((res) => (res.data !== undefined && res.data !== null ? res.data : (res.message as unknown as T))),
        catchError((err: HttpErrorResponse) => {
          const apiError: ApiError = {
            status: err.status,
            message: getApiErrorMessage(err),
          };
          return throwError(() => apiError);
        })
      );
  }
}
