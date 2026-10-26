import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { activePresetsCount, formatPresetsCount } from '../../domain/medication-display';
import { Medication } from '../../models/prescription.models';

/**
 * Tabla de medicamentos. En pantallas estrechas (< sm) se transforma en tarjetas.
 * Presentacional.
 */
@Component({
  selector: 'bd-medication-table',
  standalone: true,
  imports: [StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table class="table-cards medication-table" aria-label="Catálogo de medicamentos">
      <thead>
        <tr>
          <th scope="col">Medicamento</th>
          <th scope="col">Vía</th>
          <th scope="col">Posologías</th>
          <th scope="col">Estado</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        @for (medication of medications(); track medication.id) {
          <tr [class.medication-table__row--inactive]="!medication.active">
            <td data-label="Medicamento" class="medication-table__cell-identity">
              <div class="medication-table__identity">
                <strong class="medication-table__name">{{ medication.name }}</strong>
                <span class="medication-table__subtitle">
                  {{ medication.concentration }} · {{ medication.presentation }}
                </span>
              </div>
            </td>
            <td data-label="Vía">{{ medication.route || '—' }}</td>
            <td data-label="Posologías">
              {{ formatPresets(medication) }}
            </td>
            <td data-label="Estado">
              @if (medication.active) {
                <bd-status-badge tone="attended" label="Activo" />
              } @else {
                <bd-status-badge tone="cancelled" label="Inactivo" />
              }
            </td>
            <td data-label="Acciones">
              <div class="medication-table__actions">
                <button
                  type="button"
                  class="btn btn-ghost medication-table__action"
                  [disabled]="busyId() !== null"
                  [attr.aria-label]="'Posologías de ' + medication.name"
                  (click)="managePresets.emit(medication)"
                >
                  Posologías
                </button>
                <button
                  type="button"
                  class="btn btn-ghost medication-table__action"
                  [disabled]="busyId() !== null"
                  [attr.aria-label]="'Editar ' + medication.name"
                  (click)="edit.emit(medication)"
                >
                  Editar
                </button>
                @if (medication.active) {
                  <button
                    type="button"
                    class="btn btn-outline medication-table__action"
                    [disabled]="busyId() !== null"
                    [attr.aria-busy]="busyId() === medication.id"
                    [attr.aria-label]="'Desactivar ' + medication.name"
                    (click)="deactivate.emit(medication)"
                  >
                    {{ busyId() === medication.id ? 'Guardando…' : 'Desactivar' }}
                  </button>
                } @else {
                  <button
                    type="button"
                    class="btn btn-outline medication-table__action"
                    [disabled]="busyId() !== null"
                    [attr.aria-busy]="busyId() === medication.id"
                    [attr.aria-label]="'Activar ' + medication.name"
                    (click)="activate.emit(medication)"
                  >
                    {{ busyId() === medication.id ? 'Guardando…' : 'Activar' }}
                  </button>
                }
              </div>
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    :host {
      display: block;
      container-type: inline-size;
      min-width: 0;
      overflow-x: auto;
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

    .medication-table__identity {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .medication-table__name {
      font-weight: 600;
      color: var(--blue-950);
    }

    .medication-table__subtitle {
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
    }

    .medication-table__row--inactive td {
      color: var(--color-text-muted);
    }

    .medication-table__row--inactive .medication-table__name {
      color: var(--color-text);
      font-weight: 500;
    }

    .medication-table__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
    }

    .medication-table__action {
      min-height: 44px;
      white-space: nowrap;
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

      .table-cards td.medication-table__cell-identity {
        display: block;
        padding-bottom: var(--space-xs);
        border-bottom: 1px solid var(--slate-100);
      }

      .table-cards td::before {
        content: attr(data-label);
        font-size: var(--fs-xs);
        font-weight: 600;
        color: var(--color-text-muted);
      }

      .table-cards td.medication-table__cell-identity::before {
        content: none;
      }

      .medication-table__actions {
        width: 100%;
        margin-top: var(--space-xs);
        padding-top: var(--space-xs);
        border-top: 1px solid var(--slate-100);
        justify-content: flex-end;
      }
    }
  `,
})
export class MedicationTableComponent {
  readonly medications = input.required<Medication[]>();
  readonly busyId = input<number | null>(null);

  readonly managePresets = output<Medication>();
  readonly edit = output<Medication>();
  readonly deactivate = output<Medication>();
  readonly activate = output<Medication>();

  formatPresets(medication: Medication): string {
    return formatPresetsCount(activePresetsCount(medication));
  }
}
