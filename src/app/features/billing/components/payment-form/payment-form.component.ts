import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { SegmentedComponent, SegmentedOption } from '../../../../shared/components/segmented/segmented.component';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { formatAmountInput, parseAmount, PAYMENT_METHOD_LABELS } from '../../domain/account-display';
import { AccountSession, CreatePaymentRequest, PaymentMethod } from '../../models/billing.models';

const AMOUNT_ERROR_MESSAGE = 'Ingresa un monto mayor que 0 (hasta 2 decimales).';

const METHOD_OPTIONS: SegmentedOption<PaymentMethod>[] = [
  { value: 'EFECTIVO', label: PAYMENT_METHOD_LABELS.EFECTIVO },
  { value: 'TRANSFERENCIA', label: PAYMENT_METHOD_LABELS.TRANSFERENCIA },
  { value: 'TARJETA', label: PAYMENT_METHOD_LABELS.TARJETA },
];

/** Formulario en línea "Registrar abono". Presentacional: sale con `submitted` y `cancelled`. */
@Component({
  selector: 'bd-payment-form',
  standalone: true,
  imports: [ReactiveFormsModule, AlertComponent, SegmentedComponent, ClinicDatePipe, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="payment-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="payment-form__row">
        <div class="payment-form__field">
          <label class="payment-form__label" for="payment-amount">Monto</label>
          <div class="payment-form__amount">
            <span class="payment-form__currency" aria-hidden="true">$</span>
            <input
              #amountInput
              id="payment-amount"
              class="input"
              type="text"
              inputmode="decimal"
              formControlName="amount"
              [attr.aria-invalid]="amountError() !== null"
              [attr.aria-describedby]="amountError() ? 'payment-amount-error' : null"
              (input)="amountError.set(null)"
            />
          </div>
          @if (amountError(); as message) {
            <p id="payment-amount-error" class="payment-form__error" role="alert">{{ message }}</p>
          } @else if (overpayment(); as excess) {
            <p class="payment-form__hint">Quedará un saldo a favor de {{ excess | money }}.</p>
          }
        </div>

        <div class="payment-form__field">
          <span class="payment-form__label">Método</span>
          <bd-segmented
            label="Método de pago"
            [options]="methodOptions"
            [value]="methodValue()"
            (valueChange)="form.controls.method.setValue($event)"
          />
        </div>
      </div>

      <div class="payment-form__field">
        <label class="payment-form__label" for="payment-session">Sesión</label>
        <select id="payment-session" class="input" formControlName="encounterId">
          <option value="">Sin sesión (abono general)</option>
          @for (session of encounterSessions(); track session.encounterId) {
            <option [value]="session.encounterId">
              {{ session.date | clinicDate }} · {{ session.professionalName }} · {{ session.treatments.join(', ') }}
            </option>
          }
        </select>
      </div>

      @if (errorMessage(); as message) {
        <bd-alert variant="error" [message]="message" />
      }

      <div class="payment-form__actions">
        <button type="submit" class="btn btn-accent payment-form__btn" [disabled]="saving()">
          {{ saving() ? 'Guardando…' : 'Guardar abono' }}
        </button>
        <button type="button" class="btn btn-ghost payment-form__btn" (click)="cancelled.emit()">Cancelar</button>
      </div>
    </form>
  `,
  styles: `
    .payment-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      background-color: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: var(--space-md);
      box-sizing: border-box;
    }

    .payment-form__row,
    .payment-form__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      min-width: 0;
    }

    .payment-form__label {
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--color-text);
    }

    .payment-form__amount {
      position: relative;
      display: flex;
      align-items: center;
    }

    .payment-form__amount .input {
      padding-inline-start: 2rem;
    }

    .payment-form__currency {
      position: absolute;
      inset-inline-start: var(--space-md);
      color: var(--color-text-muted);
      pointer-events: none;
    }

    .payment-form__hint {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .payment-form__error {
      margin: 0;
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--color-danger);
    }

    .payment-form__actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .payment-form__btn {
      min-height: 44px;
      width: 100%;
    }

    /* El contenedor de la sección tiene al menos 37.5 rem: monto y método en una fila */
    @container (min-width: 37.5rem) {
      .payment-form__row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
        gap: var(--space-md);
      }

      .payment-form__actions {
        flex-direction: row;
        justify-content: flex-end;
      }

      .payment-form__btn {
        width: auto;
      }
    }
  `,
})
export class PaymentFormComponent implements OnInit, AfterViewInit {
  readonly balance = input.required<number>();
  readonly sessions = input.required<AccountSession[]>();
  readonly defaultEncounterId = input<string | null>(null);
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<CreatePaymentRequest>();
  readonly cancelled = output<void>();

  private readonly amountInput = viewChild.required<ElementRef<HTMLInputElement>>('amountInput');

  readonly form = inject(FormBuilder).nonNullable.group({
    amount: '',
    method: 'EFECTIVO' as PaymentMethod,
    encounterId: '',
  });

  readonly methodOptions = METHOD_OPTIONS;
  readonly amountError = signal<string | null>(null);

  private readonly amountText = toSignal(this.form.controls.amount.valueChanges, {
    initialValue: '',
  });
  readonly methodValue = toSignal(this.form.controls.method.valueChanges, {
    initialValue: this.form.controls.method.value,
  });

  readonly encounterSessions = computed(() =>
    this.sessions().filter((session) => session.encounterId !== null).slice().reverse()
  );

  /** Cuánto quedará a favor si el monto supera el saldo; null si no supera. */
  readonly overpayment = computed<number | null>(() => {
    const amount = parseAmount(this.amountText());
    if (amount === null) return null;
    const excess = Math.round((amount - this.balance()) * 100) / 100;
    return excess > 0 ? excess : null;
  });

  ngOnInit(): void {
    this.form.patchValue({
      amount: this.balance() > 0 ? formatAmountInput(this.balance()) : '',
      encounterId: this.defaultEncounterId() ?? '',
    });
  }

  ngAfterViewInit(): void {
    this.amountInput().nativeElement.focus();
  }

  submit(): void {
    const amount = parseAmount(this.form.controls.amount.value);
    if (amount === null) {
      this.amountError.set(AMOUNT_ERROR_MESSAGE);
      return;
    }

    const { method, encounterId } = this.form.getRawValue();
    const request: CreatePaymentRequest = encounterId
      ? { amount, method, encounterId }
      : { amount, method };
    this.submitted.emit(request);
  }
}
