import type { StatusBadgeTone } from '../../../shared/components/status-badge/status-badge.component';
import type { Appointment } from '../../appointments';

export interface EncounterLogStatus {
  label: string;
  tone: StatusBadgeTone;
  actionLabel: string;
}

/** Atención abierta y no anulada (filtro "Solo abiertas"). */
export function isEncounterOpen(
  appointment: Pick<Appointment, 'encounterStatus' | 'encounterVoided'>
): boolean {
  return appointment.encounterStatus === 'OPEN' && !appointment.encounterVoided;
}

/** Estado, color y acción de una fila de "Mis atenciones". Cualquier estado distinto de COMPLETED se trata como abierta. */
export function encounterLogStatus(
  appointment: Pick<Appointment, 'encounterStatus' | 'encounterVoided'>
): EncounterLogStatus {
  if (appointment.encounterVoided) {
    return { label: 'Anulada', tone: 'cancelled', actionLabel: 'Ver' };
  }
  if (appointment.encounterStatus === 'COMPLETED') {
    return { label: 'Cerrada', tone: 'attended', actionLabel: 'Corregir' };
  }
  return { label: 'Abierta', tone: 'in-progress', actionLabel: 'Continuar' };
}

export function encounterSummaryText(total: number, open: number): string {
  const encounters = total === 1 ? 'atención' : 'atenciones';
  const openLabel = open === 1 ? 'abierta' : 'abiertas';
  return `${total} ${encounters} · ${open} ${openLabel}`;
}
