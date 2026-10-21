import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { TopTreatment } from '../../models/dashboard.models';

/** Tratamientos más registrados del período. */
@Component({
  selector: 'bd-top-treatments-table',
  standalone: true,
  imports: [EmptyStateComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rows().length > 0) {
      <table class="table-cards stats-table" aria-label="Tratamientos más registrados">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Tratamiento</th>
            <th scope="col" class="stats-table__num">Cantidad</th>
            <th scope="col" class="stats-table__num">Monto</th>
          </tr>
        </thead>
        <tbody>
          @for (treatment of rows(); track treatment.code; let index = $index) {
            <tr>
              <td data-label="#" class="stats-table__rank">{{ index + 1 }}</td>
              <td data-label="Tratamiento">
                <span>
                  {{ treatment.name }}
                  <span class="stats-table__code">{{ treatment.code }}</span>
                </span>
              </td>
              <td data-label="Cantidad" class="stats-table__num">{{ treatment.quantity }}</td>
              <td data-label="Monto" class="stats-table__num">{{ treatment.amount | money }}</td>
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <bd-empty-state title="Sin tratamientos en el período" />
    }
  `,
  styles: `
    :host {
      display: block;
      container-type: inline-size;
      min-width: 0;
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
      overflow-wrap: anywhere;
    }

    .table-cards th {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--color-text-muted);
    }

    .stats-table__num {
      text-align: end;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .stats-table__rank {
      width: 2.5rem;
      color: var(--color-text-muted);
    }

    .stats-table__code {
      display: block;
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
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

      .stats-table__rank {
        width: auto;
      }
    }
  `,
})
export class TopTreatmentsTableComponent {
  readonly rows = input.required<TopTreatment[]>();
}
