import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { ProfessionalStats } from '../../models/dashboard.models';

/** Atenciones completadas y producción (tratamientos registrados) por profesional. */
@Component({
  selector: 'bd-professional-stats-table',
  standalone: true,
  imports: [EmptyStateComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rows().length > 0) {
      <table class="table-cards stats-table" aria-label="Atenciones por profesional">
        <thead>
          <tr>
            <th scope="col">Profesional</th>
            <th scope="col" class="stats-table__num">Atenciones completadas</th>
            <th scope="col" class="stats-table__num">Producción</th>
          </tr>
        </thead>
        <tbody>
          @for (row of sortedRows(); track row.professionalId) {
            <tr>
              <td data-label="Profesional">{{ row.name }}</td>
              <td data-label="Atenciones completadas" class="stats-table__num">{{ row.encounters }}</td>
              <td data-label="Producción" class="stats-table__num">{{ row.revenue | money }}</td>
            </tr>
          }
        </tbody>
      </table>
      <p class="stats-table__note">La producción es lo registrado en tratamientos, no lo cobrado.</p>
    } @else {
      <bd-empty-state title="Sin atenciones completadas en el período" />
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

    .stats-table__note {
      margin: var(--space-sm) 0 0;
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
    }
  `,
})
export class ProfessionalStatsTableComponent {
  readonly rows = input.required<ProfessionalStats[]>();

  /** El backend no ordena `byProfessional`: más atenciones primero. */
  readonly sortedRows = computed(() =>
    [...this.rows()].sort((first, second) => second.encounters - first.encounters)
  );
}
