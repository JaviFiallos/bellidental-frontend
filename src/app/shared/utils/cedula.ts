const PROVINCE_CODES_MAX = 24;
const FOREIGN_PROVINCE_CODE = 30;
const NATURAL_PERSON_MAX_THIRD_DIGIT = 6;
const VERIFIER_COEFFICIENTS = [2, 1, 2, 1, 2, 1, 2, 1, 2];

/**
 * Valida una cédula ecuatoriana: 10 dígitos, provincia 01–24 o 30,
 * tercer dígito menor a 6 y dígito verificador (módulo 10).
 */
export function isValidCedula(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false;

  const province = Number(value.slice(0, 2));
  const isValidProvince =
    (province >= 1 && province <= PROVINCE_CODES_MAX) || province === FOREIGN_PROVINCE_CODE;
  if (!isValidProvince) return false;

  const thirdDigit = Number(value[2]);
  if (thirdDigit >= NATURAL_PERSON_MAX_THIRD_DIGIT) return false;

  const sum = VERIFIER_COEFFICIENTS.reduce((total, coefficient, index) => {
    const product = Number(value[index]) * coefficient;
    return total + (product > 9 ? product - 9 : product);
  }, 0);
  const expectedVerifier = (10 - (sum % 10)) % 10;

  return expectedVerifier === Number(value[9]);
}
