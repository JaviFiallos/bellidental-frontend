import { User, UserRole } from '../models/user.models';

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Director',
  ODONTOLOGO: 'Odontólogo',
  SECRETARIA: 'Secretaria',
};

export const MIN_PASSWORD_LENGTH = 10;

const TEMPORARY_PASSWORD_LENGTH = 12;

/** Sin 0/O/1/l/I: se dicta por teléfono o se anota a mano. */
const TEMPORARY_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** Texto de la columna Rol. Sin roles es una cuenta del sistema (bot). */
export function describeRoles(user: User): string {
  if (user.roles.length === 0) {
    return 'Cuenta del sistema';
  }
  return user.roles.map((role) => ROLE_LABELS[role]).join(' · ');
}

/** Heurística F-17: las cuentas con ADMIN o sin roles no se pueden desactivar desde la UI. */
export function isManageableUser(user: User): boolean {
  return user.roles.length > 0 && !user.roles.includes('ADMIN');
}

/** Texto que reemplaza las acciones de una fila no gestionable. */
export function describeUnmanageable(user: User): string {
  return user.roles.length === 0 ? 'Cuenta del sistema' : 'Sin acciones';
}

/** Subtítulo del encabezado: "4 cuentas · 3 activas". */
export function summarizeAccounts(users: readonly User[]): string {
  if (users.length === 0) {
    return '';
  }
  const activeCount = users.filter((user) => user.active).length;
  const accountsLabel = users.length === 1 ? 'cuenta' : 'cuentas';
  const activeLabel = activeCount === 1 ? 'activa' : 'activas';
  return `${users.length} ${accountsLabel} · ${activeCount} ${activeLabel}`;
}

/** Contraseña temporal aleatoria con `crypto.getRandomValues`. */
export function generateTemporaryPassword(): string {
  const randomValues = new Uint32Array(TEMPORARY_PASSWORD_LENGTH);
  crypto.getRandomValues(randomValues);
  return Array.from(
    randomValues,
    (value) => TEMPORARY_PASSWORD_ALPHABET[value % TEMPORARY_PASSWORD_ALPHABET.length]
  ).join('');
}
