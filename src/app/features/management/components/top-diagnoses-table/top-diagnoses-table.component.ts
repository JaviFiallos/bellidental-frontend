import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { TopDiagnosis } from '../../models/dashboard.models';

/** Diagnósticos más registrados del período (Top 3). */
@Component({
  selector: 'bd-top-diagnoses-table',
  standalone: true,
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rows().length > 0) {
      <table class="table-cards stats-table" aria-label="Diagnósticos más frecuentes">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Código</th>
            <th scope="col">Diagnóstico</th>
            <th scope="col" class="stats-table__num">Veces</th>
            <th scope="col" class="stats-table__num">Pacientes</th>
          </tr>
        </thead>
        <tbody>
          @for (item of rows(); track item.code; let index = $index) {
            <tr>
              <td data-label="#" class="stats-table__rank">{{ index + 1 }}</td>
              <td data-label="Código">
                <span class="stats-table__code-pill">{{ item.code }}</span>
              </td>
              <td data-label="Diagnóstico">{{ item.description }}</td>
              <td data-label="Veces" class="stats-table__num">{{ item.occurrences }}</td>
              <td data-label="Pacientes" class="stats-table__num">{{ item.patients }}</td>
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <bd-empty-state title="Sin diagnósticos en el período" />
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

    .stats-table__code-pill {
      display: inline-block;
      font-weight: 600;
      font-size: var(--fs-xs);
      color: var(--blue-950);
      background-color: var(--slate-100);
      padding: 2px 6px;
      border-radius: var(--radius-xs);
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
      }

      .stats-table__rank {
        width: auto;
      }
    }
  `,
})
export class TopDiagnosesTableComponent {
  readonly rows = input.required<TopDiagnosis[]>();
}
