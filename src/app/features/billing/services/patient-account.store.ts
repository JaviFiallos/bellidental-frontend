import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, switchMap, tap, catchError, EMPTY, finalize } from 'rxjs';
import { ApiError } from '../../../core/api/api.models';
import { ClinicClock } from '../../../core/services/clinic-clock.service';
import { NotificationService } from '../../../core/services/notification.service';
import { closePdfWindow, openBlankPdfWindow, showPdfInWindow } from '../../../shared/utils/pdf-window';
import { CreatePaymentRequest, PatientAccount, Payment } from '../models/billing.models';
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

  /** Último abono registrado en esta visita a la ficha (solo ese se puede imprimir o anular; G-11). */
  readonly lastPayment = signal<Payment | null>(null);
  readonly printing = signal<boolean>(false);
  readonly voiding = signal<boolean>(false);
  /** Error de imprimir o anular, mostrado en la franja "Abono registrado". */
  readonly actionError = signal<string | null>(null);
  /** Comprobante descargado cuando la pestaña fue bloqueada; se abre con "Abrir PDF" en otro clic. */
  readonly pendingReceipt = signal<{ paymentId: string; pdf: Blob } | null>(null);

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
      this.clearLastPayment();
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
          this.lastPayment.set(payment);
          this.actionError.set(null);
          this.pendingReceipt.set(null);
          this.notificationService.success(`Abono registrado · ${payment.receiptNumber}`);
          this.reload();
        },
        error: (err: ApiError) => {
          this.saving.set(false);
          this.saveError.set(err.message);
        },
      });
  }

  /**
   * Pide el comprobante. La pestaña se abre antes de la petición, en el clic del usuario (mismo patrón que las
   * recetas): si el navegador la bloquea, el PDF queda pendiente hasta "Abrir PDF".
   */
  printReceipt(): void {
    const payment = this.lastPayment();
    if (!payment || this.printing()) return;

    const target = openBlankPdfWindow();
    this.printing.set(true);
    this.actionError.set(null);

    this.api
      .receipt(payment.id)
      .pipe(
        finalize(() => this.printing.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (pdf) => {
          if (target) {
            showPdfInWindow(target, pdf);
            this.pendingReceipt.set(null);
          } else {
            this.pendingReceipt.set({ paymentId: payment.id, pdf });
          }
        },
        error: (err: ApiError) => {
          closePdfWindow(target);
          this.actionError.set(err.message);
        },
      });
  }

  /** "Abrir PDF" tras un bloqueo: la pestaña se abre desde el clic del usuario. */
  openPendingReceipt(): void {
    const pending = this.pendingReceipt();
    if (!pending) return;

    const target = openBlankPdfWindow();
    if (!target) {
      this.actionError.set('El navegador bloqueó la pestaña del PDF. Permite las ventanas emergentes e inténtalo de nuevo.');
      return;
    }
    showPdfInWindow(target, pending.pdf);
    this.pendingReceipt.set(null);
  }

  /** Anula el último abono con motivo. Luego vuelve a pedir la cuenta: el saldo sube de nuevo. */
  voidLastPayment(voidReason: string): void {
    const payment = this.lastPayment();
    if (!payment || payment.voided || this.voiding()) return;

    this.voiding.set(true);
    this.actionError.set(null);

    this.api
      .voidPayment(payment.id, voidReason)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (voided) => {
          this.voiding.set(false);
          this.lastPayment.set(voided);
          this.pendingReceipt.set(null);
          this.notificationService.success('Abono anulado');
          this.reload();
        },
        error: (err: ApiError) => {
          this.voiding.set(false);
          this.actionError.set(err.message);
        },
      });
  }

  private clearLastPayment(): void {
    this.lastPayment.set(null);
    this.pendingReceipt.set(null);
    this.actionError.set(null);
  }
}
