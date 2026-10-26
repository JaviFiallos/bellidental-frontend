import { Professional } from '../../professionals';

export interface SuggestedColor {
  hex: string;
  name: string;
}

export const SUGGESTED_PROFESSIONAL_COLORS: readonly SuggestedColor[] = [
  { hex: '#2C5F8A', name: 'Azul' },
  { hex: '#2F8F83', name: 'Verde azulado' },
  { hex: '#4B56B0', name: 'Índigo' },
  { hex: '#C97B2E', name: 'Dorado' },
  { hex: '#D9724F', name: 'Coral' },
  { hex: '#8E4A8C', name: 'Ciruela' },
  { hex: '#4C8A3F', name: 'Verde' },
  { hex: '#4F5D6B', name: 'Gris azulado' },
] as const;

/**
 * Normaliza un color hexadecimal a formato mayúsculas `#RRGGBB`.
 */
export function normalizeHexColor(hex: string): string {
  if (!hex) {
    return '';
  }
  const trimmed = hex.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return withHash.toUpperCase();
}

/**
 * Devuelve el nombre del profesional activo que ya usa ese color (si lo hay),
 * excluyendo al profesional indicado por `exceptId`.
 */
export function colorInUseBy(
  color: string,
  professionals: Professional[],
  exceptId?: string
): string | null {
  const normalized = normalizeHexColor(color);
  if (!normalized) {
    return null;
  }
  const match = professionals.find(
    (p) => p.active && p.id !== exceptId && normalizeHexColor(p.colorTag ?? '') === normalized
  );
  return match ? match.fullName : null;
}

/**
 * Propone el primer color de la lista sugerida que no esté en uso por ningún profesional activo.
 */
export function suggestUnusedColor(professionals: Professional[]): string {
  for (const item of SUGGESTED_PROFESSIONAL_COLORS) {
    if (!colorInUseBy(item.hex, professionals)) {
      return item.hex;
    }
  }
  return SUGGESTED_PROFESSIONAL_COLORS[0].hex;
}

/**
 * Devuelve el nombre en español si coincide con uno sugerido, o el hex.
 */
export function colorNameOrHex(hex: string | null): string {
  if (!hex) {
    return 'Sin color';
  }
  const normalized = normalizeHexColor(hex);
  const found = SUGGESTED_PROFESSIONAL_COLORS.find((c) => c.hex === normalized);
  return found ? found.name : normalized;
}

