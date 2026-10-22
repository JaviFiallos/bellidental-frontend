import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, filter, finalize, forkJoin, map, merge, Observable, of, Subject, switchMap, tap } from 'rxjs';
import { FileText, History } from 'lucide-angular';
import { SessionStore } from '../../../../core/auth/session.store';
import { ApiError } from '../../../../core/api/api.models';
import { ClinicClock } from '../../../../core/services/clinic-clock.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { Appointment, AppointmentsApi } from '../../../appointments';
import { PatientAccountSectionComponent, PatientAccountStore, Payment, PaymentListItem } from '../../../billing';
import { AuditHistoryDialogService } from '../../../management';
import { AdminNotesComponent } from '../../components/admin-notes/admin-notes.component';
import { PatientAppointmentsComponent } from '../../components/patient-appointments/patient-appointments.component';
import { PatientIdentityComponent } from '../../components/patient-identity/patient-identity.component';
import { Patient } from '../../models/patient.models';
import { PatientsApi } from '../../services/patients.api';

@Component({
  selector: 'bd-patient-reception-page',
  standalone: true,
  imports: [
    RouterLink,
    AlertComponent,
    SkeletonComponent,
    IconComponent,
    PatientIdentityComponent,
    AdminNotesComponent,
    PatientAppointmentsComponent,
    PatientAccountSectionComponent,
  ],
  providers: [PatientAccountStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="patient-reception">
      @if (patientLoading()) {
        <div class="patient-reception__skeleton" aria-busy="true">
          <bd-skeleton height="7rem" width="100%" />
          <bd-skeleton height="5rem" width="100%" />
          <bd-skeleton height="10rem" width="100%" />
        </div>
      } @else if (patientError()) {
        <bd-alert variant="error" [message]="patientError()">
          <button type="button" class="btn btn-primary" (click)="reloadPatient()">Reintentar</button>
        </bd-alert>
      } @else if (patient(); as current) {
        <div class="patient-reception__identity-section">
          <bd-patient-identity [patient]="current" [canEdit]="canEdit()" (edit)="onEdit()" />
          @if (canViewForm033()) {
            <div class="patient-reception__actions">
              <a
                class="btn btn-outline patient-reception__btn"
                [routerLink]="['/pacientes', current.id, '033']"
                aria-label="Ver Formulario 033"
              >
                <bd-icon [name]="fileTextIcon" [size]="18" />
                <span>Formulario 033</span>
              </a>
              @if (isDirector()) {
                <button
                  type="button"
                  class="btn btn-outline patient-reception__btn"
                  (click)="onOpenChangesHistory(current)"
                >
                  <bd-icon [name]="historyIcon" [size]="18" />
                  <span>Historial de cambios</span>
                </button>
              }
            </div>
          }
        </div>

        @if (isSecretaria()) {
          <bd-admin-notes
            [notes]="current.adminNotes"
            [canEdit]="canEdit()"
            [saving]="notesSaving()"
            [error]="notesError()"
            (save)="onSaveNotes($event)"
          />
        }

        @if (canViewAccount()) {
          <bd-patient-account-section
            [account]="accountStore.account()"
            [payments]="accountStore.payments()"
            [loading]="accountStore.loading()"
            [error]="accountStore.error()"
            [canRegister]="canRegisterPayment()"
            [formOpen]="accountStore.formOpen()"
            [saving]="accountStore.saving()"
            [saveError]="accountStore.saveError()"
            [defaultEncounterId]="accountStore.defaultEncounterId()"
            [lastPayment]="accountStore.lastPayment()"
            [canVoid]="canRegisterPayment()"
            [printing]="accountStore.printing()"
            [voiding]="accountStore.voiding()"
            [hasPendingReceipt]="accountStore.pendingReceipt() !== null"
            [pendingReceiptPaymentId]="accountStore.pendingReceipt()?.paymentId ?? null"
            [paymentActionError]="accountStore.actionError()"
            (retry)="accountStore.reload()"
            (openForm)="accountStore.openForm()"
            (closeForm)="accountStore.closeForm()"
            (submitPayment)="accountStore.registerPayment($event)"
            (printReceipt)="accountStore.printReceipt($event ?? undefined)"
            (openPendingReceipt)="accountStore.openPendingReceipt()"
            (voidPayment)="onVoidPayment($event)"
          />
        }

        @if (isSecretaria()) {
          <section class="patient-reception__appointments" aria-labelledby="patient-reception-appointments-title">
            <h2 id="patient-reception-appointments-title" class="patient-reception__section-title">Citas</h2>

            @if (appointmentsLoading()) {
              <div class="patient-reception__skeleton" aria-busy="true">
                <bd-skeleton height="8rem" width="100%" />
                <bd-skeleton height="6rem" width="100%" />
              </div>
            } @else if (appointmentsError()) {
              <bd-alert variant="error" [message]="appointmentsError()">
                <button type="button" class="btn btn-primary" (click)="reloadAppointments()">Reintentar</button>
              </bd-alert>
            } @else {
              <bd-patient-appointments
                [appointments]="appointments()"
                [now]="now()"
                [canReschedule]="canUpdateAppointments()"
                [canCancel]="canCancelAppointments()"
                (reschedule)="onReschedule($event)"
                (cancel)="onCancelAppointment($event)"
              />
            }
          </section>
        }
      }
    </div>
  `,
  styles: `
    .patient-reception {
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
      width: 100%;
      max-width: 64rem;
      margin: 0 auto;
      box-sizing: border-box;
    }

    .patient-reception__identity-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .patient-reception__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-sm);
    }

    .patient-reception__btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      min-height: 44px;
      padding: 0 var(--space-md);
    }

    .patient-reception__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-lg);
    }

    .patient-reception__appointments {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .patient-reception__section-title {
      margin: 0;
      font-size: var(--fs-md);
      font-weight: 600;
      color: var(--blue-950);
    }
  `,
})
export class PatientReceptionPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly patientsApi = inject(PatientsApi);
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly sessionStore = inject(SessionStore);
  private readonly clinicClock = inject(ClinicClock);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly auditHistory = inject(AuditHistoryDialogService);
  private readonly clinicTimePipe = new ClinicTimePipe();
  private readonly moneyPipe = new MoneyPipe();
  readonly accountStore = inject(PatientAccountStore);

  private readonly reloadPatient$ = new Subject<void>();

  readonly patient = signal<Patient | null>(null);
  readonly patientLoading = signal<boolean>(true);
  readonly patientError = signal<string | null>(null);

  readonly appointments = signal<Appointment[]>([]);
  readonly appointmentsLoading = signal<boolean>(false);
  readonly appointmentsError = signal<string | null>(null);
  readonly now = signal<Date>(this.clinicClock.now());

  readonly notesSaving = signal<boolean>(false);
  readonly notesError = signal<string | null>(null);

  readonly isSecretaria = computed(() => this.sessionStore.profile() === 'SECRETARIA');
  readonly canViewForm033 = computed(() => {
    const prof = this.sessionStore.profile();
    return prof === 'ODONTOLOGO' || prof === 'DIRECTOR';
  });
  readonly fileTextIcon = FileText;
  readonly historyIcon = History;
  readonly isDirector = computed(() => this.sessionStore.profile() === 'DIRECTOR');
  readonly canEdit = computed(
    () => this.isSecretaria() && this.sessionStore.hasPermission('PATIENT_UPDATE')
  );
  readonly canViewAccount = computed(
    () => this.sessionStore.hasPermission('BILLING_READ')
  );
  readonly canRegisterPayment = computed(() => this.sessionStore.hasPermission('BILLING_CREATE'));
  readonly canUpdateAppointments = computed(() =>
    this.sessionStore.hasPermission('APPOINTMENT_UPDATE')
  );
  readonly canCancelAppointments = computed(() =>
    this.sessionStore.hasPermission('APPOINTMENT_CANCEL')
  );

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        switchMap((id) =>
          merge(of(undefined), this.reloadPatient$).pipe(switchMap(() => this.loadPatient(id)))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  reloadPatient(): void {
    this.reloadPatient$.next();
  }

  reloadAppointments(): void {
    const patient = this.patient();
    if (!patient) return;

    this.appointmentsLoading.set(true);
    this.fetchAppointments(patient.id)
      .pipe(
        finalize(() => this.appointmentsLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  onEdit(): void {
    const patient = this.patient();
    if (patient) {
      this.router.navigate(['/pacientes', patient.id, 'editar']);
    }
  }

  onOpenChangesHistory(patient: Patient): void {
    this.auditHistory.open({
      entity: 'patients',
      id: patient.id,
      title: 'Historial de cambios · ' + patient.fullName,
    });
  }

  onSaveNotes(adminNotes: string): void {
    const patient = this.patient();
    if (!patient) return;

    this.notesSaving.set(true);
    this.notesError.set(null);

    this.patientsApi
      .update(patient.id, { adminNotes })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.patient.set(updated);
          this.notesSaving.set(false);
        },
        error: (err: ApiError) => {
          this.notesError.set(err.message);
          this.notesSaving.set(false);
        },
      });
  }

  onReschedule(appointment: Appointment): void {
    this.router.navigate(['/recepcion'], {
      queryParams: {
        fecha: appointment.startAt.slice(0, 10),
        cita: appointment.id,
        accion: 'reprogramar',
      },
    });
  }

  onCancelAppointment(appointment: Appointment): void {
    const timeText = this.clinicTimePipe.transform(appointment.startAt);
    this.confirmDialog
      .open({
        title: 'Cancelar cita',
        message: `¿Cancelar la cita de ${appointment.patientName} de las ${timeText}?`,
        confirmLabel: 'Cancelar cita',
        cancelLabel: 'Volver',
        tone: 'danger',
      })
      .pipe(
        filter((result) => result.confirmed),
        switchMap(() => this.appointmentsApi.cancel(appointment.id)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Cita cancelada');
          const patient = this.patient();
          if (patient) {
            this.fetchAppointments(patient.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
          }
        },
        error: (err: ApiError) => this.notificationService.error(err.message),
      });
  }

  /** Confirma la anulación de un abono con motivo obligatorio; la franja reporta el resultado. */
  onVoidPayment(payment: Payment | PaymentListItem): void {
    this.confirmDialog
      .open({
        title: 'Anular abono',
        message: `El abono ${payment.receiptNumber} de ${this.moneyPipe.transform(payment.amount)} dejará de contar en el saldo. El comprobante quedará marcado como anulado.`,
        confirmLabel: 'Anular abono',
        cancelLabel: 'Volver',
        tone: 'danger',
        reasonLabel: 'Motivo de la anulación',
        reasonRequired: true,
      })
      .pipe(
        filter((result) => result.confirmed),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => this.accountStore.voidPayment(payment.id, (result.reason ?? '').trim()));
  }

  private loadPatient(id: string): Observable<unknown> {
    this.patient.set(null);
    this.patientLoading.set(true);
    this.patientError.set(null);
    this.notesError.set(null);
    this.appointments.set([]);
    this.appointmentsError.set(null);
    this.appointmentsLoading.set(this.isSecretaria());

    if (this.canViewAccount()) {
      this.accountStore.load(id);
    }

    const patient$ = this.patientsApi.getById(id).pipe(
      tap({
        next: (patient) => this.patient.set(patient),
        error: (err: ApiError) => this.patientError.set(err.message),
      }),
      catchError(() => of(null))
    );

    const appointments$ = this.isSecretaria()
      ? this.fetchAppointments(id)
      : of(null);

    return forkJoin([patient$, appointments$]).pipe(
      finalize(() => {
        this.patientLoading.set(false);
        this.appointmentsLoading.set(false);
      })
    );
  }

  private fetchAppointments(patientId: string): Observable<Appointment[] | null> {
    return this.appointmentsApi.listByPatient(patientId).pipe(
      tap({
        next: (appointments) => {
          this.appointments.set(appointments);
          this.appointmentsError.set(null);
          this.now.set(this.clinicClock.now());
        },
        error: (err: ApiError) => this.appointmentsError.set(err.message),
      }),
      catchError(() => of(null))
    );
  }
}
