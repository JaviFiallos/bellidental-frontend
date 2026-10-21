import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { AuthResponse, CurrentUser, LoginRequest } from './auth.models';
import { SessionStore } from './session.store';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  login(credentials: LoginRequest): Observable<CurrentUser> {
    return this.api.post<AuthResponse>('/api/v1/auth/login', credentials).pipe(
      tap((auth) => {
        this.sessionStore.setSession(auth.accessToken, auth.expiresIn);
      }),
      switchMap(() => this.loadCurrentUser()),
      catchError((err) => {
        this.sessionStore.clearSession();
        return throwError(() => err);
      })
    );
  }

  loadCurrentUser(): Observable<CurrentUser> {
    return this.api.get<CurrentUser>('/api/v1/auth/me').pipe(
      tap((user) => {
        this.sessionStore.setCurrentUser(user);
      })
    );
  }

  restoreSession(): Observable<boolean> {
    if (!this.sessionStore.token() || this.sessionStore.isTokenExpired()) {
      this.sessionStore.clearSession();
      return of(false);
    }

    if (this.sessionStore.currentUser()) {
      return of(true);
    }

    return this.loadCurrentUser().pipe(
      map(() => true),
      catchError(() => {
        this.sessionStore.clearSession();
        return of(false);
      })
    );
  }

  logout(): void {
    this.sessionStore.clearSession();
    this.router.navigate(['/auth/login']);
  }
}
