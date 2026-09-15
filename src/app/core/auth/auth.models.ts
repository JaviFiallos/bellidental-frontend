// Modelo base para todas las respuestas del API (wrapper estándar)
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

// Datos devueltos tras un login o registro exitoso
export interface AuthData {
  token: string;
  username: string;
  email: string;
}

// Payload para el endpoint POST /api/v1/auth/login
export interface LoginRequest {
  username: string;
  password: string;
}

// Payload para el endpoint POST /api/v1/auth/register
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  roleCode?: 'ADMIN' | 'ODONTOLOGO' | 'SECRETARIA';
}
