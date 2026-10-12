import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  SegmentedComponent,
  SegmentedOption,
} from '../../../../shared/components/segmented/segmented.component';
import { Appointment } from '../../models/appointment.models';
import { AppointmentCardComponent } from '../appointment-card/appointment-card.component';

interface StatusColumnDef {
  key: string;
  label: string;
  tone: string;
}

@Component({
  selector: 'bd-agenda-by-status',
  standalone: true,
  imports: [AppointmentCardComponent, SegmentedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="agenda-by-status">
      <!-- Selector para pantallas pequeñas (< md) -->
      <div class="agenda-by-status__mobile-nav">
        <bd-segmented
          [options]="mobileTabs()"
          [value]="activeMobileTab()"
          label="Pestañas de estado"
          (valueChange)="activeMobileTab.set($event)"
        />
      </div>

      <!-- Vista de escritorio (columnas) -->
      <div class="agenda-by-status__desktop-columns">
        @for (col of activeColumns(); track col.key) {
          <div class="agenda-by-status__column">
            <div class="agenda-by-status__col-header">
              <span class="agenda-by-status__col-title">{{ col.label }}</span>
              <span class="agenda-by-status__col-count">
                {{ getAppointmentsFor(col.key).length }}
              </span>
            </div>

            <div class="agenda-by-status__col-body">
              @for (appt of getAppointmentsFor(col.key); track appt.id) {
                <bd-appointment-card
                  [appointment]="appt"
                  [showProfessional]="true"
                  [selected]="selectedId() === appt.id"
                  [checkInAvailable]="quickCheckInIds().has(appt.id)"
                  [checkInPending]="pendingCheckInId() === appt.id"
                  (opened)="opened.emit($event)"
                  (checkIn)="checkIn.emit($event)"
                />
              } @empty {
                <div class="agenda-by-status__empty-col">
                  Sin citas
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Vista móvil (< md) para la pestaña seleccionada -->
      <div class="agenda-by-status__mobile-body">
        @for (appt of getAppointmentsFor(activeMobileTab()); track appt.id) {
          <bd-appointment-card
            [appointment]="appt"
            [showProfessional]="true"
            [selected]="selectedId() === appt.id"
            [checkInAvailable]="quickCheckInIds().has(appt.id)"
            [checkInPending]="pendingCheckInId() === appt.id"
            (opened)="opened.emit($event)"
            (checkIn)="checkIn.emit($event)"
          />
        } @empty {
          <div class="agenda-by-status__empty-col">
            Sin citas en este estado
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .agenda-by-status {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .agenda-by-status__mobile-nav {
      display: none;
      overflow-x: auto;
      padding-bottom: var(--space-xs);
    }

    .agenda-by-status__desktop-columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
      gap: var(--space-md);
      align-items: start;
    }

    .agenda-by-status__mobile-body {
      display: none;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .agenda-by-status__column {
      display: flex;
      flex-direction: column;
      background-color: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
      padding: var(--space-sm);
      min-height: 250px;
    }

    .agenda-by-status__col-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.2rem 0.4rem var(--space-sm);
      border-bottom: 2px solid var(--slate-200);
      margin-bottom: var(--space-sm);
    }

    .agenda-by-status__col-title {
      font-size: var(--fs-sm);
      font-weight: 700;
      color: var(--blue-950);
    }

    .agenda-by-status__col-count {
      font-size: var(--fs-xs);
      font-weight: 700;
      background-color: var(--slate-200);
      color: var(--slate-700);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
    }

    .agenda-by-status__col-body {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .agenda-by-status__empty-col {
      text-align: center;
      padding: var(--space-lg) var(--space-sm);
      font-size: var(--fs-xs);
      color: var(--slate-400);
      font-style: italic;
    }

    @include bp.bp-down('md') {
      .agenda-by-status__mobile-nav {
        display: flex;
      }
      .agenda-by-status__desktop-columns {
        display: none;
      }
      .agenda-by-status__mobile-body {
        display: flex;
      }
    }
  `,
})
export class AgendaByStatusComponent {
  readonly appointmentsByStatus = input.required<Record<string, Appointment[]>>();
  readonly showCancelled = input.required<boolean>();
  readonly selectedId = input<string | null>(null);
  readonly quickCheckInIds = input<Set<string>>(new Set());
  readonly pendingCheckInId = input<string | null>(null);

  readonly opened = output<Appointment>();
  readonly checkIn = output<Appointment>();

  readonly activeMobileTab = signal<string>('scheduled');

  readonly baseColumns: StatusColumnDef[] = [
    { key: 'scheduled', label: 'Agendadas', tone: 'scheduled' },
    { key: 'waiting', label: 'En espera', tone: 'waiting' },
    { key: 'attended', label: 'Atendidas', tone: 'attended' },
    { key: 'no-show', label: 'No asistió', tone: 'no-show' },
  ];

  readonly activeColumns = computed<StatusColumnDef[]>(() => {
    if (this.showCancelled()) {
      return [
        ...this.baseColumns,
        { key: 'cancelled', label: 'Canceladas', tone: 'cancelled' },
      ];
    }
    return this.baseColumns;
  });

  readonly mobileTabs = computed<SegmentedOption<string>[]>(() => {
    const map = this.appointmentsByStatus();
    return this.activeColumns().map((col) => {
      const count = map[col.key]?.length || 0;
      return {
        value: col.key,
        label: `${col.label} (${count})`,
      };
    });
  });

  getAppointmentsFor(statusKey: string): Appointment[] {
    return this.appointmentsByStatus()[statusKey] || [];
  }
}
