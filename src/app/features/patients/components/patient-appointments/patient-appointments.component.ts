import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import {
  Appointment,
  AppointmentStatus,
  appointmentDisplayState,
  AppointmentDisplayState,
} from '../../../appointments';

const OPEN_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED'];
const PREVIOUS_PREVIEW_SIZE = 10;

@Component({
  selector: 'bd-patient-appointments',
  standalone: true,
  imports: [StatusBadgeComponent, ClinicDatePipe, ClinicTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="patient-appointments">
      @if (nextAppointment(); as next) {
        <article class="patient-appointments__next" aria-labelledby="patient-next-title">
          <h3 id="patient-next-title" class="patient-appointments__label">Próxima cita</h3>
          <p class="patient-appointments__when">
            {{ next.startAt | clinicDate }} · {{ next.startAt | clinicTime }}
          </p>
          <p class="patient-appointments__meta">
            {{ next.professionalName }} · {{ next.specialtyName }}
          </p>
          <div class="patient-appointments__next-footer">
            <bd-status-badge [tone]="stateOf(next).tone" [label]="stateOf(next).label" />
            @if (next.reason) {
              <span class="patient-appointments__reason">{{ next.reason }}</span>
            }
          </div>
          @if (showRescheduleNext() || canCancel()) {
            <div class="patient-appointments__actions">
              @if (showRescheduleNext()) {
                <button
                  type="button"
                  class="btn btn-outline patient-appointments__btn"
                  (click)="reschedule.emit(next)"
                >
                  Reprogramar
                </button>
              }
              @if (canCancel()) {
                <button
                  type="button"
                  class="btn btn-ghost patient-appointments__btn patient-appointments__btn--danger"
                  (click)="cancel.emit(next)"
                >
                  Cancelar cita
                </button>
              }
            </div>
          }
        </article>
      } @else {
        <p class="patient-appointments__empty">Sin citas próximas</p>
      }

      @if (laterUpcoming().length > 0) {
        <h3 class="patient-appointments__label">Más citas programadas</h3>
        <ul class="patient-appointments__list">
          @for (appt of laterUpcoming(); track appt.id) {
            <li class="patient-appointments__row">
              <span class="patient-appointments__row-when">
                {{ appt.startAt | clinicDate }} · {{ appt.startAt | clinicTime }}
              </span>
              <span class="patient-appointments__row-meta">{{ appt.professionalName }}</span>
              <bd-status-badge [tone]="stateOf(appt).tone" [label]="stateOf(appt).label" />
            </li>
          }
        </ul>
      }

      <h3 class="patient-appointments__label">Citas anteriores</h3>
      @if (previous().length === 0) {
        <p class="patient-appointments__empty">Sin citas anteriores</p>
      } @else {
        <table class="table-cards" aria-label="Citas anteriores del paciente">
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Profesional</th>
              <th scope="col">Especialidad</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (appt of visiblePrevious(); track appt.id) {
              <tr>
                <td data-label="Fecha">
                  {{ appt.startAt | clinicDate }} · {{ appt.startAt | clinicTime }}
                </td>
                <td data-label="Profesional">{{ appt.professionalName }}</td>
                <td data-label="Especialidad">{{ appt.specialtyName }}</td>
                <td data-label="Estado">
                  <bd-status-badge [tone]="stateOf(appt).tone" [label]="stateOf(appt).label" />
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (previous().length > previewSize && !showAllPrevious()) {
          <button
            type="button"
            class="btn btn-ghost patient-appointments__show-all"
            (click)="showAllPrevious.set(true)"
          >
            Ver todas ({{ previous().length }})
          </button>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      container-type: inline-size;
    }

    .patient-appointments {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-lg);
      box-sizing: border-box;
    }

    .patient-appointments__label {
      margin: 0;
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--color-text-muted);
    }

    .patient-appointments__empty {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .patient-appointments__next {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      background-color: var(--blue-50);
      border: 1px solid var(--blue-200);
      border-left: 4px solid var(--appointment-scheduled-bar);
      border-radius: var(--radius-sm);
      padding: var(--space-md);
    }

    .patient-appointments__when {
      margin: 0;
      font-size: var(--fs-md);
      font-weight: 700;
      color: var(--blue-950);
    }

    .patient-appointments__meta {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text);
    }

    .patient-appointments__next-footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-sm);
    }

    .patient-appointments__reason {
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .patient-appointments__actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      margin-top: var(--space-xs);
    }

    .patient-appointments__btn {
      width: 100%;
      min-height: 2.75rem;
      font-size: var(--fs-sm);
    }

    .patient-appointments__btn--danger {
      color: var(--color-danger);
    }

    .patient-appointments__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .patient-appointments__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-sm);
      font-size: var(--fs-sm);
    }

    .patient-appointments__row-when {
      font-weight: 600;
      color: var(--color-text);
    }

    .patient-appointments__row-meta {
      color: var(--color-text-muted);
    }

    .table-cards {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--fs-sm);
    }

    .table-cards th,
    .table-cards td {
      text-align: start;
      padding: var(--space-sm);
      border-bottom: 1px solid var(--color-border);
      vertical-align: middle;
    }

    .table-cards th {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--color-text-muted);
    }

    .patient-appointments__show-all {
      align-self: flex-start;
      min-height: 2.75rem;
      font-size: var(--fs-sm);
    }

    /* Menos de 600 px del contenedor: cada fila de la tabla es una tarjeta */
    @container (max-width: 37.49rem) {
      .table-cards thead {
        display: none;
      }

      .table-cards,
      .table-cards tbody,
      .table-cards tr,
      .table-cards td {
        display: block;
        width: 100%;
      }

      .table-cards tr {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: var(--space-xs) var(--space-sm);
        margin-bottom: var(--space-sm);
      }

      .table-cards td {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-sm);
        border-bottom: none;
        padding: var(--space-xs) 0;
      }

      .table-cards td::before {
        content: attr(data-label);
        font-size: var(--fs-xs);
        font-weight: 600;
        color: var(--color-text-muted);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .patient-appointments__btn {
        transition: none;
      }
    }
  `,
})
export class PatientAppointmentsComponent {
  readonly appointments = input.required<Appointment[]>();
  readonly now = input.required<Date>();
  readonly canReschedule = input<boolean>(false);
  readonly canCancel = input<boolean>(false);
  readonly reschedule = output<Appointment>();
  readonly cancel = output<Appointment>();

  readonly previewSize = PREVIOUS_PREVIEW_SIZE;
  readonly showAllPrevious = signal<boolean>(false);

  private readonly upcoming = computed(() => {
    const nowMs = this.now().getTime();
    return this.appointments()
      .filter((appt) => OPEN_STATUSES.includes(appt.status) && startMs(appt) >= nowMs)
      .sort((a, b) => startMs(a) - startMs(b));
  });

  readonly nextAppointment = computed<Appointment | null>(() => this.upcoming()[0] ?? null);

  readonly laterUpcoming = computed<Appointment[]>(() => this.upcoming().slice(1));

  readonly previous = computed<Appointment[]>(() => {
    const upcomingIds = new Set(this.upcoming().map((appt) => appt.id));
    return this.appointments()
      .filter((appt) => !upcomingIds.has(appt.id))
      .sort((a, b) => startMs(b) - startMs(a));
  });

  readonly visiblePrevious = computed<Appointment[]>(() =>
    this.showAllPrevious() ? this.previous() : this.previous().slice(0, PREVIOUS_PREVIEW_SIZE)
  );

  readonly showRescheduleNext = computed(() => {
    const next = this.nextAppointment();
    return this.canReschedule() && !!next && !next.checkedInAt;
  });

  stateOf(appt: Appointment): AppointmentDisplayState {
    return appointmentDisplayState(appt);
  }
}

function startMs(appt: Appointment): number {
  return new Date(appt.startAt).getTime();
}
