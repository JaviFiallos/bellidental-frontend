const ECUADOR_COUNTRY_CODE = '593';
const PHONE_CHARACTERS = /^[\d\s+\-()]+$/;
const LOCAL_MOBILE = /^09\d{8}$/;
const LOCAL_LANDLINE = /^0[2-7]\d{7}$/;
const E164_ECUADOR = /^593(9\d{8}|[2-7]\d{7})$/;

/**
 * Convierte un teléfono ecuatoriano escrito por una persona (0987 654 321, +593 987…, 593…)
 * al formato que guarda el backend: "593" seguido de los dígitos sin "+". Retorna null si no es válido.
 */
export function toEcuadorE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (!PHONE_CHARACTERS.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, '');

  if (LOCAL_MOBILE.test(digits) || LOCAL_LANDLINE.test(digits)) {
    return ECUADOR_COUNTRY_CODE + digits.slice(1);
  }
  if (E164_ECUADOR.test(digits)) {
    return digits;
  }
  return null;
}

/**
 * Convierte un teléfono en formato E.164 (593…) a formato local (0987654321) para precargar un campo.
 */
export function toEcuadorLocal(e164: string | null | undefined): string {
  if (!e164) return '';
  const digits = e164.replace(/\D/g, '');
  if (digits.startsWith(ECUADOR_COUNTRY_CODE)) {
    return '0' + digits.slice(ECUADOR_COUNTRY_CODE.length);
  }
  return digits;
}
