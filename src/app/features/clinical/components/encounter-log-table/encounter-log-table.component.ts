import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { Appointment } from '../../../appointments';
import { encounterLogStatus } from '../../domain/encounter-log';

@Component({
  selector: 'bd-encounter-log-table',
  standalone: true,
  imports: [DatePipe, ClinicTimePipe, RouterLink, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="encounter-log">
      <table class="encounter-log__table">
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Hora</th>
            <th scope="col">Paciente</th>
            <th scope="col">Especialidad</th>
            <th scope="col">Estado</th>
            <th scope="col"><span class="encounter-log__visually-hidden">Acción</span></th>
          </tr>
        </thead>
        <tbody>
          @for (appointment of appointments(); track appointment.id) {
            @let status = statusOf(appointment);
            <tr class="encounter-log__row">
              <td class="encounter-log__cell encounter-log__cell--date" data-label="Fecha">
                {{ appointment.startAt | date: 'dd/MM/yyyy' : '-0500' }}
              </td>
              <td class="encounter-log__cell encounter-log__cell--time" data-label="Hora">
                {{ appointment.startAt | clinicTime }}
              </td>
              <td class="encounter-log__cell encounter-log__cell--patient" data-label="Paciente">
                <a class="encounter-log__patient" [routerLink]="['/pacientes', appointment.patientId]">
                  {{ appointment.patientName }}
                </a>
              </td>
              <td class="encounter-log__cell encounter-log__cell--specialty" data-label="Especialidad">
                {{ appointment.specialtyName }}
              </td>
              <td class="encounter-log__cell encounter-log__cell--status" data-label="Estado">
                <bd-status-badge [tone]="status.tone" [label]="status.label" />
              </td>
              <td class="encounter-log__cell encounter-log__cell--action">
                <a
                  class="encounter-log__action"
                  [routerLink]="['/consultorio/atencion', appointment.encounterId]"
                  [attr.aria-label]="status.actionLabel + ' atención de ' + appointment.patientName"
                >
                  {{ status.actionLabel }}
                </a>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .encounter-log {
      min-width: 0;
      max-width: 100%;
      overflow-x: auto;
    }

    .encounter-log__table {
      width: 100%;
      border-collapse: collapse;
    }

    .encounter-log__table thead {
      display: none;
    }

    .encounter-log__table,
    .encounter-log__table tbody,
    .encounter-log__row,
    .encounter-log__cell {
      display: block;
    }

    .encounter-log__row {
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-areas:
        'date status'
        'time status'
        'patient patient'
        'specialty specialty'
        'action action';
      gap: var(--space-xs) var(--space-sm);
      align-items: center;
      padding: var(--space-md);
      margin-bottom: var(--space-sm);
      background-color: var(--white);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
    }

    .encounter-log__cell {
      font-size: var(--fs-sm);
      color: var(--slate-800);
      min-width: 0;
    }

    .encounter-log__cell--date { grid-area: date; font-weight: 600; color: var(--blue-950); }
    .encounter-log__cell--time { grid-area: time; color: var(--slate-600); }
    .encounter-log__cell--status { grid-area: status; justify-self: end; }
    .encounter-log__cell--patient { grid-area: patient; }
    .encounter-log__cell--specialty { grid-area: specialty; color: var(--slate-600); }
    .encounter-log__cell--action { grid-area: action; }

    .encounter-log__patient {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      font-weight: 600;
      color: var(--blue-800);
      text-decoration: none;
      overflow-wrap: anywhere;
    }

    .encounter-log__patient:hover {
      text-decoration: underline;
    }

    .encounter-log__action {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 var(--space-md);
      border-radius: var(--radius-sm);
      background-color: var(--blue-800);
      color: var(--white);
      font-size: var(--fs-sm);
      font-weight: 600;
      text-decoration: none;
    }

    .encounter-log__action:hover {
      background-color: var(--blue-700);
    }

    .encounter-log__action:focus-visible,
    .encounter-log__patient:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
    }

    .encounter-log__visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }

    @include bp.bp-up(sm) {
      .encounter-log__table thead {
        display: table-header-group;
      }

      .encounter-log__table {
        display: table;
      }

      .encounter-log__table tbody {
        display: table-row-group;
      }

      .encounter-log__row {
        display: table-row;
        background-color: transparent;
        border: none;
        border-bottom: 1px solid var(--slate-200);
        border-radius: 0;
        box-shadow: none;
        padding: 0;
        margin-bottom: 0;
      }

      .encounter-log__cell {
        display: table-cell;
        padding: var(--space-xs) var(--space-sm);
        vertical-align: middle;
        grid-area: auto;
        justify-self: auto;
      }

      .encounter-log__table th {
        text-align: left;
        font-size: var(--fs-sm);
        font-weight: 600;
        color: var(--slate-500);
        padding: var(--space-xs) var(--space-sm);
        border-bottom: 1px solid var(--slate-300);
      }
    }
  `,
})
export class EncounterLogTableComponent {
  readonly appointments = input.required<Appointment[]>();

  statusOf(appointment: Appointment) {
    return encounterLogStatus(appointment);
  }
}
