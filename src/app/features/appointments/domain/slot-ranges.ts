import { AvailableSlot } from '../models/appointment.models';

export const SLOT_STEP_MINUTES = 15;
export const MAX_DURATION_MINUTES = 240;
export const NOON_MINUTES = 720;
export const DEFAULT_DURATION_MINUTES = 30;

export function roundUpToQuarter(minutes: number): number {
  if (!minutes || minutes < SLOT_STEP_MINUTES) {
    return SLOT_STEP_MINUTES;
  }
  const rounded = Math.ceil(minutes / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
  return Math.min(MAX_DURATION_MINUTES, Math.max(SLOT_STEP_MINUTES, rounded));
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }
  if (remainingMinutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${remainingMinutes} min`;
}

export function rangeFrom(
  blocks: AvailableSlot[],
  startAt: string,
  durationMinutes: number
): AvailableSlot[] {
  if (!blocks || blocks.length === 0 || durationMinutes <= 0) {
    return [];
  }

  const sorted = [...blocks].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const startIndex = sorted.findIndex((b) => b.startAt === startAt);
  if (startIndex === -1) {
    return [];
  }

  const range: AvailableSlot[] = [];
  let accumulatedMinutes = 0;

  for (let i = startIndex; i < sorted.length; i++) {
    const current = sorted[i];

    if (range.length > 0) {
      const prev = range[range.length - 1];
      if (prev.endAt !== current.startAt) {
        return [];
      }
    }

    range.push(current);
    const blockMinutes = Math.round(
      (new Date(current.endAt).getTime() - new Date(current.startAt).getTime()) / 60000
    );
    accumulatedMinutes += blockMinutes > 0 ? blockMinutes : SLOT_STEP_MINUTES;

    if (accumulatedMinutes >= durationMinutes) {
      return range;
    }
  }

  return [];
}

export function validStarts(
  blocks: AvailableSlot[],
  durationMinutes: number
): AvailableSlot[] {
  if (!blocks || blocks.length === 0 || durationMinutes <= 0) {
    return [];
  }

  const sorted = [...blocks].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const result: AvailableSlot[] = [];

  for (const block of sorted) {
    const range = rangeFrom(sorted, block.startAt, durationMinutes);
    if (range.length > 0) {
      result.push(block);
    }
  }

  return result;
}
