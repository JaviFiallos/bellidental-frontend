import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ProfessionalDetail } from '../../../professionals';
import { colorNameOrHex } from '../../domain/professional-colors';

@Component({
  selector: 'bd-professional-table',
  standalone: true,
  imports: [StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table class="table-cards professional-table" aria-label="Profesionales de la clínica">
      <thead>
        <tr>
          <th scope="col">Color</th>
          <th scope="col">Nombre</th>
          <th scope="col">Licencia</th>
          <th scope="col">Especialidades</th>
          <th scope="col">Cuenta</th>
          <th scope="col">Estado</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        @for (prof of professionals(); track prof.id) {
          <tr>
            <td data-label="Color">
              <span class="professional-table__color">
                <span
                  class="professional-table__dot"
                  [style.background-color]="prof.colorTag || 'var(--slate-500)'"
                  aria-hidden="true"
                ></span>
                <span class="professional-table__color-name">{{ colorLabel(prof.colorTag) }}</span>
              </span>
            </td>
            <td data-label="Nombre" class="professional-table__name">{{ prof.fullName }}</td>
            <td data-label="Licencia">{{ prof.licenseNumber }}</td>
            <td data-label="Especialidades">{{ specialtyNames(prof) }}</td>
            <td data-label="Cuenta">
              <span
                class="professional-table__account-badge"
                [class.has-account]="!!prof.userId"
              >
                {{ prof.userId ? 'Con cuenta' : 'Sin cuenta' }}
              </span>
            </td>
            <td data-label="Estado">
              @if (prof.active) {
                <bd-status-badge tone="attended" label="Activo" />
              } @else {
                <bd-status-badge tone="cancelled" label="Inactivo" />
              }
            </td>
            <td data-label="Acciones">
              <button
                type="button"
                class="btn btn-ghost professional-table__action"
                [attr.aria-label]="'Editar a ' + prof.fullName"
                (click)="edit.emit(prof)"
              >
                Editar
              </button>
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

    .professional-table__color {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .professional-table__dot {
      width: 0.875rem;
      height: 0.875rem;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--blue-950) 15%, transparent);
    }

    .professional-table__color-name {
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
    }

    .professional-table__name {
      font-weight: 600;
      color: var(--blue-950);
    }

    .professional-table__account-badge {
      display: inline-block;
      font-size: var(--fs-xs);
      color: var(--color-text-muted);

      &.has-account {
        color: var(--color-primary);
        font-weight: 500;
      }
    }

    .professional-table__action {
      min-height: 44px;
      white-space: nowrap;
    }

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
        background-color: var(--white);
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
    }
  `,
})
export class ProfessionalTableComponent {
  readonly professionals = input.required<ProfessionalDetail[]>();
  readonly edit = output<ProfessionalDetail>();

  colorLabel(hex: string | null): string {
    return colorNameOrHex(hex);
  }

  specialtyNames(prof: ProfessionalDetail): string {
    return prof.specialties.map((s) => s.name).join(', ') || '—';
  }
}
