import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CalendarX } from 'lucide-angular';
import { SessionStore } from '../../../../core/auth/session.store';
import { ClinicClock } from '../../../../core/services/clinic-clock.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LucideIconData } from '../../../../shared/components/icon/icon.component';
import { SideSheetComponent } from '../../../../shared/components/side-sheet';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import { Patient, PatientSearchStore } from '../../../patients';
import { AgendaByStatusComponent } from '../../components/agenda-by-status/agenda-by-status.component';
import { AgendaDayListComponent } from '../../components/agenda-day-list/agenda-day-list.component';
import { AgendaGridComponent } from '../../components/agenda-grid/agenda-grid.component';
import { AgendaSummaryComponent } from '../../components/agenda-summary/agenda-summary.component';
import { AgendaToolbarComponent } from '../../components/agenda-toolbar/agenda-toolbar.component';
import { AppointmentFormComponent } from '../../components/appointment-form/appointment-form.component';
import { AppointmentPanelComponent } from '../../components/appointment-panel/appointment-panel.component';
import {
  availableActions,
  canQuickCheckIn,
  AppointmentActionType,
} from '../../domain/appointment-state';
import { Appointment } from '../../models/appointment.models';
import { AgendaStore } from '../../services/agenda.store';
import { AppointmentFormStore } from '../../services/appointment-form.store';

@Component({
  selector: 'bd-reception-agenda-page',
  standalone: true,
  imports: [
    AlertComponent,
    EmptyStateComponent,
    SkeletonComponent,
    SideSheetComponent,
    AppointmentPanelComponent,
    AppointmentFormComponent,
    AgendaToolbarComponent,
    AgendaSummaryComponent,
    AgendaGridComponent,
    AgendaByStatusComponent,
    AgendaDayListComponent,
  ],
  providers: [AgendaStore, AppointmentFormStore, PatientSearchStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="reception-agenda-page"
      [class.reception-agenda-page--panel-open]="isPanelOpen()"
    >
      <!-- Barra superior / Toolbar -->
      <bd-agenda-toolbar
        [date]="store.date()"
        [view]="store.view()"
        [showCancelled]="store.showCancelled()"
        [lastUpdatedAt]="store.lastUpdatedAt()"
        [refreshError]="store.refreshError()"
        [canCreate]="canCreate()"
        (dateChange)="onDateChange($event)"
        (viewChange)="onViewChange($event)"
        (toggleCancelled)="store.setShowCancelled($event)"
        (create)="onCreateAppointment()"
        (walkIn)="onWalkInAppointment()"
      />

      <!-- Contadores / Leyenda (solo si no hay error de carga principal) -->
      @if (!store.loading() && !store.error()) {
        <bd-agenda-summary [summary]="store.summary()" />
      }

      <!-- Estado: Error inicial o de recarga manual -->
      @if (store.error()) {
        <div class="reception-agenda-page__error-container">
          <bd-alert variant="error" [message]="store.error()">
            <button
              type="button"
              class="btn btn-primary reception-agenda-page__retry-btn"
              (click)="onRetry()"
            >
              Reintentar
            </button>
          </bd-alert>
        </div>
      }

      <!-- Estado: Carga inicial con skeleton con forma de grilla -->
      @if (store.loading()) {
        <div class="reception-agenda-page__skeleton-grid" aria-busy="true">
          <div class="reception-agenda-page__skeleton-header">
            <bd-skeleton height="2.5rem" width="100%" />
          </div>
          <div class="reception-agenda-page__skeleton-cols">
            <div class="reception-agenda-page__skeleton-time-col">
              <bd-skeleton height="8rem" width="100%" />
              <bd-skeleton height="8rem" width="100%" />
              <bd-skeleton height="8rem" width="100%" />
            </div>
            <div class="reception-agenda-page__skeleton-col">
              <bd-skeleton height="3.5rem" width="100%" />
              <bd-skeleton height="6rem" width="100%" />
              <bd-skeleton height="4rem" width="100%" />
            </div>
            <div class="reception-agenda-page__skeleton-col">
              <bd-skeleton height="5rem" width="100%" />
              <bd-skeleton height="7rem" width="100%" />
            </div>
            <div class="reception-agenda-page__skeleton-col">
              <bd-skeleton height="6rem" width="100%" />
              <bd-skeleton height="4rem" width="100%" />
            </div>
          </div>
        </div>
      }

      <!-- Estado: Ningún profesional con turno ni citas -->
      @if (!store.loading() && !store.error() && store.displayedProfessionals().length === 0) {
        <bd-empty-state
          [icon]="calendarXIcon"
          title="Ningún profesional atiende este día"
          description="No hay turnos asignados ni citas programadas para la fecha seleccionada."
        >
          <button
            type="button"
            class="btn btn-outline"
            (click)="store.setShowAllProfessionals(true)"
          >
            Ver todos los profesionales
          </button>
        </bd-empty-state>
      }

      <!-- Vistas de la agenda -->
      @if (!store.loading() && !store.error() && store.displayedProfessionals().length > 0) {
        @if (store.view() === 'professional') {
          <!-- En >= md se muestra la grilla -->
          <div class="reception-agenda-page__grid-container">
            <bd-agenda-grid
              [date]="store.date()"
              [now]="store.now()"
              [timeRange]="store.timeRange()"
              [professionals]="store.displayedProfessionals()"
              [effectiveDays]="store.effectiveDays()"
              [appointmentsByProf]="store.appointmentsByProfessional()"
              [selectedId]="selectedId()"
              [canCreate]="canCreate()"
              [quickCheckInIds]="quickCheckInIds()"
              [pendingCheckInId]="pendingCheckInId()"
              (opened)="onOpenAppointment($event)"
              (checkIn)="onQuickCheckIn($event)"
              (slotSelected)="onSlotSelected($event)"
            />
          </div>

          <!-- En < md se muestra la lista por día y profesional -->
          <div class="reception-agenda-page__day-list-container">
            <bd-agenda-day-list
              [professionals]="store.displayedProfessionals()"
              [appointmentsByProf]="store.appointmentsByProfessional()"
              [selectedId]="selectedId()"
              [quickCheckInIds]="quickCheckInIds()"
              [pendingCheckInId]="pendingCheckInId()"
              (opened)="onOpenAppointment($event)"
              (checkIn)="onQuickCheckIn($event)"
            />
          </div>
        } @else {
          <!-- Vista por estado -->
          <bd-agenda-by-status
            [appointmentsByStatus]="store.appointmentsByStatus()"
            [showCancelled]="store.showCancelled()"
            [selectedId]="selectedId()"
            [quickCheckInIds]="quickCheckInIds()"
            [pendingCheckInId]="pendingCheckInId()"
            (opened)="onOpenAppointment($event)"
            (checkIn)="onQuickCheckIn($event)"
          />
        }
      }

      <!-- Panel lateral / Hoja inferior con detalle de la cita -->
      <bd-side-sheet
        [isOpen]="isDetailOpen()"
        [titleId]="'appointment-panel-title'"
        (closed)="onClosePanel()"
      >
        @if (store.selectedAppointment(); as appt) {
          <bd-appointment-panel
            [appointment]="appt"
            [actions]="panelActions()"
            [pendingAction]="store.pendingAction()"
            [error]="store.actionError()"
            (action)="onPanelAction($event)"
            (close)="onClosePanel()"
          />
        }
      </bd-side-sheet>

      <!-- Panel lateral / Hoja inferior con formulario (nueva cita, sin cita, reprogramar) -->
      <bd-side-sheet
        [isOpen]="isFormOpen()"
        [titleId]="'appointment-form-title'"
        [fullscreenBelowMd]="true"
        (closed)="onCloseFormPanel()"
      >
        <div class="appointment-form-panel">
          <div class="appointment-form-panel__header">
            <h2 id="appointment-form-title" class="appointment-form-panel__title">{{ formPanelTitle() }}</h2>
          </div>
          <bd-appointment-form
            [mode]="formStore.mode()"
            [originalAppointment]="formStore.originalAppointment()"
            [walkInAvailability]="formStore.walkInAvailabilityByProf()"
            [walkInLoading]="formStore.walkInLoading()"
            [patient]="formStore.patient()"
            [patientQuery]="patientSearchStore.query()"
            [patientResults]="patientSearchStore.results()"
            [patientLoading]="patientSearchStore.isLoading()"
            [patientError]="patientSearchStore.errorMessage()"
            [availableSpecialties]="formStore.availableSpecialties()"
            [selectedSpecialtyId]="formStore.selectedSpecialtyId()"
            [durationText]="formStore.durationText()"
            [availableProfessionals]="formStore.availableProfessionals()"
            [selectedProfessionalId]="formStore.selectedProfessionalId()"
            [minDate]="minDate()"
            [date]="formStore.date()"
            [slots]="formStore.slots()"
            [selectedSlot]="formStore.selectedSlot()"
            [slotsLoading]="formStore.slotsLoading()"
            [slotsError]="formStore.slotsError()"
            [isSlotPickerReady]="formStore.isSlotPickerReady()"
            [notice]="formStore.notice()"
            [canSubmit]="formStore.canSubmit()"
            [saving]="formStore.saving()"
            [errorMessage]="formStore.error()"
            (patientQueryChange)="patientSearchStore.setQuery($event)"
            (patientSelected)="onPatientSelected($event)"
            (patientClear)="onPatientClear()"
            (specialtyChange)="formStore.setSpecialtyId($event)"
            (professionalChange)="formStore.setProfessionalId($event)"
            (dateChange)="formStore.setDate($event)"
            (todayClick)="onFormToday()"
            (tomorrowClick)="onFormTomorrow()"
            (slotSelected)="formStore.setSelectedSlot($event)"
            (nextDayClicked)="formStore.nextDay()"
            (retrySlots)="formStore.reloadSlots()"
            (save)="onSaveAppointment($event)"
          />
        </div>
      </bd-side-sheet>
    </div>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .appointment-form-panel__header {
      padding: 1.25rem 1.25rem 0.75rem 1.25rem;
      border-bottom: 1px solid var(--slate-100);
    }

    .appointment-form-panel__title {
      margin: 0;
      font-size: var(--fs-lg);
      font-weight: 700;
      color: var(--blue-950);
    }

    .reception-agenda-page {
      display: flex;
      flex-direction: column;
      width: 100%;
      box-sizing: border-box;

      &.reception-agenda-page--panel-open {
        @include bp.bp-up('lg') {
          padding-inline-end: 26rem;
        }
      }
    }

    .reception-agenda-page__error-container {
      margin: var(--space-md) 0;
    }

    .reception-agenda-page__retry-btn {
      margin-left: var(--space-md);
      font-size: var(--fs-xs);
      padding: 0.35rem 0.75rem;
    }

    .reception-agenda-page__skeleton-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      margin-top: var(--space-md);
      background-color: var(--white);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
      padding: var(--space-md);
    }

    .reception-agenda-page__skeleton-header {
      width: 100%;
    }

    .reception-agenda-page__skeleton-cols {
      display: flex;
      gap: var(--space-md);
    }

    .reception-agenda-page__skeleton-time-col {
      width: 4.5rem;
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .reception-agenda-page__skeleton-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .reception-agenda-page__grid-container {
      display: block;
    }

    .reception-agenda-page__day-list-container {
      display: none;
    }

    @include bp.bp-down('md') {
      .reception-agenda-page__grid-container {
        display: none;
      }
      .reception-agenda-page__day-list-container {
        display: block;
      }
    }
  `,
})
export class ReceptionAgendaPage implements OnInit {
  readonly store = inject(AgendaStore);
  readonly formStore = inject(AppointmentFormStore);
  readonly patientSearchStore = inject(PatientSearchStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly clinicClock = inject(ClinicClock);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly sessionStore = inject(SessionStore);
  private readonly notificationService = inject(NotificationService);

  readonly calendarXIcon: LucideIconData = CalendarX;
  private readonly clinicTimePipe = new ClinicTimePipe();
  private readonly clinicDatePipe = new ClinicDatePipe();

  readonly activePanel = signal<'detail' | 'create' | 'walk-in' | 'reschedule' | null>(null);

  readonly canCreate = computed(() => this.sessionStore.hasPermission('APPOINTMENT_CREATE'));
  readonly isDetailOpen = computed(() => this.activePanel() === 'detail' && !!this.store.selectedAppointment());
  readonly isFormOpen = computed(() => {
    const p = this.activePanel();
    return p === 'create' || p === 'walk-in' || p === 'reschedule';
  });
  readonly formPanelTitle = computed(() => {
    switch (this.activePanel()) {
      case 'walk-in':
        return 'Atención sin cita';
      case 'reschedule':
        return 'Reprogramar cita';
      default:
        return 'Nueva cita';
    }
  });
  readonly isPanelOpen = computed(() => this.isDetailOpen() || this.isFormOpen());

  constructor() {
    effect(() => {
      if (this.activePanel() === 'detail' && !this.store.selectedAppointment()) {
        this.activePanel.set(null);
      }
    });
  }
  readonly minDate = computed(() => this.clinicClock.todayDateString());

  readonly isToday = computed(() => this.store.date() === this.clinicClock.todayDateString());

  readonly selectedId = computed(() => this.store.selectedAppointmentId());
  readonly pendingCheckInId = computed(() =>
    this.store.pendingAction() === 'check-in' ? this.store.pendingActionAppointmentId() : null
  );

  readonly quickCheckInIds = computed<Set<string>>(() => {
    const set = new Set<string>();
    const now = this.store.now();
    const isToday = this.isToday();
    const hasPerm = (p: string) => this.sessionStore.hasPermission(p);
    for (const appt of this.store.displayedAppointments()) {
      if (canQuickCheckIn(appt, now, isToday, hasPerm)) {
        set.add(appt.id);
      }
    }
    return set;
  });

  readonly panelActions = computed(() => {
    const appt = this.store.selectedAppointment();
    if (!appt) return [];
    return availableActions(
      appt,
      this.store.now(),
      this.isToday(),
      (perm) => this.sessionStore.hasPermission(perm)
    );
  });

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const queryDate = params.get('fecha');
        const queryView = params.get('vista');

        const effectiveDate = queryDate || this.clinicClock.todayDateString();
        const effectiveView: 'professional' | 'status' =
          queryView === 'estado' ? 'status' : 'professional';

        const needsUrlUpdate = !queryDate || !queryView;

        if (this.store.date() !== effectiveDate) {
          this.store.setDate(effectiveDate);
        }
        if (this.store.view() !== effectiveView) {
          this.store.setView(effectiveView);
        }

        if (needsUrlUpdate) {
          this.syncUrl(effectiveDate, effectiveView);
        }
      });
  }

  onDateChange(newDate: string): void {
    this.store.setDate(newDate);
    this.syncUrl(newDate, this.store.view());
  }

  onViewChange(newView: 'professional' | 'status'): void {
    this.store.setView(newView);
    this.syncUrl(this.store.date(), newView);
  }

  onRetry(): void {
    this.store.loadAgenda(this.store.date());
  }

  onOpenAppointment(appt: Appointment): void {
    this.activePanel.set('detail');
    this.store.selectAppointment(appt.id);
  }

  onClosePanel(): void {
    this.store.selectAppointment(null);
    this.activePanel.set(null);
  }

  onCreateAppointment(): void {
    this.store.selectAppointment(null);
    this.formStore.setProfessionals(this.store.professionals());
    this.formStore.openNew(this.store.date());
    this.patientSearchStore.clear();
    this.activePanel.set('create');
  }

  onWalkInAppointment(): void {
    this.store.selectAppointment(null);
    this.formStore.setProfessionals(this.store.professionals());
    this.formStore.openWalkIn(this.store.date());
    this.patientSearchStore.clear();
    this.activePanel.set('walk-in');
  }

  onSlotSelected(event: { professionalId: string; startAt: string }): void {
    this.formStore.setProfessionals(this.store.professionals());
    if (this.activePanel() === 'create') {
      this.formStore.updateSlotSelection(event.professionalId, this.store.date(), event.startAt);
    } else {
      this.store.selectAppointment(null);
      this.formStore.openFromSlot(event.professionalId, this.store.date(), event.startAt);
      this.patientSearchStore.clear();
      this.activePanel.set('create');
    }
  }

  onCloseFormPanel(): void {
    if (this.activePanel() === 'reschedule') {
      this.activePanel.set('detail');
    } else {
      this.activePanel.set(null);
    }
  }

  onPatientSelected(patient: Patient): void {
    this.formStore.setPatient(patient);
  }

  onPatientClear(): void {
    this.formStore.setPatient(null);
    this.patientSearchStore.clear();
  }

  onFormToday(): void {
    this.formStore.setDate(this.clinicClock.todayDateString());
  }

  onFormTomorrow(): void {
    this.formStore.setDate(this.clinicClock.addDays(this.clinicClock.todayDateString(), 1));
  }

  onSaveAppointment(reason?: string): void {
    const currentMode = this.formStore.mode();
    this.formStore.submit(reason).subscribe({
      next: (appt) => {
        this.activePanel.set(null);
        const apptDate = appt.startAt.slice(0, 10);
        const dateFormatted = this.clinicDatePipe.transform(appt.startAt);
        const timeFormatted = this.clinicTimePipe.transform(appt.startAt);

        if (currentMode === 'walk-in') {
          this.notificationService.success(
            `${appt.patientName} en espera · ${timeFormatted} con ${appt.professionalName}`
          );
          this.store.refreshAppointments();
        } else if (currentMode === 'reschedule') {
          this.store.selectAppointment(null);
          this.notificationService.success(
            `Cita reprogramada: ${dateFormatted} · ${timeFormatted}`
          );
          if (apptDate !== this.store.date()) {
            this.onDateChange(apptDate);
          } else {
            this.store.refreshAppointments();
          }
        } else {
          this.notificationService.success(
            `Cita agendada: ${appt.patientName}, ${dateFormatted} · ${timeFormatted}`
          );
          if (apptDate !== this.store.date()) {
            this.onDateChange(apptDate);
          } else {
            this.store.refreshAppointments();
          }
        }
      },
      error: () => {},
    });
  }

  onQuickCheckIn(appt: Appointment): void {
    this.store.runAction(appt.id, 'check-in');
  }

  onPanelAction(action: AppointmentActionType): void {
    const appt = this.store.selectedAppointment();
    if (!appt) return;

    if (action === 'reschedule') {
      this.formStore.setProfessionals(this.store.professionals());
      this.formStore.openReschedule(appt);
      this.activePanel.set('reschedule');
    } else if (action === 'cancel') {
      const timeText = this.clinicTimePipe.transform(appt.startAt);
      this.confirmDialog
        .open({
          title: 'Cancelar cita',
          message: `¿Cancelar la cita de ${appt.patientName} de las ${timeText}?`,
          confirmLabel: 'Cancelar cita',
          cancelLabel: 'Volver',
          tone: 'danger',
        })
        .subscribe((res) => {
          if (res.confirmed) {
            this.store.runAction(appt.id, 'cancel');
          }
        });
    } else {
      this.store.runAction(appt.id, action);
    }
  }

  private syncUrl(date: string, view: 'professional' | 'status'): void {
    const vistaParam = view === 'status' ? 'estado' : 'profesional';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        fecha: date,
        vista: vistaParam,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
