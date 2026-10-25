/** Preset de posología de un medicamento: al elegirlo se copian dosis, frecuencia, duración e indicaciones. */
export interface MedicationPreset {
  id: number;
  label: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  active: boolean;
}

export interface Medication {
  id: number;
  name: string;
  presentation: string;
  concentration: string;
  route: string | null;
  presets: MedicationPreset[];
  active: boolean;
}

export interface MedicationRequest {
  name: string;
  presentation: string;
  concentration: string;
  route?: string;
}

export interface MedicationPresetRequest {
  label: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export type PrescriptionStatus = 'DRAFT' | 'ISSUED';

export interface PrescriptionItem {
  id: string;
  medicationId: number;
  medicationName: string;
  presentation: string;
  concentration: string;
  medicationPresetId: number | null;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  quantity: string | null;
  instructions: string | null;
}

export interface Prescription {
  id: string;
  encounterId: string;
  encounterDiagnosisId: string;
  icd10Code: string;
  icd10Description: string;
  status: PrescriptionStatus;
  prescribedAt: string;
  generalInstructions: string | null;
  voided: boolean;
  items: PrescriptionItem[];
}

export interface PrescriptionItemRequest {
  medicationId: number;
  medicationPresetId?: number;
  dose?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
}

export interface PrescriptionRequest {
  encounterDiagnosisId: string;
  generalInstructions?: string;
  items: PrescriptionItemRequest[];
}

/** Diagnóstico activo de la atención, en el formato que pide el editor (mínimo: no se importa de otro feature). */
export interface DiagnosisOption {
  id: string;
  label: string;
}

/** Encabezado del editor: diagnóstico e indicaciones generales. */
export interface PrescriptionHeaderDraft {
  encounterDiagnosisId: string;
  generalInstructions: string;
}

/** Medicamento elegido en el editor. Los ítems cargados desde una receta guardada no traen presets. */
export interface DraftMedication {
  id: number;
  label: string;
  presets: MedicationPreset[];
}

/** Ítem del editor antes de guardar. Todos los campos de posología siguen siendo editables. */
export interface DraftItem {
  medication: DraftMedication;
  presetId: number | null;
  dose: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
}

/** "Amoxicilina 500 mg · cápsula · oral". */
export function formatMedicationLabel(medication: {
  name: string;
  concentration: string;
  presentation: string;
  route?: string | null;
}): string {
  const nameAndStrength = [medication.name, medication.concentration].filter(Boolean).join(' ');
  return [nameAndStrength, medication.presentation, medication.route ?? '']
    .filter((part) => part.trim() !== '')
    .join(' · ');
}

export function toDraftMedication(medication: Medication): DraftMedication {
  return {
    id: medication.id,
    label: formatMedicationLabel(medication),
    presets: medication.presets,
  };
}
