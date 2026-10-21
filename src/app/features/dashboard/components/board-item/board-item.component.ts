import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { SessionStore } from '../../../../core/auth/session.store';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import { appointmentDisplayState } from '../../../appointments';
import { Appointment } from '../../../appointments/models/appointment.models';
import { BoardColumnKey } from '../../domain/board-columns';

@Component({
  selector: 'bd-board-item, li[bd-board-item]',
  standalone: true,
  imports: [ClinicTimePipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'board-item',
    role: 'listitem',
  },
  template: `
    <div class="board-item__card">
      <div class="board-item__header">
        <span class="board-item__time">{{ appointment().startAt | clinicTime }}</span>
        <bd-status-badge
          [tone]="badgeState().tone"
          [label]="badgeState().label"
          [showCheck]="badgeState().showCheck"
        />
      </div>

      <div class="board-item__body">
        <h3 class="board-item__patient">{{ appointment().patientName }}</h3>
        <p class="board-item__specialty">{{ appointment().specialtyName }}</p>
        @if (appointment().reason) {
          <p class="board-item__reason" [title]="appointment().reason!">
            {{ appointment().reason }}
          </p>
        }
      </div>

      @if (showAction()) {
        <div class="board-item__actions">
          <button
            type="button"
            class="btn btn-primary board-item__btn"
            [attr.aria-label]="actionAriaLabel()"
            (click)="onActionClick()"
          >
            {{ actionLabel() }}
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    :host {
      display: block;
      list-style: none;
    }

    .board-item__card {
      background-color: var(--white);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
      padding: var(--space-md);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      transition: box-shadow var(--transition-fast), border-color var(--transition-fast);

      &:hover {
        border-color: var(--slate-300);
        box-shadow: var(--shadow-md);
      }
    }

    .board-item__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-xs);
    }

    .board-item__time {
      font-size: var(--fs-sm);
      font-weight: 700;
      color: var(--blue-950);
      font-variant-numeric: tabular-nums;
    }

    .board-item__body {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .board-item__patient {
      font-size: var(--fs-md);
      font-weight: 600;
      color: var(--blue-950);
      margin: 0;
      line-height: var(--lh-tight);
    }

    .board-item__specialty {
      font-size: var(--fs-xs);
      color: var(--slate-600);
      margin: 0;
    }

    .board-item__reason {
      font-size: var(--fs-xs);
      color: var(--slate-500);
      margin: var(--space-2xs) 0 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .board-item__actions {
      display: flex;
      margin-top: var(--space-xs);
    }

    .board-item__btn {
      height: 48px;
      min-height: 48px;
      width: 100%;
      padding: 0 var(--space-md);
      font-size: var(--fs-sm);
      font-weight: 600;
      justify-content: center;

      @include bp.bp-up(sm) {
        width: 100%;
      }
    }
  `,
})
export class BoardItemComponent {
  private readonly sessionStore = inject(SessionStore);

  readonly appointment = input.required<Appointment>();
  readonly column = input.required<BoardColumnKey>();

  readonly attend = output<Appointment>();
  readonly navigateEncounter = output<string>();

  readonly badgeState = computed(() => {
    const appt = this.appointment();
    if (appt.encounterVoided) {
      return {
        tone: 'cancelled' as const,
        label: 'Atención anulada',
        showCheck: false,
      };
    }
    const state = appointmentDisplayState(appt);
    return {
      tone: state.tone,
      label: state.label,
      showCheck: state.isConfirmed ?? false,
    };
  });

  private readonly canAttend = computed(() => {
    const appt = this.appointment();
    const hasRecordCreate = this.sessionStore.hasPermission('RECORD_CREATE');
    if (!hasRecordCreate) return false;

    if (!appt.checkedInAt) {
      return this.sessionStore.hasPermission('APPOINTMENT_UPDATE');
    }
    return true;
  });

  readonly showAction = computed(() => {
    const col = this.column();
    const appt = this.appointment();

    if (col === 'scheduled' || col === 'waiting') {
      return this.canAttend();
    }
    if (col === 'in-progress') {
      return !!appt.encounterId;
    }
    if (col === 'attended') {
      return !!appt.encounterId;
    }
    return false;
  });

  readonly actionLabel = computed(() => {
    const col = this.column();
    if (col === 'scheduled' || col === 'waiting') {
      return 'Atender';
    }
    if (col === 'in-progress') {
      return 'Continuar';
    }
    if (col === 'attended') {
      return 'Ver';
    }
    return '';
  });

  readonly actionAriaLabel = computed(() => {
    const patient = this.appointment().patientName;
    const col = this.column();
    if (col === 'scheduled' || col === 'waiting') {
      return `Atender a ${patient}`;
    }
    if (col === 'in-progress') {
      return `Continuar atención de ${patient}`;
    }
    if (col === 'attended') {
      return `Ver atención de ${patient}`;
    }
    return '';
  });

  onActionClick(): void {
    const col = this.column();
    const appt = this.appointment();

    if (col === 'scheduled' || col === 'waiting') {
      this.attend.emit(appt);
    } else if (appt.encounterId) {
      this.navigateEncounter.emit(appt.encounterId);
    }
  }
}
