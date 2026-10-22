import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
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
import { finalize } from 'rxjs';
import { ApiError } from '../../../../core/api/api.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import {
  closePdfWindow,
  openBlankPdfWindow,
  showPdfInWindow,
} from '../../../../shared/utils/pdf-window';
import { balanceStatus, sessionDue } from '../../domain/account-display';
import {
  AccountSession,
  CreatePaymentRequest,
  PatientAccount,
  Payment,
} from '../../models/billing.models';
import { BillingApi } from '../../services/billing.api';
import { LastPaymentComponent } from '../last-payment/last-payment.component';
import { PaymentFormComponent } from '../payment-form/payment-form.component';

export interface PaymentDialogData {
  patientId: string;
  patientName: string;
  encounterId: string;
}

@Component({
  selector: 'bd-payment-dialog',
  standalone: true,
  imports: [
    AlertComponent,
    LastPaymentComponent,
    MoneyPipe,
    PaymentFormComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="payment-dialog">
      <header class="payment-dialog__header">
        <div>
          <h2 id="payment-dialog-title" class="payment-dialog__title">Registrar abono</h2>
          <p class="payment-dialog__subtitle">Paciente: <strong>{{ data.patientName }}</strong></p>
        </div>
        <button
          type="button"
          class="btn btn-ghost payment-dialog__close-btn"
          aria-label="Cerrar diálogo"
          (click)="dialogRef.close(createdPayment())"
        >
          ✕
        </button>
      </header>

      <div class="payment-dialog__body">
        @if (loading()) {
          <div class="payment-dialog__skeleton" aria-busy="true">
            <bd-skeleton height="4rem" width="100%" />
            <bd-skeleton height="6rem" width="100%" />
          </div>
        } @else if (loadError(); as err) {
          <div class="payment-dialog__error">
            <bd-alert variant="error" [message]="err" />
            <button type="button" class="btn btn-outline" (click)="loadAccount()">
              Reintentar
            </button>
          </div>
        } @else if (account(); as acc) {
          @if (!createdPayment()) {
            <!-- Resumen de sesión y saldo -->
            <div class="payment-dialog__summary">
              @if (currentSession(); as s) {
                <div class="payment-dialog__session-info">
                  <div class="payment-dialog__stat">
                    <span class="payment-dialog__stat-label">Cargo de la sesión</span>
                    <span class="payment-dialog__stat-value">{{ s.charge | money }}</span>
                  </div>
                  <div class="payment-dialog__stat">
                    <span class="payment-dialog__stat-label">Abonado a la sesión</span>
                    <span class="payment-dialog__stat-value">{{ s.payment | money }}</span>
                  </div>
                  <div class="payment-dialog__stat">
                    <span class="payment-dialog__stat-label">Pendiente de la sesión</span>
                    <span class="payment-dialog__stat-value payment-dialog__stat-value--highlight">
                      {{ (currentSessionDue() ?? 0) | money }}
                    </span>
                  </div>
                </div>
              }

              <div class="payment-dialog__balance-row">
                <span class="payment-dialog__balance-label">Saldo total del paciente:</span>
                <span class="payment-dialog__balance-amount">{{ acc.balance | money }}</span>
                @if (acc.balance <= 0) {
                  <span class="payment-dialog__no-debt-badge">Sin deuda</span>
                }
              </div>
            </div>

            <!-- Formulario de pago -->
            <bd-payment-form
              [balance]="acc.balance"
              [sessions]="acc.sessions"
              [defaultEncounterId]="data.encounterId"
              [initialAmount]="proposedAmount()"
              [saving]="saving()"
              [errorMessage]="saveError()"
              (submitted)="onRegisterPayment($event)"
              (cancelled)="dialogRef.close(null)"
            />
          } @else if (createdPayment(); as payment) {
            <!-- Franja de éxito -->
            <div class="payment-dialog__success">
              <bd-last-payment
                [payment]="payment"
                [canVoid]="false"
                [printing]="printing()"
                [hasPendingReceipt]="pendingReceipt() !== null"
                [errorMessage]="printError()"
                (print)="onPrintReceipt()"
                (openPending)="onOpenPendingReceipt()"
              />

              <div class="payment-dialog__success-actions">
                <button
                  type="button"
                  class="btn btn-primary payment-dialog__btn-done"
                  (click)="dialogRef.close(payment)"
                >
                  Cerrar
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    .payment-dialog {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      box-sizing: border-box;
      width: 100%;
      max-height: 90vh;
      padding: var(--space-lg);
      background-color: var(--white);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      overflow-y: auto;
    }

    .payment-dialog__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-sm);
    }

    .payment-dialog__title {
      margin: 0;
      font-size: var(--fs-lg);
      font-weight: 700;
      color: var(--blue-950);
    }

    .payment-dialog__subtitle {
      margin: 0.25rem 0 0 0;
      font-size: var(--fs-sm);
      color: var(--slate-600);
    }

    .payment-dialog__close-btn {
      min-width: 44px;
      min-height: 44px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      border-radius: 50%;
    }

    .payment-dialog__body {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      min-height: 0;
    }

    .payment-dialog__skeleton,
    .payment-dialog__error {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .payment-dialog__summary {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      padding: var(--space-md);
      background-color: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
    }

    .payment-dialog__session-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
      gap: var(--space-sm);
      padding-bottom: var(--space-xs);
      border-bottom: 1px solid var(--slate-200);
    }

    .payment-dialog__stat {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .payment-dialog__stat-label {
      font-size: var(--fs-xs);
      color: var(--slate-500);
      font-weight: 500;
    }

    .payment-dialog__stat-value {
      font-size: var(--fs-sm);
      font-weight: 700;
      color: var(--slate-800);
    }

    .payment-dialog__stat-value--highlight {
      color: var(--blue-900);
    }

    .payment-dialog__balance-row {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: var(--fs-sm);
    }

    .payment-dialog__balance-label {
      color: var(--slate-600);
    }

    .payment-dialog__balance-amount {
      font-weight: 700;
      color: var(--blue-950);
    }

    .payment-dialog__no-debt-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.1rem 0.5rem;
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--teal-900, #134e4a);
      background-color: var(--teal-50, #f0fdfa);
      border: 1px solid var(--teal-200, #99f6e4);
      border-radius: var(--radius-full, 9999px);
    }

    .payment-dialog__success {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .payment-dialog__success-actions {
      display: flex;
      justify-content: flex-end;
    }

    .payment-dialog__btn-done {
      min-height: 44px;
      padding: 0 var(--space-lg);
    }
  `,
})
export class PaymentDialogComponent implements OnInit {
  readonly dialogRef = inject<DialogRef<Payment | null>>(DialogRef);
  readonly data = inject<PaymentDialogData>(DIALOG_DATA);
  private readonly billingApi = inject(BillingApi);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly account = signal<PatientAccount | null>(null);
  readonly loading = signal<boolean>(true);
  readonly loadError = signal<string | null>(null);

  readonly saving = signal<boolean>(false);
  readonly saveError = signal<string | null>(null);
  readonly createdPayment = signal<Payment | null>(null);

  readonly printing = signal<boolean>(false);
  readonly printError = signal<string | null>(null);
  readonly pendingReceipt = signal<{ paymentId: string; pdf: Blob } | null>(null);

  readonly currentSession = computed<AccountSession | null>(() => {
    const acc = this.account();
    if (!acc) return null;
    return acc.sessions.find((s) => s.encounterId === this.data.encounterId) ?? null;
  });

  readonly currentSessionDue = computed<number | null>(() => {
    const acc = this.account();
    if (!acc) return null;
    return sessionDue(acc, this.data.encounterId);
  });

  readonly proposedAmount = computed<number | null>(() => {
    const due = this.currentSessionDue();
    if (due !== null && due > 0) return due;
    const balance = this.account()?.balance ?? 0;
    if (balance > 0) return balance;
    return null;
  });

  ngOnInit(): void {
    this.loadAccount();
  }

  loadAccount(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.billingApi
      .getAccount(this.data.patientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (account) => {
          this.account.set(account);
          this.loading.set(false);
        },
        error: (err: ApiError) => {
          this.loadError.set(err.message);
          this.loading.set(false);
        },
      });
  }

  onRegisterPayment(request: CreatePaymentRequest): void {
    this.saving.set(true);
    this.saveError.set(null);

    this.billingApi
      .registerPayment(this.data.patientId, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payment) => {
          this.saving.set(false);
          this.createdPayment.set(payment);
          this.notifications.success(`Abono registrado · ${payment.receiptNumber}`);
        },
        error: (err: ApiError) => {
          this.saving.set(false);
          const msg = err.status === 403 ? 'No tienes permiso' : err.message;
          this.saveError.set(msg);
        },
      });
  }

  onPrintReceipt(): void {
    const payment = this.createdPayment();
    if (!payment || this.printing()) return;

    const target = openBlankPdfWindow();
    this.printing.set(true);
    this.printError.set(null);

    this.billingApi
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
          this.printError.set(err.message);
        },
      });
  }

  onOpenPendingReceipt(): void {
    const pending = this.pendingReceipt();
    if (!pending) return;
    const target = openBlankPdfWindow();
    if (target) {
      showPdfInWindow(target, pending.pdf);
      this.pendingReceipt.set(null);
    }
  }
}
