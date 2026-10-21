import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { CreateUserRequest, User } from '../models/user.models';

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
}
