export type UserRole = 'ADMIN' | 'ODONTOLOGO' | 'SECRETARIA';

/** Roles que el director puede asignar al crear una cuenta (ADMIN no se asigna desde la UI). */
export type AssignableRole = Exclude<UserRole, 'ADMIN'>;

/** Cuenta de `GET /api/v1/users` (sin datos de si es del sistema ni del profesional vinculado). */
export interface User {
  id: string;
  username: string;
  email: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: UserRole[];
}

/** Cuerpo de `POST /api/v1/users`. `username` solo se envía si se escribió. */
export interface CreateUserRequest {
  email: string;
  username?: string;
  temporaryPassword: string;
  roles: AssignableRole[];
}

/** Aviso con la contraseña temporal de la última cuenta creada (se muestra una sola vez). */
export interface CreatedUserNotice {
  username: string;
  temporaryPassword: string;
}
