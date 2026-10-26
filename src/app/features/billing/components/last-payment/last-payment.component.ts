import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Ban, Printer } from 'lucide-angular';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PAYMENT_METHOD_LABELS } from '../../domain/account-display';
import { Payment } from '../../models/billing.models';

/** Franja "Abono registrado" con el comprobante. Presentacional: las acciones salen por output(). */
@Component({
  selector: 'bd-last-payment',
  standalone: true,
  imports: [AlertComponent, IconComponent, StatusBadgeComponent, MoneyPipe, ClinicTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="last-payment">
      <div class="last-payment__info" role="status">
        @if (payment().voided) {
          <div class="last-payment__voided">
            <bd-status-badge [tone]="'cancelled'" [label]="'Anulado'" />
            <span class="last-payment__reason">Motivo: {{ payment().voidReason }}</span>
          </div>
        }
        <p class="last-payment__text">
          Abono registrado ·
          <strong>{{ payment().receiptNumber }}</strong> ·
          {{ payment().amount | money }} ·
          {{ methodLabel() }} ·
          {{ payment().paidAt | clinicTime }}
        </p>
      </div>

      <div class="last-payment__actions">
        @if (pendingReceiptUrl(); as url) {
          <a
            class="btn btn-primary last-payment__button"
            [href]="url"
            target="_blank"
            rel="noopener"
            (click)="openPending.emit($event)"
          >
            Abrir PDF
          </a>
        } @else {
          <button
            type="button"
            class="btn btn-primary last-payment__button"
            [disabled]="printing() || voiding()"
            (click)="print.emit()"
          >
            <bd-icon [name]="printerIcon" [size]="18" />
            <span>{{ printing() ? 'Abriendo…' : 'Imprimir comprobante' }}</span>
          </button>
        }

        @if (canVoid() && !payment().voided) {
          <button
            type="button"
            class="btn btn-outline last-payment__button"
            [disabled]="voiding() || printing()"
            (click)="voidPayment.emit(payment())"
          >
            <bd-icon [name]="banIcon" [size]="18" />
            <span>{{ voiding() ? 'Anulando…' : 'Anular' }}</span>
          </button>
        }
      </div>

      @if (errorMessage()) {
        <div class="last-payment__error">
          <bd-alert variant="error" [message]="errorMessage()" />
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      container-type: inline-size;
    }

    .last-payment {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      background-color: color-mix(in srgb, var(--teal-700) 8%, var(--color-surface));
      border: 1px solid color-mix(in srgb, var(--teal-700) 35%, transparent);
      border-radius: var(--radius-md);
      padding: var(--space-md);
      box-sizing: border-box;
    }

    .last-payment__info {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      min-width: 0;
    }

    .last-payment__voided {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-xs);
    }

    .last-payment__reason,
    .last-payment__text {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text);
      overflow-wrap: anywhere;
    }

    .last-payment__actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .last-payment__button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-xs);
      min-height: 44px;
      width: 100%;
      padding: 0 var(--space-md);
      box-sizing: border-box;
    }

    @container (min-width: 37.5rem) {
      .last-payment {
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
      }

      .last-payment__actions {
        flex-direction: row;
        flex-shrink: 0;
      }

      .last-payment__button {
        width: auto;
      }

      .last-payment__error {
        flex-basis: 100%;
      }
    }
  `,
})
export class LastPaymentComponent {
  readonly payment = input.required<Payment>();
  readonly canVoid = input<boolean>(false);
  readonly printing = input<boolean>(false);
  readonly voiding = input<boolean>(false);
  /** Enlace del comprobante pendiente (pestaña bloqueada): se muestra como "Abrir PDF". */
  readonly pendingReceiptUrl = input<string | null>(null);
  readonly errorMessage = input<string | null>(null);

  readonly print = output<void>();
  readonly openPending = output<MouseEvent>();
  readonly voidPayment = output<Payment>();

  readonly printerIcon = Printer;
  readonly banIcon = Ban;
  readonly methodLabel = computed(() => PAYMENT_METHOD_LABELS[this.payment().method]);
}
