import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import {
  CreateUserRequest,
  GrantAccessRequest,
  ResetPasswordRequest,
  UpdateUserRolesRequest,
  User,
} from '../models/user.models';

@Injectable({
  providedIn: 'root',
})
export class UsersApi {
  private readonly api = inject(ApiClient);

  /** Todas las cuentas sin borrado lógico (activas e inactivas). Solo ADMIN (director). */
  list(): Observable<User[]> {
    return this.api.get<User[]>('/api/v1/users');
  }

  create(request: CreateUserRequest): Observable<User> {
    return this.api.post<User>('/api/v1/users', request);
  }

  deactivate(id: string): Observable<User> {
    return this.api.post<User>(`/api/v1/users/${id}/deactivate`);
  }

  activate(id: string): Observable<User> {
    return this.api.post<User>(`/api/v1/users/${id}/activate`);
  }

  updateRoles(id: string, request: UpdateUserRolesRequest): Observable<User> {
    return this.api.put<User>(`/api/v1/users/${id}/roles`, request);
  }

  /** Devuelve el `message` del backend ("Contraseña restablecida."), porque `data` viene en `null`. */
  resetPassword(id: string, request: ResetPasswordRequest): Observable<string> {
    return this.api.post<string>(`/api/v1/users/${id}/reset-password`, request);
  }

  /** Crea la cuenta de acceso de un profesional sin cuenta (201). */
  grantAccess(professionalId: string, request: GrantAccessRequest): Observable<User> {
    return this.api.post<User>(`/api/v1/professionals/${professionalId}/access`, request);
  }
}
