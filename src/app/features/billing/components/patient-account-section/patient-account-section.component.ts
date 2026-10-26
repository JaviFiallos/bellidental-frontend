import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { balanceStatus } from '../../domain/account-display';
import { CreatePaymentRequest, PatientAccount, Payment, PaymentListItem } from '../../models/billing.models';
import { AccountTableComponent } from '../account-table/account-table.component';
import { LastPaymentComponent } from '../last-payment/last-payment.component';
import { PaymentFormComponent } from '../payment-form/payment-form.component';
import { PaymentListComponent } from '../payment-list/payment-list.component';

/** Tarjeta "Estado de cuenta" de la ficha. Presentacional: los datos llegan por input() y las acciones salen por output(). */
@Component({
  selector: 'bd-patient-account-section',
  standalone: true,
  imports: [
    AlertComponent,
    EmptyStateComponent,
    SkeletonComponent,
    MoneyPipe,
    AccountTableComponent,
    PaymentFormComponent,
    LastPaymentComponent,
    PaymentListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="account-section" aria-labelledby="patient-account-title">
      <header class="account-section__header">
        <div class="account-section__heading">
          <h2 id="patient-account-title" class="account-section__title">Estado de cuenta</h2>
          @if (account(); as current) {
            @let status = balanceOf(current.balance);
            <p class="account-section__summary">
              Cargos {{ current.totalCharges | money }} · Abonos {{ current.totalPayments | money }} ·
              <strong class="account-section__balance account-section__balance--{{ status.tone }}">
                {{ status.label }}
                @if (status.amount !== null) {
                  {{ status.amount | money }}
                }
              </strong>
            </p>
          }
        </div>

        @if (canRegister() && !formOpen() && account()) {
          <button type="button" class="btn btn-accent account-section__register" (click)="openForm.emit()">
            Registrar abono
          </button>
        }
      </header>

      @if (loading() && !account()) {
        <div class="account-section__skeleton" aria-busy="true">
          <bd-skeleton height="1.5rem" width="60%" />
          <bd-skeleton height="8rem" width="100%" />
        </div>
      } @else if (error()) {
        <bd-alert variant="error" [message]="error()">
          <button type="button" class="btn btn-primary account-section__retry" (click)="retry.emit()">
            Reintentar
          </button>
        </bd-alert>
      } @else if (account(); as current) {
        @if (formOpen()) {
          <bd-payment-form
            [balance]="current.balance"
            [sessions]="current.sessions"
            [defaultEncounterId]="defaultEncounterId()"
            [saving]="saving()"
            [errorMessage]="saveError()"
            (submitted)="submitPayment.emit($event)"
            (cancelled)="closeForm.emit()"
          />
        }

        @if (lastPayment(); as payment) {
          <bd-last-payment
            [payment]="payment"
            [canVoid]="canVoid()"
            [printing]="printing()"
            [voiding]="voiding()"
            [pendingReceiptUrl]="pendingReceiptUrl()"
            [errorMessage]="paymentActionError()"
            (print)="printReceipt.emit()"
            (openPending)="openPendingReceipt.emit($event)"
            (voidPayment)="voidPayment.emit($event)"
          />
        } @else if (paymentActionError()) {
          <bd-alert variant="error" [message]="paymentActionError()" />
        }

        @if (current.sessions.length === 0) {
          <bd-empty-state title="Sin movimientos" description="Aún no hay tratamientos ni abonos." />
        } @else {
          <bd-account-table [sessions]="current.sessions" />
        }

        <section class="account-section__payments-group" aria-labelledby="patient-payments-title">
          <h3 id="patient-payments-title" class="account-section__subtitle">Abonos</h3>
          <bd-payment-list
            [payments]="payments()"
            [canVoid]="canVoid()"
            [printing]="printing()"
            [voiding]="voiding()"
            [pendingReceiptPaymentId]="pendingReceiptPaymentId()"
            [pendingReceiptUrl]="pendingReceiptUrl()"
            (printReceipt)="printReceipt.emit($event)"
            (openPendingReceipt)="openPendingReceipt.emit($event)"
            (voidPayment)="voidPayment.emit($event)"
          />
        </section>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      container-type: inline-size;
    }

    .account-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-lg);
      box-sizing: border-box;
    }

    .account-section__header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
    }

    .account-section__heading {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      min-width: 0;
    }

    .account-section__title {
      margin: 0;
      font-size: var(--fs-md);
      font-weight: 600;
      color: var(--blue-950);
    }

    .account-section__summary {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .account-section__balance--due {
      color: var(--color-text);
      font-weight: 600;
    }

    .account-section__balance--credit,
    .account-section__balance--settled {
      color: var(--teal-700);
      font-weight: 600;
    }

    .account-section__register,
    .account-section__retry {
      min-height: 44px;
    }

    .account-section__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .account-section__payments-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      padding-top: var(--space-sm);
      border-top: 1px solid var(--color-border);
    }

    .account-section__subtitle {
      margin: 0;
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--blue-950);
    }
  `,
})
export class PatientAccountSectionComponent {
  readonly account = input<PatientAccount | null>(null);
  readonly payments = input<PaymentListItem[]>([]);
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly canRegister = input<boolean>(false);
  readonly formOpen = input<boolean>(false);
  readonly saving = input<boolean>(false);
  readonly saveError = input<string | null>(null);
  readonly defaultEncounterId = input<string | null>(null);
  readonly lastPayment = input<Payment | null>(null);
  readonly canVoid = input<boolean>(false);
  readonly printing = input<boolean>(false);
  readonly voiding = input<boolean>(false);
  readonly pendingReceiptUrl = input<string | null>(null);
  readonly pendingReceiptPaymentId = input<string | null>(null);
  readonly paymentActionError = input<string | null>(null);

  readonly retry = output<void>();
  readonly openForm = output<void>();
  readonly closeForm = output<void>();
  readonly submitPayment = output<CreatePaymentRequest>();
  readonly printReceipt = output<string | void>();
  readonly openPendingReceipt = output<MouseEvent>();
  readonly voidPayment = output<Payment | PaymentListItem>();

  readonly balanceOf = balanceStatus;
}

