import { CatalogSpecialty, CatalogTreatment } from '../models/catalog.models';

export const NO_SPECIALTY_LABEL = 'Cualquiera';
export const MIN_SEARCH_LENGTH = 2;
export const DEFAULT_DURATION_MINUTES = 30;

/** Duraciones permitidas: múltiplos de 15 entre 15 y 240 (el backend valida lo mismo). */
export const DURATION_OPTIONS_MINUTES: readonly number[] = Array.from(
  { length: 16 },
  (_, index) => (index + 1) * 15
);

/** Precio con hasta 2 decimales; acepta punto o coma. Sin signo: no hay precios negativos. */
export const PRICE_PATTERN = /^\d+([.,]\d{1,2})?$/;

/** Código en mayúsculas y sin espacios sobrantes (el backend lo guarda tal cual). */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Número del precio escrito, o `null` si no cumple `PRICE_PATTERN`. */
export function parsePrice(text: string): number | null {
  const trimmed = text.trim();
  if (!PRICE_PATTERN.test(trimmed)) {
    return null;
  }
  return Number(trimmed.replace(',', '.'));
}

export function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

/** Nombre de cada especialidad por id (incluye inactivas, para mostrar las de tratamientos viejos). */
export function specialtyNamesById(specialties: readonly CatalogSpecialty[]): ReadonlyMap<number, string> {
  return new Map(specialties.map((specialty) => [specialty.id, specialty.name]));
}

/** Texto de la columna Especialidad: nombre, o «Cualquiera» si no tiene. */
export function treatmentSpecialtyLabel(
  treatment: CatalogTreatment,
  namesById: ReadonlyMap<number, string>
): string {
  if (treatment.specialtyId === null) {
    return NO_SPECIALTY_LABEL;
  }
  return namesById.get(treatment.specialtyId) ?? '—';
}

/**
 * Tratamientos ordenados por código, filtrados por texto (código o nombre, desde 2 caracteres)
 * y, si no se muestran inactivos, solo los activos.
 */
export function filterTreatments(
  treatments: readonly CatalogTreatment[],
  query: string,
  showInactive: boolean
): CatalogTreatment[] {
  const term = query.trim().toLowerCase();
  const searching = term.length >= MIN_SEARCH_LENGTH;

  return treatments
    .filter((treatment) => showInactive || treatment.active)
    .filter(
      (treatment) =>
        !searching ||
        treatment.code.toLowerCase().includes(term) ||
        treatment.name.toLowerCase().includes(term)
    )
    .sort((a, b) => a.code.localeCompare(b.code, 'es'));
}

/**
 * Especialidades que se ofrecen en el formulario de tratamiento: las activas, más la actual del tratamiento
 * aunque esté inactiva (si no, al guardar se quitaría sin que el director lo note).
 */
export function specialtyChoices(
  specialties: readonly CatalogSpecialty[],
  currentSpecialtyId: number | null
): { id: number; label: string }[] {
  return specialties
    .filter((specialty) => specialty.active || specialty.id === currentSpecialtyId)
    .map((specialty) => ({
      id: specialty.id,
      label: specialty.active ? specialty.name : `${specialty.name} (inactiva)`,
    }));
}

export function summarizeTreatments(treatments: readonly CatalogTreatment[]): string {
  const active = treatments.filter((treatment) => treatment.active).length;
  return `${countOf(treatments.length, 'tratamiento', 'tratamientos')} · ${countOf(active, 'activo', 'activos')}`;
}

export function summarizeSpecialties(specialties: readonly CatalogSpecialty[]): string {
  const active = specialties.filter((specialty) => specialty.active).length;
  return `${countOf(specialties.length, 'especialidad', 'especialidades')} · ${countOf(active, 'activa', 'activas')}`;
}

function countOf(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
