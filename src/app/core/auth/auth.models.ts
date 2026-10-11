export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
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
