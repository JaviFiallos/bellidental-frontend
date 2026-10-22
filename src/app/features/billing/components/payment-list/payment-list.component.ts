import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Ban, Printer } from 'lucide-angular';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PAYMENT_METHOD_LABELS } from '../../domain/account-display';
import { PaymentListItem, PaymentMethod } from '../../models/billing.models';

/** Lista de todos los abonos del paciente. En contenedores estrechos (< sm) cada fila pasa a tarjeta. */
@Component({
  selector: 'bd-payment-list',
  standalone: true,
  imports: [ClinicDatePipe, MoneyPipe, IconComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (payments().length === 0) {
      <p class="payment-list__empty">Sin abonos</p>
    } @else {
      <table class="table-cards payment-list__table" aria-label="Lista de abonos">
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">N.° comprobante</th>
            <th scope="col">Método</th>
            <th scope="col">Recibió</th>
            <th scope="col" class="payment-list__num">Monto</th>
            <th scope="col" class="payment-list__actions-head">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (item of payments(); track item.id) {
            <tr [class.payment-list__row--voided]="item.voided">
              <td data-label="Fecha">{{ item.paidAt | clinicDate }}</td>
              <td data-label="N.° comprobante">
                <span class="payment-list__receipt">{{ item.receiptNumber }}</span>
              </td>
              <td data-label="Método">{{ methodLabel(item.method) }}</td>
              <td data-label="Recibió">{{ item.receivedByName ?? '—' }}</td>
              <td data-label="Monto" class="payment-list__num">
                @if (item.voided) {
                  <div class="payment-list__voided-cell">
                    <span class="payment-list__amount-voided">{{ item.amount | money }}</span>
                    <div class="payment-list__voided-info">
                      <bd-status-badge [tone]="'cancelled'" [label]="'Anulado'" />
                      @if (item.voidReason) {
                        <span class="payment-list__void-reason">{{ item.voidReason }}</span>
                      }
                    </div>
                  </div>
                } @else {
                  <span>{{ item.amount | money }}</span>
                }
              </td>
              <td data-label="Acciones" class="payment-list__actions-cell">
                <div class="payment-list__actions">
                  @if (pendingReceiptPaymentId() === item.id) {
                    <button
                      type="button"
                      class="btn btn-primary payment-list__btn"
                      [disabled]="voiding()"
                      [attr.aria-label]="'Abrir PDF comprobante ' + item.receiptNumber"
                      (click)="openPendingReceipt.emit()"
                    >
                      Abrir PDF
                    </button>
                  } @else {
                    <button
                      type="button"
                      class="btn btn-outline payment-list__btn"
                      [disabled]="printing() || voiding()"
                      [attr.aria-label]="'Reimprimir comprobante ' + item.receiptNumber"
                      (click)="printReceipt.emit(item.id)"
                    >
                      <bd-icon [name]="printerIcon" [size]="16" />
                      <span>Reimprimir comprobante</span>
                    </button>
                  }

                  @if (canVoid() && !item.voided) {
                    <button
                      type="button"
                      class="btn btn-outline payment-list__btn payment-list__btn--void"
                      [disabled]="voiding() || printing()"
                      [attr.aria-label]="'Anular comprobante ' + item.receiptNumber"
                      (click)="voidPayment.emit(item)"
                    >
                      <bd-icon [name]="banIcon" [size]="16" />
                      <span>Anular</span>
                    </button>
                  }
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: `
    :host {
      display: block;
      container-type: inline-size;
    }

    .payment-list__empty {
      margin: var(--space-sm) 0;
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .table-cards {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--fs-sm);
    }

    .table-cards th,
    .table-cards td {
      text-align: start;
      padding: var(--space-sm);
      border-bottom: 1px solid var(--color-border);
      vertical-align: middle;
    }

    .table-cards th {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--color-text-muted);
    }

    .payment-list__num {
      text-align: end;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .payment-list__receipt {
      font-weight: 600;
      color: var(--blue-950);
    }

    .payment-list__actions-head {
      text-align: end;
    }

    .payment-list__actions-cell {
      text-align: end;
    }

    .payment-list__actions {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: var(--space-xs);
    }

    .payment-list__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-xs);
      min-height: 44px;
      padding: 0 var(--space-sm);
      font-size: var(--fs-xs);
      box-sizing: border-box;
      white-space: nowrap;
    }

    .payment-list__voided-cell {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: var(--space-xs);
    }

    .payment-list__amount-voided {
      text-decoration: line-through;
      color: var(--color-text-muted);
    }

    .payment-list__voided-info {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .payment-list__void-reason {
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
      max-width: 16rem;
      text-align: end;
      overflow-wrap: anywhere;
    }

    /* Menos de 600 px del contenedor: cada fila es una tarjeta */
    @container (max-width: 37.49rem) {
      .table-cards thead {
        display: none;
      }

      .table-cards,
      .table-cards tbody,
      .table-cards tr,
      .table-cards td {
        display: block;
        width: 100%;
      }

      .table-cards tr {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: var(--space-xs) var(--space-sm);
        margin-bottom: var(--space-sm);
        box-sizing: border-box;
      }

      .table-cards td {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-sm);
        border-bottom: none;
        padding: var(--space-xs) 0;
      }

      .table-cards td::before {
        content: attr(data-label);
        font-size: var(--fs-xs);
        font-weight: 600;
        color: var(--color-text-muted);
        flex-shrink: 0;
      }

      .payment-list__num {
        text-align: end;
      }

      .payment-list__actions-cell {
        justify-content: flex-end;
        padding-top: var(--space-xs);
        border-top: 1px dashed var(--color-border);
      }

      .payment-list__actions-cell::before {
        display: none;
      }

      .payment-list__actions {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--space-xs);
      }

      .payment-list__btn {
        flex: 1 1 auto;
        width: auto;
      }
    }
  `,
})
export class PaymentListComponent {
  readonly payments = input.required<PaymentListItem[]>();
  readonly canVoid = input<boolean>(false);
  readonly printing = input<boolean>(false);
  readonly voiding = input<boolean>(false);
  readonly pendingReceiptPaymentId = input<string | null>(null);

  readonly printReceipt = output<string>();
  readonly openPendingReceipt = output<void>();
  readonly voidPayment = output<PaymentListItem>();

  readonly printerIcon = Printer;
  readonly banIcon = Ban;

  methodLabel(method: PaymentMethod): string {
    return PAYMENT_METHOD_LABELS[method] ?? method;
  }
}
