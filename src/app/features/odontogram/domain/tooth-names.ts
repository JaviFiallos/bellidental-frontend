import { Tooth, ToothType } from '../models/odontogram.models';
import { getArch } from './odontogram-layout';

const PERMANENT_POSITIONS = [
  '',
  'incisivo central',
  'incisivo lateral',
  'canino',
  'primer premolar',
  'segundo premolar',
  'primer molar',
  'segundo molar',
  'tercer molar',
];

const DECIDUOUS_POSITIONS = [
  '',
  'incisivo central temporal',
  'incisivo lateral temporal',
  'canino temporal',
  'primer molar temporal',
  'segundo molar temporal',
];

const QUADRANT_NAMES: Record<number, string> = {
  1: 'superior derecho',
  2: 'superior izquierdo',
  3: 'inferior izquierdo',
  4: 'inferior derecho',
  5: 'superior derecho',
  6: 'superior izquierdo',
  7: 'inferior izquierdo',
  8: 'inferior derecho',
};

export function getToothName(code: number): string {
  const quadrant = Math.floor(code / 10);
  const position = code % 10;
  const isDeciduous = quadrant >= 5;
  const posName = isDeciduous
    ? DECIDUOUS_POSITIONS[position] || ''
    : PERMANENT_POSITIONS[position] || '';
  const quadName = QUADRANT_NAMES[quadrant] || '';
  return `${posName} ${quadName}`.trim();
}

export function fallbackTooth(code: number): Tooth {
  const quadrant = Math.floor(code / 10);
  const position = code % 10;
  const isDeciduous = quadrant >= 5;
  const arch = getArch(code);
  const type: ToothType =
    position <= 2
      ? 'INCISOR'
      : position === 3
        ? 'CANINE'
        : position <= 5
          ? isDeciduous
            ? 'MOLAR'
            : 'PREMOLAR'
          : 'MOLAR';

  return {
    code,
    dentition: isDeciduous ? 'DECIDUOUS' : 'PERMANENT',
    arch,
    quadrant,
    position,
    type,
  };
}
