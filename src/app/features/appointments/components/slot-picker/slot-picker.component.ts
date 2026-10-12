import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { ClinicClock } from '../../../../core/services/clinic-clock.service';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import { AvailableSlot } from '../../models/appointment.models';

interface SlotItem {
  slot: AvailableSlot;
  label: string;
}

@Component({
  selector: 'bd-slot-picker',
  standalone: true,
  imports: [SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="slot-picker">
      @if (!ready()) {
        <p class="slot-picker__prompt" role="status">
          Elige profesional, especialidad y fecha para ver las horas libres.
        </p>
      } @else if (loading()) {
        <div class="slot-picker__skeleton" aria-busy="true">
          <bd-skeleton height="44px" width="4.5rem" />
          <bd-skeleton height="44px" width="4.5rem" />
          <bd-skeleton height="44px" width="4.5rem" />
          <bd-skeleton height="44px" width="4.5rem" />
        </div>
      } @else if (error()) {
        <div class="slot-picker__error" role="alert">
          <p class="slot-picker__error-text">{{ error() }}</p>
          <button
            type="button"
            class="btn btn-outline slot-picker__retry-btn"
            (click)="retry.emit()"
          >
            Reintentar
          </button>
        </div>
      } @else if (slots().length === 0) {
        <div class="slot-picker__empty" role="status">
          <p class="slot-picker__empty-text">Sin horas libres este día.</p>
          <button
            type="button"
            class="btn btn-outline slot-picker__next-day-btn"
            (click)="nextDay.emit()"
          >
            Ver día siguiente
          </button>
        </div>
      } @else {
        <div
          class="slot-picker__groups"
          role="radiogroup"
          [attr.aria-labelledby]="ariaLabelledby()"
          [attr.aria-label]="!ariaLabelledby() ? 'Hora de la cita' : null"
        >
          @if (morningSlots().length > 0) {
            <div class="slot-picker__group">
              <span class="slot-picker__group-title">Mañana</span>
              <div class="slot-picker__chips">
                @for (item of morningSlots(); track item.slot.startAt) {
                  <div class="slot-chip-wrapper">
                    <input
                      type="radio"
                      class="slot-chip__input"
                      [id]="'slot-' + item.slot.startAt"
                      name="availableSlot"
                      [value]="item.slot.startAt"
                      [checked]="selectedSlot()?.startAt === item.slot.startAt"
                      (change)="slotChange.emit(item.slot)"
                    />
                    <label
                      [for]="'slot-' + item.slot.startAt"
                      class="slot-chip__label"
                    >
                      {{ item.label }}
                    </label>
                  </div>
                }
              </div>
            </div>
          }

          @if (afternoonSlots().length > 0) {
            <div class="slot-picker__group">
              <span class="slot-picker__group-title">Tarde</span>
              <div class="slot-picker__chips">
                @for (item of afternoonSlots(); track item.slot.startAt) {
                  <div class="slot-chip-wrapper">
                    <input
                      type="radio"
                      class="slot-chip__input"
                      [id]="'slot-' + item.slot.startAt"
                      name="availableSlot"
                      [value]="item.slot.startAt"
                      [checked]="selectedSlot()?.startAt === item.slot.startAt"
                      (change)="slotChange.emit(item.slot)"
                    />
                    <label
                      [for]="'slot-' + item.slot.startAt"
                      class="slot-chip__label"
                    >
                      {{ item.label }}
                    </label>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .slot-picker {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .slot-picker__prompt {
      font-size: var(--fs-sm);
      color: var(--slate-500);
      margin: 0;
      padding: var(--space-xs) 0;
    }

    .slot-picker__skeleton {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .slot-picker__error {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-xs);
      padding: var(--space-xs) 0;
    }

    .slot-picker__error-text {
      font-size: var(--fs-sm);
      color: var(--coral-700);
      margin: 0;
    }

    .slot-picker__empty {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-xs);
      padding: var(--space-xs) 0;
    }

    .slot-picker__empty-text {
      font-size: var(--fs-sm);
      color: var(--slate-600);
      margin: 0;
    }

    .slot-picker__retry-btn,
    .slot-picker__next-day-btn {
      min-height: 44px;
    }

    .slot-picker__groups {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .slot-picker__group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .slot-picker__group-title {
      font-size: var(--fs-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--slate-500);
    }

    .slot-picker__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .slot-chip-wrapper {
      position: relative;
    }

    .slot-chip__input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      margin: 0;
      pointer-events: none;
    }

    .slot-chip__label {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      min-width: 4.25rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--slate-300);
      border-radius: var(--radius-sm);
      background-color: var(--white);
      color: var(--slate-800);
      font-size: var(--fs-sm);
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      transition: all var(--transition-fast);
      box-sizing: border-box;

      &:hover {
        background-color: var(--slate-100);
        border-color: var(--slate-500);
      }
    }

    .slot-chip__input:focus-visible + .slot-chip__label {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
    }

    .slot-chip__input:checked + .slot-chip__label {
      background-color: var(--blue-900);
      color: var(--white);
      border-color: var(--blue-900);
      box-shadow: var(--shadow-sm);
    }
  `,
})
export class SlotPickerComponent {
  private readonly clinicClock = inject(ClinicClock);
  private readonly clinicTimePipe = new ClinicTimePipe();

  readonly slots = input<AvailableSlot[]>([]);
  readonly selectedSlot = input<AvailableSlot | null>(null);
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly ready = input<boolean>(false);
  readonly ariaLabelledby = input<string | undefined>(undefined);

  readonly slotChange = output<AvailableSlot>();
  readonly nextDay = output<void>();
  readonly retry = output<void>();

  readonly morningSlots = computed<SlotItem[]>(() => {
    return this.slots()
      .filter((s) => this.clinicClock.minutesOfDay(s.startAt) < 720)
      .map((slot) => ({
        slot,
        label: this.clinicTimePipe.transform(slot.startAt),
      }));
  });

  readonly afternoonSlots = computed<SlotItem[]>(() => {
    return this.slots()
      .filter((s) => this.clinicClock.minutesOfDay(s.startAt) >= 720)
      .map((slot) => ({
        slot,
        label: this.clinicTimePipe.transform(slot.startAt),
      }));
  });
}
