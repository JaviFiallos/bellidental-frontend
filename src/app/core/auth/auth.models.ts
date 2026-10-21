export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  /** Vigencia del token en segundos (no milisegundos). */
  expiresIn: number;
  roles: string[];
}

export interface CurrentUser {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  professionalId?: string | null;
}

export type Profile = 'SECRETARIA' | 'ODONTOLOGO' | 'DIRECTOR';

export interface StoredSession {
  accessToken: string;
  expiresAt: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
