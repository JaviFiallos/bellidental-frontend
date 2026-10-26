import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { AccountSession } from '../../models/billing.models';

/** Tabla del estado de cuenta. En contenedores estrechos cada fila pasa a tarjeta. */
@Component({
  selector: 'bd-account-table',
  standalone: true,
  imports: [ClinicDatePipe, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table class="table-cards account-table" aria-label="Estado de cuenta">
      <thead>
        <tr>
          <th scope="col">Fecha</th>
          <th scope="col">Tratamientos</th>
          <th scope="col">Profesional</th>
          <th scope="col" class="account-table__num">Cargo</th>
          <th scope="col" class="account-table__num">Abono</th>
          <th scope="col" class="account-table__num">Saldo</th>
        </tr>
      </thead>
      <tbody>
        @for (session of sessions(); track session.encounterId ?? 'sin-atencion') {
          <tr>
            <td data-label="Fecha">{{ session.date | clinicDate }}</td>
            <td data-label="Tratamientos">
              {{ session.encounterId === null ? 'Abonos sin atención' : session.treatments.join(', ') }}
            </td>
            <td data-label="Profesional">{{ session.professionalName ?? '—' }}</td>
            <td data-label="Cargo" class="account-table__num">
              {{ session.charge > 0 ? (session.charge | money) : '—' }}
            </td>
            <td data-label="Abono" class="account-table__num">
              {{ session.payment > 0 ? (session.payment | money) : '—' }}
            </td>
            <td data-label="Saldo" class="account-table__num">
              @if (session.runningBalance < 0) {
                {{ -session.runningBalance | money }} a favor
              } @else {
                {{ session.runningBalance | money }}
              }
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
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

    .account-table__num {
      text-align: end;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    /* Menos de 600 px del contenedor: cada fila es una tarjeta con etiquetas */
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
      }

      .table-cards td {
        display: flex;
        justify-content: space-between;
        gap: var(--space-sm);
        border-bottom: none;
        padding: var(--space-xs) 0;
      }

      .table-cards td::before {
        content: attr(data-label);
        font-size: var(--fs-xs);
        font-weight: 600;
        color: var(--color-text-muted);
      }

      .account-table__num {
        text-align: end;
      }
    }
  `,
})
export class AccountTableComponent {
  readonly sessions = input.required<AccountSession[]>();
}
