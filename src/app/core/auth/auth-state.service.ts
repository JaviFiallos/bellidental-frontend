import { Injectable, signal, computed } from '@angular/core';
import { AuthData } from './auth.models';

const TOKEN_KEY = 'bd_auth_token';
const USER_KEY = 'bd_auth_user';

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  // Signal privado con los datos del usuario autenticado (null = no autenticado)
  private _authData = signal<AuthData | null>(this.loadFromStorage());

  // Señal pública para saber si el usuario está autenticado
  readonly isAuthenticated = computed(() => !!this._authData());

  // Señal pública con los datos del usuario actual
  readonly currentUser = computed(() => this._authData());

  /**
   * Guarda la sesión en localStorage y actualiza el estado.
   */
  setSession(authData: AuthData): void {
    localStorage.setItem(TOKEN_KEY, authData.token);
    localStorage.setItem(USER_KEY, JSON.stringify(authData));
    this._authData.set(authData);
  }

  /**
   * Limpia la sesión del localStorage y resetea el estado.
   */
  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._authData.set(null);
  }

  /**
   * Retorna el token JWT actual o null si no hay sesión.
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Lee los datos del usuario desde localStorage al iniciar la app.
   */
  private loadFromStorage(): AuthData | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthData) : null;
    } catch {
      return null;
    }
  }
}
