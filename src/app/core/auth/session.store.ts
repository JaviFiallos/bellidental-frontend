import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CurrentUser, Profile, StoredSession } from './auth.models';

export const SESSION_KEY = 'bd.session';

@Injectable({
  providedIn: 'root',
})
export class SessionStore {
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(null);
  private readonly _currentUser = signal<CurrentUser | null>(null);
  private _expiresAt = 0;

  readonly token = this._token.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();

  readonly isAuthenticated = computed(() => {
    const t = this._token();
    return !!t && !this.isTokenExpired();
  });

  readonly profile = computed<Profile | null>(() => {
    const user = this._currentUser();
    if (!user) return null;
    if (user.roles.includes('ADMIN')) return 'DIRECTOR';
    if (user.roles.includes('ODONTOLOGO')) return 'ODONTOLOGO';
    if (user.roles.includes('SECRETARIA')) return 'SECRETARIA';
    return null;
  });

  readonly homeRoute = computed<string>(() => {
    const prof = this.profile();
    if (prof === 'SECRETARIA') return '/recepcion';
    if (prof === 'ODONTOLOGO') return '/consultorio';
    if (prof === 'DIRECTOR') {
      const user = this._currentUser();
      return user?.professionalId ? '/consultorio' : '/direccion/estadisticas';
    }
    return '/auth/login';
  });

  private get storage(): Storage | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } catch {
      // Entorno sin acceso a almacenamiento
    }
    return null;
  }

  constructor() {
    this.restoreSession();
    this.listenToStorageEvents();
  }

  hasPermission(code: string): boolean {
    const user = this._currentUser();
    return user?.permissions?.includes(code) ?? false;
  }

  setSession(accessToken: string, expiresInSeconds: number): void {
    this._expiresAt = Date.now() + expiresInSeconds * 1000;
    this._token.set(accessToken);

    const session: StoredSession = {
      accessToken,
      expiresAt: this._expiresAt,
    };

    try {
      this.storage?.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Si falla localStorage, se mantiene la sesión en memoria
    }
  }

  setCurrentUser(user: CurrentUser | null): void {
    this._currentUser.set(user);
  }

  clearSession(): void {
    this._token.set(null);
    this._currentUser.set(null);
    this._expiresAt = 0;

    try {
      this.storage?.removeItem(SESSION_KEY);
    } catch {
      // Ignorar fallo de almacenamiento
    }
  }

  isTokenExpired(): boolean {
    if (!this._expiresAt) return false;
    return Date.now() >= this._expiresAt;
  }

  private restoreSession(): void {
    try {
      const item = this.storage?.getItem(SESSION_KEY);
      if (!item) return;

      const session: StoredSession = JSON.parse(item);
      if (session.expiresAt && Date.now() >= session.expiresAt) {
        this.storage?.removeItem(SESSION_KEY);
        this._token.set(null);
        this._expiresAt = 0;
        return;
      }

      this._expiresAt = session.expiresAt;
      this._token.set(session.accessToken);
    } catch {
      this._token.set(null);
      this._expiresAt = 0;
    }
  }

  private listenToStorageEvents(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key === SESSION_KEY && !event.newValue) {
          this.clearSession();
          this.router.navigate(['/auth/login']);
        }
      });
    }
  }
}
