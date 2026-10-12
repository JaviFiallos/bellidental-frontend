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
import {
  SegmentedComponent,
  SegmentedOption,
} from '../../../../shared/components/segmented/segmented.component';
import { Professional } from '../../../professionals';
import { Appointment } from '../../models/appointment.models';
import { AppointmentCardComponent } from '../appointment-card/appointment-card.component';

@Component({
  selector: 'bd-agenda-day-list',
  standalone: true,
  imports: [AppointmentCardComponent, SegmentedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="agenda-day-list">
      <!-- Selector de profesional -->
      <div class="agenda-day-list__prof-selector">
        @if (professionals().length <= 4) {
          <bd-segmented
            [options]="segmentedOptions()"
            [value]="effectiveSelectedProfId()"
            label="Seleccionar profesional"
            (valueChange)="selectedProfId.set($event)"
          />
        } @else {
          <div class="agenda-day-list__select-wrapper">
            <label for="prof-select" class="agenda-day-list__select-label">Profesional:</label>
            <select
              id="prof-select"
              class="agenda-day-list__select"
              [value]="effectiveSelectedProfId()"
              (change)="onSelectChange($event)"
            >
              @for (prof of professionals(); track prof.id) {
                <option [value]="prof.id">{{ prof.fullName }}</option>
              }
            </select>
          </div>
        }
      </div>

      <!-- Lista ordenada por hora -->
      <div class="agenda-day-list__cards">
        @for (appt of sortedAppointments(); track appt.id) {
          <bd-appointment-card
            [appointment]="appt"
            [showProfessional]="false"
            [selected]="selectedId() === appt.id"
            [checkInAvailable]="quickCheckInIds().has(appt.id)"
            [checkInPending]="pendingCheckInId() === appt.id"
            (opened)="opened.emit($event)"
            (checkIn)="checkIn.emit($event)"
          />
        } @empty {
          <div class="agenda-day-list__empty">
            Sin citas para este profesional en este día
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .agenda-day-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .agenda-day-list__prof-selector {
      display: flex;
      overflow-x: auto;
      padding-bottom: var(--space-xs);
    }

    .agenda-day-list__select-wrapper {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      width: 100%;
    }

    .agenda-day-list__select-label {
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--blue-950);
    }

    .agenda-day-list__select {
      flex: 1;
      height: 42px;
      padding: 0 0.75rem;
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-sm);
      background-color: var(--white);
      color: var(--blue-950);
      font-size: var(--fs-sm);
      font-weight: 500;
    }

    .agenda-day-list__select:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 1px;
    }

    .agenda-day-list__cards {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .agenda-day-list__empty {
      text-align: center;
      padding: var(--space-xl) var(--space-md);
      background-color: var(--white);
      border: 1px dashed var(--slate-300);
      border-radius: var(--radius-md);
      color: var(--slate-500);
      font-size: var(--fs-sm);
    }
  `,
})
export class AgendaDayListComponent {
  private readonly clinicClock = inject(ClinicClock);

  readonly professionals = input.required<Professional[]>();
  readonly appointmentsByProf = input.required<Record<string, Appointment[]>>();
  readonly selectedId = input<string | null>(null);
  readonly quickCheckInIds = input<Set<string>>(new Set());
  readonly pendingCheckInId = input<string | null>(null);

  readonly opened = output<Appointment>();
  readonly checkIn = output<Appointment>();

  readonly selectedProfId = signal<string>('');

  readonly effectiveSelectedProfId = computed(() => {
    const profs = this.professionals();
    if (profs.length === 0) return '';
    const current = this.selectedProfId();
    if (current && profs.some((p) => p.id === current)) {
      return current;
    }
    return profs[0].id;
  });

  readonly segmentedOptions = computed<SegmentedOption<string>[]>(() => {
    return this.professionals().map((p) => ({
      value: p.id,
      label: p.fullName,
    }));
  });

  readonly sortedAppointments = computed(() => {
    const profId = this.effectiveSelectedProfId();
    if (!profId) return [];
    const list = this.appointmentsByProf()[profId] || [];
    return [...list].sort(
      (a, b) =>
        this.clinicClock.minutesOfDay(a.startAt) - this.clinicClock.minutesOfDay(b.startAt)
    );
  });

  onSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedProfId.set(target.value);
  }
}
