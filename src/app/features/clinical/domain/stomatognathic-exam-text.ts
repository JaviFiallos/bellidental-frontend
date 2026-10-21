import { STOMATOGNATHIC_REGIONS } from './stomatognathic-regions';

export interface StomatognathicExamParts {
  /** Texto libre antes de la primera región marcada (observación general). */
  general: string;
  /** Descripción por número de región marcada; sin clave = región sin renglón. */
  regions: Record<number, string>;
}

const REGION_LINE_PATTERN = /^(\d{1,2})\.\s*[^:]*:\s?(.*)$/;

/**
 * Separa el texto guardado en `stomatognathicExam` en la observación general y un texto por región marcada.
 * Un renglón `N. …:` cuyo número está marcado abre el bloque de esa región; los renglones siguientes que no
 * abren otro bloque se suman a ella. Un renglón `N. …:` de una región no marcada queda como texto general.
 */
export function parseStomatognathicExam(
  text: string | null | undefined,
  markedRegions: readonly number[] | null | undefined
): StomatognathicExamParts {
  const marked = new Set(markedRegions ?? []);
  const generalLines: string[] = [];
  const regions: Record<number, string> = {};
  let currentRegion: number | null = null;

  for (const line of (text ?? '').split(/\r?\n/)) {
    const match = REGION_LINE_PATTERN.exec(line);
    if (match) {
      const regionId = Number(match[1]);
      if (marked.has(regionId) && !(regionId in regions)) {
        regions[regionId] = match[2];
        currentRegion = regionId;
        continue;
      }
      currentRegion = null;
      generalLines.push(line);
      continue;
    }

    if (currentRegion !== null) {
      regions[currentRegion] = `${regions[currentRegion]}\n${line}`;
    } else {
      generalLines.push(line);
    }
  }

  return { general: generalLines.join('\n'), regions };
}

/**
 * Vuelve a escribir el texto: la observación general (si no está vacía) y luego `N. Nombre: texto` por cada
 * región marcada, en orden numérico. Una región sin texto queda como `N. Nombre:`. Todo vacío devuelve null.
 */
export function serializeStomatognathicExam(
  general: string,
  regions: Readonly<Record<number, string>>,
  markedRegions: readonly number[]
): string | null {
  const lines: string[] = [];
  if (general.trim().length > 0) {
    lines.push(general);
  }

  const orderedRegions = [...new Set(markedRegions)].sort((a, b) => a - b);
  for (const regionId of orderedRegions) {
    const region = STOMATOGNATHIC_REGIONS.find((item) => item.id === regionId);
    if (!region) continue;
    const regionText = regions[regionId] ?? '';
    lines.push(regionText.length > 0 ? `${region.id}. ${region.name}: ${regionText}` : `${region.id}. ${region.name}:`);
  }

  return lines.length > 0 ? lines.join('\n') : null;
}
