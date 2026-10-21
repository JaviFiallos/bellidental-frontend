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

/** Qué operación generó el aviso de contraseña temporal (se muestra una sola vez). */
export type TemporaryPasswordAction = 'created' | 'reset' | 'access';

/** Aviso con la contraseña temporal de la última cuenta creada, restablecida o con acceso nuevo. */
export interface TemporaryPasswordNotice {
  action: TemporaryPasswordAction;
  username: string;
  temporaryPassword: string;
}

/** Cuerpo de `PUT /api/v1/users/{id}/roles`. Solo se admiten Odontólogo y Secretaria; no puede estar vacío. */
export interface UpdateUserRolesRequest {
  roles: AssignableRole[];
}

/** Cuerpo de `POST /api/v1/users/{id}/reset-password`. */
export interface ResetPasswordRequest {
  temporaryPassword: string;
}

/** Cuerpo de `POST /api/v1/professionals/{id}/access`. La cuenta nace con rol Odontólogo. */
export interface GrantAccessRequest {
  email: string;
  temporaryPassword: string;
}
