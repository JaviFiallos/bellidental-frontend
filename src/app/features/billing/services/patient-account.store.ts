import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, switchMap, tap, catchError, EMPTY } from 'rxjs';
import { ApiError } from '../../../core/api/api.models';
import { ClinicClock } from '../../../core/services/clinic-clock.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CreatePaymentRequest, PatientAccount } from '../models/billing.models';
import { BillingApi } from './billing.api';

/** Provisto por la página de la ficha: el estado vive mientras la ficha está abierta. */
@Injectable()
export class PatientAccountStore {
  private readonly api = inject(BillingApi);
  private readonly clinicClock = inject(ClinicClock);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly loadRequests$ = new Subject<string>();
  private patientId: string | null = null;

  readonly account = signal<PatientAccount | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly formOpen = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly saveError = signal<string | null>(null);

  /** Atención de hoy (la última si hay varias); null si no hay ninguna. */
  readonly defaultEncounterId = computed<string | null>(() => {
    const account = this.account();
    if (!account) return null;

    const today = this.clinicClock.todayDateString();
    let encounterId: string | null = null;
    for (const session of account.sessions) {
      if (session.encounterId !== null && this.clinicClock.addDays(new Date(session.date), 0) === today) {
        encounterId = session.encounterId;
      }
    }
    return encounterId;
  });

  constructor() {
    this.loadRequests$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((patientId) =>
          this.api.getAccount(patientId).pipe(
            tap({
              next: (account) => {
                this.account.set(account);
                this.loading.set(false);
              },
              error: (err: ApiError) => {
                this.error.set(err.message);
                this.loading.set(false);
              },
            }),
            catchError(() => EMPTY)
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  load(patientId: string): void {
    if (patientId !== this.patientId) {
      this.patientId = patientId;
      this.account.set(null);
      this.formOpen.set(false);
      this.saveError.set(null);
    }
    this.loadRequests$.next(patientId);
  }

  reload(): void {
    if (this.patientId) {
      this.loadRequests$.next(this.patientId);
    }
  }

  openForm(): void {
    this.saveError.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.saveError.set(null);
    this.formOpen.set(false);
  }

  registerPayment(request: CreatePaymentRequest): void {
    const patientId = this.patientId;
    if (!patientId || this.saving()) return;

    this.saving.set(true);
    this.saveError.set(null);

    this.api
      .registerPayment(patientId, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payment) => {
          this.saving.set(false);
          this.formOpen.set(false);
          this.notificationService.success(`Abono registrado · ${payment.receiptNumber}`);
          this.reload();
        },
        error: (err: ApiError) => {
          this.saving.set(false);
          this.saveError.set(err.message);
        },
      });
  }
}
