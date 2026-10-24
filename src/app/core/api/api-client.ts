import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, OperatorFunction, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiError, ApiResponse } from './api.models';
import { getApiErrorMessage } from './api-error-messages';

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
