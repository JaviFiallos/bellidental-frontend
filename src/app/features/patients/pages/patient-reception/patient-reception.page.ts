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
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, filter, finalize, forkJoin, map, merge, Observable, of, Subject, switchMap, tap } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { ApiError } from '../../../../core/api/api.models';
import { ClinicClock } from '../../../../core/services/clinic-clock.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import { Appointment, AppointmentsApi } from '../../../appointments';
import { AdminNotesComponent } from '../../components/admin-notes/admin-notes.component';
import { PatientAppointmentsComponent } from '../../components/patient-appointments/patient-appointments.component';
import { PatientIdentityComponent } from '../../components/patient-identity/patient-identity.component';
import { Patient } from '../../models/patient.models';
import { PatientsApi } from '../../services/patients.api';

@Component({
  selector: 'bd-patient-reception-page',
  standalone: true,
  imports: [
    AlertComponent,
    SkeletonComponent,
    PatientIdentityComponent,
    AdminNotesComponent,
    PatientAppointmentsComponent,
  ],
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
        <bd-patient-identity [patient]="current" [canEdit]="canEdit()" (edit)="onEdit()" />

        @if (isSecretaria()) {
          <bd-admin-notes
            [notes]="current.adminNotes"
            [canEdit]="canEdit()"
            [saving]="notesSaving()"
            [error]="notesError()"
            (save)="onSaveNotes($event)"
          />

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
  private readonly clinicTimePipe = new ClinicTimePipe();

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
  readonly canEdit = computed(
    () => this.isSecretaria() && this.sessionStore.hasPermission('PATIENT_UPDATE')
  );
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

  private loadPatient(id: string): Observable<unknown> {
    this.patient.set(null);
    this.patientLoading.set(true);
    this.patientError.set(null);
    this.notesError.set(null);
    this.appointments.set([]);
    this.appointmentsError.set(null);
    this.appointmentsLoading.set(this.isSecretaria());

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
