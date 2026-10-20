import { DiagnosticExam } from '../models/encounter.models';

export interface StomatognathicRegion {
  id: number;
  name: string;
  shortName: string;
}

export interface DiagnosticExamOption {
  code: DiagnosticExam;
  label: string;
}

export const STOMATOGNATHIC_REGIONS: readonly StomatognathicRegion[] = [
  { id: 1, name: 'Labios', shortName: 'LABIOS' },
  { id: 2, name: 'Mejillas', shortName: 'MEJILLAS' },
  { id: 3, name: 'Maxilar superior', shortName: 'MAXILAR SUP.' },
  { id: 4, name: 'Maxilar inferior', shortName: 'MAXILAR INF.' },
  { id: 5, name: 'Lengua', shortName: 'LENGUA' },
  { id: 6, name: 'Paladar', shortName: 'PALADAR' },
  { id: 7, name: 'Piso', shortName: 'PISO' },
  { id: 8, name: 'Carrillos', shortName: 'CARRILLOS' },
  { id: 9, name: 'Glándulas salivales', shortName: 'GLÁNDULAS SALIVALES' },
  { id: 10, name: 'Orofaringe', shortName: 'OROFARINGE' },
  { id: 11, name: 'A. T. M.', shortName: 'A. T. M.' },
  { id: 12, name: 'Ganglios', shortName: 'GANGLIOS' },
];

export const DIAGNOSTIC_EXAMS: readonly DiagnosticExamOption[] = [
  { code: 'BIOMETRIA', label: 'Biometría' },
  { code: 'QUIMICA_SANGUINEA', label: 'Química sanguínea' },
  { code: 'RAYOS_X', label: 'Rayos X' },
  { code: 'OTROS', label: 'Otros' },
];

export function formatMarkedRegions(regions?: readonly number[] | null): string {
  if (!regions || regions.length === 0) return 'Ninguna';
  const names = regions.map((id) => {
    const reg = STOMATOGNATHIC_REGIONS.find((r) => r.id === id);
    return reg ? `${reg.id} ${reg.name}` : String(id);
  });
  return names.length > 0 ? names.join(', ') : 'Ninguna';
}

export function formatMarkedExams(exams?: readonly DiagnosticExam[] | null): string {
  if (!exams || exams.length === 0) return 'Ninguna';
  const labels = exams.map((code) => {
    const option = DIAGNOSTIC_EXAMS.find((e) => e.code === code);
    return option ? option.label : code;
  });
  return labels.length > 0 ? labels.join(', ') : 'Ninguna';
}
