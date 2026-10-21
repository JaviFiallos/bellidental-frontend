import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionStore } from '../auth/session.store';

/** Peticiones cuyo 401 no significa sesión vencida (credenciales mal escritas). */
const SESSION_SAFE_401_URLS = ['/auth/login', '/auth/password'];

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isSessionSafe = SESSION_SAFE_401_URLS.some((url) => req.url.includes(url));
      if (error.status === 401 && !isSessionSafe) {
        sessionStore.clearSession();
        router.navigate(['/auth/login'], { queryParams: { expirada: '1' } });
      }
      return throwError(() => error);
    })
  );
};
