import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { treatmentSpecialtyLabel } from '../../domain/catalog-display';
import { CatalogTreatment } from '../../models/catalog.models';

/** Tabla de tratamientos. En contenedores estrechos cada fila pasa a tarjeta. Presentacional. */
@Component({
  selector: 'bd-treatment-table',
  standalone: true,
  imports: [MoneyPipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table class="table-cards catalog-table" aria-label="Tratamientos">
      <thead>
        <tr>
          <th scope="col">Código</th>
          <th scope="col">Nombre</th>
          <th scope="col">Especialidad</th>
          <th scope="col">Precio</th>
          <th scope="col">Estado</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        @for (treatment of treatments(); track treatment.id) {
          <tr [class.catalog-table__row--inactive]="!treatment.active">
            <td data-label="Código" class="catalog-table__identity catalog-table__code">{{ treatment.code }}</td>
            <td data-label="Nombre" class="catalog-table__identity catalog-table__name">{{ treatment.name }}</td>
            <td data-label="Especialidad">{{ specialtyLabel(treatment) }}</td>
            <td data-label="Precio" class="catalog-table__price">{{ treatment.basePrice | money }}</td>
            <td data-label="Estado">
              @if (treatment.active) {
                <bd-status-badge tone="attended" label="Activo" />
              } @else {
                <bd-status-badge tone="cancelled" label="Inactivo" />
              }
            </td>
            <td data-label="Acciones">
              <div class="catalog-table__actions">
                <button
                  type="button"
                  class="btn btn-ghost catalog-table__action"
                  [disabled]="busyId() !== null"
                  [attr.aria-label]="'Editar ' + treatment.code"
                  (click)="edit.emit(treatment)"
                >
                  Editar
                </button>
                @if (treatment.active) {
                  <button
                    type="button"
                    class="btn btn-outline catalog-table__action"
                    [disabled]="busyId() !== null"
                    [attr.aria-busy]="busyId() === treatment.id"
                    [attr.aria-label]="'Desactivar ' + treatment.code"
                    (click)="deactivate.emit(treatment)"
                  >
                    {{ busyId() === treatment.id ? 'Guardando…' : 'Desactivar' }}
                  </button>
                } @else {
                  <button
                    type="button"
                    class="btn btn-outline catalog-table__action"
                    [disabled]="busyId() !== null"
                    [attr.aria-busy]="busyId() === treatment.id"
                    [attr.aria-label]="'Activar ' + treatment.code"
                    (click)="activate.emit(treatment)"
                  >
                    {{ busyId() === treatment.id ? 'Guardando…' : 'Activar' }}
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

    .catalog-table__identity {
      font-weight: 600;
      color: var(--blue-950);
    }

    .catalog-table__code {
      white-space: nowrap;
    }

    .catalog-table__price {
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .catalog-table__row--inactive td {
      color: var(--color-text-muted);
    }

    .catalog-table__row--inactive .catalog-table__identity {
      font-weight: 500;
    }

    .catalog-table__action {
      min-height: 44px;
      white-space: nowrap;
    }

    .catalog-table__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
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

      .table-cards td.catalog-table__identity {
        display: block;
      }

      .table-cards td::before {
        content: attr(data-label);
        font-size: var(--fs-xs);
        font-weight: 600;
        color: var(--color-text-muted);
      }

      .table-cards td.catalog-table__identity::before {
        content: none;
      }

      .table-cards td.catalog-table__price {
        justify-content: space-between;
      }
    }
  `,
})
export class TreatmentTableComponent {
  readonly treatments = input.required<CatalogTreatment[]>();
  readonly specialtyNames = input.required<ReadonlyMap<number, string>>();
  readonly busyId = input<number | null>(null);

  readonly edit = output<CatalogTreatment>();
  readonly deactivate = output<CatalogTreatment>();
  readonly activate = output<CatalogTreatment>();

  specialtyLabel(treatment: CatalogTreatment): string {
    return treatmentSpecialtyLabel(treatment, this.specialtyNames());
  }
}
