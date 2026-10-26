import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CalendarSync,
  CalendarX,
  Check,
  CheckCheck,
  ExternalLink,
  UserX,
  Wallet,
} from 'lucide-angular';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { IconComponent, LucideIconData } from '../../../../shared/components/icon/icon.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import {
  appointmentDisplayState,
  AppointmentActionType,
} from '../../domain/appointment-state';
import { Appointment } from '../../models/appointment.models';

@Component({
  selector: 'bd-appointment-panel',
  standalone: true,
  imports: [
    RouterLink,
    AlertComponent,
    StatusBadgeComponent,
    IconComponent,
    ClinicDatePipe,
    ClinicTimePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="appointment-panel">
      <!-- Encabezado con datos del paciente -->
      <div class="appointment-panel__header">
        <div class="appointment-panel__title-row">
          <h2
            #panelTitle
            id="appointment-panel-title"
            class="appointment-panel__patient-name"
            tabindex="-1"
          >
            {{ appointment().patientName }}
          </h2>
          <a
            [routerLink]="['/pacientes', appointment().patientId]"
            class="appointment-panel__patient-link"
            title="Ver ficha del paciente"
          >
            <span>Ver ficha</span>
            <bd-icon [name]="externalLinkIcon" [size]="14" aria-hidden="true" />
          </a>
        </div>

        <div class="appointment-panel__badge-row">
          <bd-status-badge
            [tone]="displayState().tone"
            [label]="displayState().label"
            [showCheck]="displayState().isConfirmed ?? false"
          />
          @if (appointment().checkedInAt) {
            <span class="appointment-panel__checkin-tag">
              Llegó a las {{ appointment().checkedInAt | clinicTime }}
            </span>
          }
        </div>
      </div>

      <!-- Alerta de error si ocurrió alguno en la acción -->
      @if (error()) {
        <div class="appointment-panel__error-container">
          <bd-alert variant="error" [message]="error()!" />
        </div>
      }

      <!-- Cuerpo / Información de la cita -->
      <div class="appointment-panel__body">
        <!-- Fecha y hora -->
        <div class="appointment-panel__info-group">
          <span class="appointment-panel__label">Fecha y horario</span>
          <span class="appointment-panel__value appointment-panel__value--highlight">
            {{ appointment().startAt | clinicDate }} · {{ appointment().startAt | clinicTime }}–{{ appointment().endAt | clinicTime }}
          </span>
        </div>

        <!-- Profesional y especialidad -->
        <div class="appointment-panel__info-group">
          <span class="appointment-panel__label">Profesional</span>
          <div class="appointment-panel__pro-row">
            <span
              class="appointment-panel__pro-dot"
              [style.background-color]="appointment().colorTag || 'var(--slate-500)'"
              aria-hidden="true"
            ></span>
            <span class="appointment-panel__value">
              {{ appointment().professionalName }}
            </span>
          </div>
          <span class="appointment-panel__subvalue">
            {{ appointment().specialtyName }}
          </span>
        </div>

        <!-- Motivo de consulta -->
        @if (appointment().reason) {
          <div class="appointment-panel__info-group">
            <span class="appointment-panel__label">Motivo de consulta</span>
            <span class="appointment-panel__value">{{ appointment().reason }}</span>
          </div>
        }

        <!-- Origen de la cita -->
        <div class="appointment-panel__info-group">
          <span class="appointment-panel__label">Origen de la cita</span>
          <span class="appointment-panel__value">{{ sourceLabel() }}</span>
        </div>

        <!-- Notas internas -->
        @if (appointment().notes) {
          <div class="appointment-panel__info-group">
            <span class="appointment-panel__label">Notas internas</span>
            <p class="appointment-panel__notes">{{ appointment().notes }}</p>
          </div>
        }
      </div>

      <!-- Pie con acciones disponibles -->
      @if (actions().length > 0) {
        <div class="appointment-panel__footer">
          <div class="appointment-panel__primary-actions">
            @for (act of primaryAndSecondaryActions(); track act; let isFirst = $first) {
              <button
                type="button"
                class="btn appointment-panel__action-btn"
                [class.btn-primary]="isFirst && act !== 'reschedule'"
                [class.btn-outline]="!isFirst || act === 'reschedule'"
                [disabled]="isAnyActionPending()"
                (click)="onActionClick(act)"
              >
                @if (pendingAction() === act) {
                  <span class="btn-spinner" aria-hidden="true"></span>
                } @else {
                  <bd-icon [name]="actionIcon(act)" [size]="16" aria-hidden="true" />
                }
                <span>{{ actionLabel(act) }}</span>
              </button>
            }
          </div>

          @if (hasCancelAction()) {
            <div class="appointment-panel__danger-action">
              <button
                type="button"
                class="btn btn-ghost appointment-panel__btn-cancel"
                [disabled]="isAnyActionPending()"
                (click)="onActionClick('cancel')"
              >
                @if (pendingAction() === 'cancel') {
                  <span class="btn-spinner" aria-hidden="true"></span>
                } @else {
                  <bd-icon [name]="calendarXIcon" [size]="16" aria-hidden="true" />
                }
                <span>Cancelar cita</span>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .appointment-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: var(--white);
      color: var(--color-text);
      box-sizing: border-box;
    }

    .appointment-panel__header {
      padding: var(--space-xl) var(--space-xl) var(--space-lg) var(--space-xl);
      border-bottom: 1px solid var(--slate-100);
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .appointment-panel__title-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-md);
      padding-right: 2.5rem; /* Espacio para el botón cerrar de la hoja */
    }

    .appointment-panel__patient-name {
      margin: 0;
      font-size: var(--fs-xl);
      font-weight: 700;
      color: var(--blue-950);
      line-height: 1.2;

      &:focus {
        outline: none;
      }
    }

    .appointment-panel__patient-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--color-primary);
      text-decoration: none;
      white-space: nowrap;
      min-height: 44px;
      padding: 0 0.5rem;

      &:hover {
        text-decoration: underline;
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
      }
    }

    .appointment-panel__badge-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .appointment-panel__checkin-tag {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--blue-800);
      background-color: var(--blue-50);
      border: 1px solid var(--blue-200);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
    }

    .appointment-panel__error-container {
      padding: var(--space-md) var(--space-xl) 0 var(--space-xl);
    }

    .appointment-panel__body {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-lg) var(--space-xl);
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
    }

    .appointment-panel__info-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .appointment-panel__label {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .appointment-panel__value {
      font-size: var(--fs-md);
      font-weight: 600;
      color: var(--blue-950);
    }

    .appointment-panel__value--highlight {
      color: var(--blue-900);
    }

    .appointment-panel__subvalue {
      font-size: var(--fs-sm);
      color: var(--slate-600);
    }

    .appointment-panel__pro-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .appointment-panel__pro-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .appointment-panel__notes {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--slate-600);
      line-height: 1.5;
      background-color: var(--slate-50);
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-sm);
      border: 1px solid var(--slate-200);
    }

    .appointment-panel__footer {
      position: sticky;
      bottom: 0;
      background-color: var(--white);
      border-top: 1px solid var(--slate-200);
      padding: var(--space-md) var(--space-xl);
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      box-shadow: 0 -4px 12px color-mix(in srgb, var(--blue-950) 5%, transparent);
      z-index: 5;
    }

    .appointment-panel__primary-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .appointment-panel__action-btn {
      flex: 1;
      min-width: 8rem;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      font-size: var(--fs-sm);
      font-weight: 600;
      padding: 0.5rem 1rem;
    }

    .appointment-panel__danger-action {
      display: flex;
      justify-content: center;
      border-top: 1px solid var(--slate-100);
      padding-top: var(--space-xs);
    }

    .appointment-panel__btn-cancel {
      color: var(--color-danger);
      min-height: 44px;
      font-size: var(--fs-xs);
      font-weight: 600;
      padding: 0.4rem 0.8rem;
      width: 100%;

      &:hover:not(:disabled) {
        background-color: color-mix(in srgb, var(--color-danger) 10%, transparent);
        color: var(--color-danger);
      }
    }

    .btn-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @include bp.bp-down('sm') {
      .appointment-panel__action-btn {
        width: 100%;
        flex: auto;
      }
    }
  `,
})
export class AppointmentPanelComponent {
  readonly appointment = input.required<Appointment>();
  readonly actions = input<AppointmentActionType[]>([]);
  readonly pendingAction = input<AppointmentActionType | null>(null);
  readonly error = input<string | null>(null);

  readonly action = output<AppointmentActionType>();
  readonly close = output<void>();

  readonly panelTitle = viewChild<ElementRef<HTMLHeadingElement>>('panelTitle');

  // Solo al abrir o cambiar de cita: el refresco de 60 s trae objetos nuevos y no debe robar el foco.
  private readonly appointmentId = computed(() => this.appointment().id);

  constructor() {
    effect(() => {
      this.appointmentId();
      setTimeout(() => {
        this.panelTitle()?.nativeElement?.focus();
      }, 0);
    });
  }

  readonly externalLinkIcon: LucideIconData = ExternalLink;
  readonly calendarXIcon: LucideIconData = CalendarX;
  readonly calendarSyncIcon: LucideIconData = CalendarSync;
  readonly checkIcon: LucideIconData = Check;
  readonly checkCheckIcon: LucideIconData = CheckCheck;
  readonly userXIcon: LucideIconData = UserX;
  readonly walletIcon: LucideIconData = Wallet;

  readonly displayState = computed(() => appointmentDisplayState(this.appointment()));

  readonly primaryAndSecondaryActions = computed(() => {
    return this.actions().filter((a) => a !== 'cancel');
  });

  readonly hasCancelAction = computed(() => {
    return this.actions().includes('cancel');
  });

  readonly isAnyActionPending = computed(() => this.pendingAction() !== null);

  readonly sourceLabel = computed(() => {
    switch (this.appointment().source) {
      case 'RECEPTION':
        return 'Recepción';
      case 'PROFESSIONAL':
        return 'Profesional';
      case 'BOT':
        return 'Bot';
      case 'WALK_IN':
        return 'Sin cita';
      default:
        return 'Recepción';
    }
  });

  actionLabel(act: AppointmentActionType): string {
    switch (act) {
      case 'check-in':
        return 'Llegó';
      case 'confirm':
        return 'Confirmar';
      case 'no-show':
        return 'No asistió';
      case 'reschedule':
        return 'Reprogramar';
      case 'charge':
        return 'Cobrar';
      case 'cancel':
        return 'Cancelar cita';
    }
  }

  actionIcon(act: AppointmentActionType): LucideIconData {
    switch (act) {
      case 'check-in':
        return this.checkIcon;
      case 'confirm':
        return this.checkCheckIcon;
      case 'no-show':
        return this.userXIcon;
      case 'reschedule':
        return this.calendarSyncIcon;
      case 'charge':
        return this.walletIcon;
      case 'cancel':
        return this.calendarXIcon;
    }
  }

  onActionClick(act: AppointmentActionType): void {
    if (!this.isAnyActionPending()) {
      this.action.emit(act);
    }
  }
}
