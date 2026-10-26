import { Medication, MedicationPreset } from '../models/prescription.models';

export const MIN_SEARCH_LENGTH = 2;

/**
 * Quita tildes, pasa a minúsculas y recorta espacios.
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Filtra medicamentos por nombre (sin tildes ni mayúsculas, mínimo 2 caracteres)
 * y por estado activo según la casilla `showInactive`. Preserva el orden del backend.
 */
export function filterMedications(
  medications: readonly Medication[],
  query: string,
  showInactive: boolean
): Medication[] {
  const normalizedQuery = normalizeSearchText(query);
  const isSearching = normalizedQuery.length >= MIN_SEARCH_LENGTH;

  return medications.filter((med) => {
    if (!showInactive && !med.active) {
      return false;
    }
    if (!isSearching) {
      return true;
    }
    return normalizeSearchText(med.name).includes(normalizedQuery);
  });
}

/**
 * Conteo de posologías activas de un medicamento.
 */
export function activePresetsCount(medication: Medication): number {
  return medication.presets.filter((preset) => preset.active).length;
}

/**
 * Texto legible del conteo de posologías (p. ej. «3 posologías», «1 posología», «0 posologías»).
 */
export function formatPresetsCount(count: number): string {
  return `${count} ${count === 1 ? 'posología' : 'posologías'}`;
}

/**
 * Resumen para la cabecera: cantidad total de medicamentos y cantidad activos.
 */
export function summarizeMedications(medications: readonly Medication[]): string {
  const active = medications.filter((m) => m.active).length;
  const totalLabel = `${medications.length} ${medications.length === 1 ? 'medicamento' : 'medicamentos'}`;
  const activeLabel = `${active} ${active === 1 ? 'activo' : 'activos'}`;
  return `${totalLabel} · ${activeLabel}`;
}

/**
 * Sugerencia de nombre de plantilla a partir de frecuencia y duración.
 * Formato «<frecuencia> × <duración>», primera letra en mayúscula y recortada a 60 caracteres.
 */
export function suggestPresetLabel(frequency: string, duration: string): string {
  const f = frequency.trim();
  const d = duration.trim();
  const combined = `${f} × ${d}`.trim();
  if (!combined) {
    return '';
  }
  const capitalized = combined.charAt(0).toUpperCase() + combined.slice(1);
  return capitalized.slice(0, 60);
}

/**
 * Comprueba si la combinación de dosis, frecuencia, duración e indicaciones escritas
 * coincide exactamente con alguna posología del medicamento.
 */
export function matchesExistingPreset(
  presets: readonly MedicationPreset[],
  posology: { dose: string; frequency: string; duration: string; instructions?: string }
): boolean {
  const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();
  const d = norm(posology.dose);
  const f = norm(posology.frequency);
  const dur = norm(posology.duration);
  const inst = norm(posology.instructions);

  return presets.some((p) => {
    return (
      norm(p.dose) === d &&
      norm(p.frequency) === f &&
      norm(p.duration) === dur &&
      norm(p.instructions) === inst
    );
  });
}

