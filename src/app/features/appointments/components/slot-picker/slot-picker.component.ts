import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ClinicClock } from '../../../../core/services/clinic-clock.service';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import {
  DEFAULT_DURATION_MINUTES,
  formatDuration,
  NOON_MINUTES,
  rangeFrom,
  validStarts,
} from '../../domain/slot-ranges';
import { AvailableSlot } from '../../models/appointment.models';
import { DurationStepperComponent } from '../duration-stepper/duration-stepper.component';

interface ChipDisplayItem {
  slot: AvailableSlot;
  startAt: string;
  label: string;
  isValidStart: boolean;
  isStart: boolean;
  isInRange: boolean;
}

@Component({
  selector: 'bd-slot-picker',
  standalone: true,
  imports: [SkeletonComponent, DurationStepperComponent],
  templateUrl: './slot-picker.component.html',
  styleUrl: './slot-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlotPickerComponent {
  private readonly clinicClock = inject(ClinicClock);
  private readonly clinicTimePipe = new ClinicTimePipe();

  readonly blocks = input<AvailableSlot[]>([]);
  readonly durationMinutes = input<number>(DEFAULT_DURATION_MINUTES);
  readonly selectedStart = input<string | null>(null);
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly ready = input<boolean>(false);
  readonly ariaLabelledby = input<string | undefined>(undefined);
  /** Solo hoy (sin cita): sin «Ver día siguiente» y mensajes de vacío referidos a hoy. */
  readonly singleDay = input<boolean>(false);

  readonly startChange = output<string>();
  readonly durationChange = output<number>();
  readonly nextDay = output<void>();
  readonly retry = output<void>();

  readonly userSelectedJornada = signal<'morning' | 'afternoon' | null>(null);

  readonly allValidStarts = computed<AvailableSlot[]>(() => {
    return validStarts(this.blocks(), this.durationMinutes());
  });

  readonly morningStarts = computed<AvailableSlot[]>(() => {
    return this.allValidStarts().filter(
      (s) => this.clinicClock.minutesOfDay(s.startAt) < NOON_MINUTES
    );
  });

  readonly afternoonStarts = computed<AvailableSlot[]>(() => {
    return this.allValidStarts().filter(
      (s) => this.clinicClock.minutesOfDay(s.startAt) >= NOON_MINUTES
    );
  });

  readonly morningCount = computed<number>(() => this.morningStarts().length);
  readonly afternoonCount = computed<number>(() => this.afternoonStarts().length);

  readonly activeJornada = computed<'morning' | 'afternoon'>(() => {
    const sel = this.selectedStart();
    const morningN = this.morningCount();
    const afternoonN = this.afternoonCount();

    const userChoice = this.userSelectedJornada();
    if (userChoice === 'morning' && morningN > 0) return 'morning';
    if (userChoice === 'afternoon' && afternoonN > 0) return 'afternoon';

    if (sel) {
      const isMorning = this.clinicClock.minutesOfDay(sel) < NOON_MINUTES;
      if (isMorning && morningN > 0) return 'morning';
      if (!isMorning && afternoonN > 0) return 'afternoon';
    }

    if (morningN > 0) return 'morning';
    if (afternoonN > 0) return 'afternoon';
    return 'morning';
  });

  readonly selectedRange = computed<AvailableSlot[]>(() => {
    const start = this.selectedStart();
    if (!start) return [];
    return rangeFrom(this.blocks(), start, this.durationMinutes());
  });

  readonly summaryText = computed<string | null>(() => {
    const range = this.selectedRange();
    if (range.length === 0) return null;
    const start = this.clinicTimePipe.transform(range[0].startAt);
    const end = this.clinicTimePipe.transform(range[range.length - 1].endAt);
    const dur = formatDuration(this.durationMinutes());
    return `${start} – ${end} · ${dur}`;
  });

  readonly emptyDurationText = computed<string>(() => {
    return formatDuration(this.durationMinutes());
  });

  readonly currentJornadaChips = computed<ChipDisplayItem[]>(() => {
    const jornada = this.activeJornada();
    const isMorningJornada = jornada === 'morning';
    const starts = isMorningJornada ? this.morningStarts() : this.afternoonStarts();
    const startMap = new Map<string, AvailableSlot>();
    for (const s of starts) {
      startMap.set(s.startAt, s);
    }

    const selStart = this.selectedStart();
    const range = this.selectedRange();
    const rangeMap = new Map<string, AvailableSlot>();
    for (const r of range) {
      rangeMap.set(r.startAt, r);
    }

    const itemsMap = new Map<string, AvailableSlot>();
    for (const s of starts) {
      itemsMap.set(s.startAt, s);
    }

    if (selStart) {
      const selIsMorning = this.clinicClock.minutesOfDay(selStart) < NOON_MINUTES;
      if (selIsMorning === isMorningJornada) {
        for (const r of range) {
          if (!itemsMap.has(r.startAt)) {
            itemsMap.set(r.startAt, r);
          }
        }
      }
    }

    const sorted = Array.from(itemsMap.values()).sort((a, b) =>
      a.startAt.localeCompare(b.startAt)
    );

    return sorted.map((slot) => ({
      slot,
      startAt: slot.startAt,
      label: this.clinicTimePipe.transform(slot.startAt),
      isValidStart: startMap.has(slot.startAt),
      isStart: slot.startAt === selStart,
      isInRange: rangeMap.has(slot.startAt),
    }));
  });

  setJornada(jornada: 'morning' | 'afternoon'): void {
    this.userSelectedJornada.set(jornada);
  }

  onSelectSlot(startAt: string): void {
    this.startChange.emit(startAt);
  }
}
