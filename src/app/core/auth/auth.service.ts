import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, AuthData, LoginRequest, RegisterRequest } from './auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = 'http://localhost:8080/api/v1/auth';

  constructor(private http: HttpClient) {}

  /**
   * Inicia sesión con usuario y contraseña.
   * POST /api/v1/auth/login
   */
  login(credentials: LoginRequest): Observable<ApiResponse<AuthData>> {
    return this.http.post<ApiResponse<AuthData>>(
      `${this.baseUrl}/login`,
      credentials
    );
  }

  /**
   * Registra un nuevo usuario.
   * POST /api/v1/auth/register
   */
  register(payload: RegisterRequest): Observable<ApiResponse<AuthData>> {
    return this.http.post<ApiResponse<AuthData>>(
      `${this.baseUrl}/register`,
      payload
    );
  }
}
