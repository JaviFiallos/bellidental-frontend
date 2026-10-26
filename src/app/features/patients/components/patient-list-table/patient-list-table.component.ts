import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PatientListFilters, PatientListItem, PatientListView } from '../../models/patient.models';

@Component({
  selector: 'bd-patient-list-table',
  standalone: true,
  imports: [
    AlertComponent,
    ClinicDatePipe,
    EmptyStateComponent,
    MoneyPipe,
    RouterLink,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="patient-list-table-container">
      @if (loading()) {
        <div class="patient-list-table__skeleton" aria-busy="true">
          <bd-skeleton height="3.25rem" width="100%" />
          <bd-skeleton height="3.25rem" width="100%" />
          <bd-skeleton height="3.25rem" width="100%" />
          <bd-skeleton height="3.25rem" width="100%" />
          <bd-skeleton height="3.25rem" width="100%" />
        </div>
      } @else if (error(); as err) {
        <div class="patient-list-table__alert">
          <bd-alert variant="error" [message]="err" />
          <button type="button" class="btn btn-outline" (click)="retry.emit()">
            Reintentar
          </button>
        </div>
      } @else if (items().length === 0) {
        <bd-empty-state
          [title]="emptyTitle()"
          [description]="emptyDescription()"
        >
          @if (hasActiveFilters()) {
            <button
              type="button"
              class="btn btn-outline btn-sm"
              (click)="clearFilters.emit()"
            >
              Quitar filtros
            </button>
          }
        </bd-empty-state>
      } @else {
        <div class="patient-list-table__wrapper">
          <table class="table-cards patient-list-table" aria-label="Lista de pacientes">
            <thead>
              <tr>
                <th scope="col">Nombres</th>
                <th scope="col">Apellidos</th>
                <th scope="col">Cédula</th>
                <th scope="col">Edad</th>
                <th scope="col">
                  {{ view() === 'CREATED' ? 'Registrado' : 'Última atención' }}
                </th>
                @if (canViewBalance()) {
                  <th scope="col" class="patient-list-table__th-balance">Saldo pendiente</th>
                }
                @if (canView033()) {
                  <th scope="col">Formulario 033</th>
                }
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (patient of items(); track patient.id) {
                <tr class="patient-list-table__row">
                  <td data-label="Nombres" class="patient-list-table__cell-first-name">
                    {{ patient.firstName }}
                  </td>
                  <td data-label="Apellidos" class="patient-list-table__cell-last-name">
                    {{ patient.lastName }}
                  </td>
                  <td data-label="Cédula" class="patient-list-table__cell-doc">
                    {{ formatDocument(patient) }}
                  </td>
                  <td data-label="Edad" class="patient-list-table__cell-age">
                    {{ formatAge(patient.age) }}
                  </td>
                  <td
                    [attr.data-label]="view() === 'CREATED' ? 'Registrado' : 'Última atención'"
                    class="patient-list-table__cell-date"
                  >
                    @if (displayDate(patient); as dateVal) {
                      {{ dateVal | clinicDate }}
                    } @else {
                      —
                    }
                  </td>
                  @if (canViewBalance()) {
                    <td data-label="Saldo pendiente" class="patient-list-table__cell-balance">
                      @if (patient.pendingBalance !== null && patient.pendingBalance > 0) {
                        <span class="patient-list-table__balance patient-list-table__balance--due">
                          Debe {{ patient.pendingBalance | money }}
                        </span>
                      } @else if (patient.pendingBalance !== null && patient.pendingBalance < 0) {
                        <span class="patient-list-table__balance patient-list-table__balance--credit">
                          A favor {{ -patient.pendingBalance | money }}
                        </span>
                      } @else if (patient.pendingBalance !== null && patient.pendingBalance <= 0) {
                        <span class="patient-list-table__balance patient-list-table__balance--settled">
                          Al día
                        </span>
                      } @else {
                        <span class="patient-list-table__balance">—</span>
                      }
                    </td>
                  }
                  @if (canView033()) {
                    <td data-label="Formulario 033" class="patient-list-table__cell-033">
                      @if (patient.lastEncounterAt) {
                        <a
                          [routerLink]="['/pacientes', patient.id, '033']"
                          class="btn btn-outline btn-sm patient-list-table__btn"
                        >
                          Ver 033
                        </a>
                      } @else {
                        <span class="patient-list-table__disabled-text" aria-disabled="true">
                          Sin atenciones
                        </span>
                      }
                    </td>
                  }
                  <td data-label="Acciones" class="patient-list-table__cell-actions">
                    <a
                      [routerLink]="['/pacientes', patient.id]"
                      class="btn btn-ghost btn-sm patient-list-table__btn"
                    >
                      Ver más
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (totalPages() > 1 || totalElements() > 0) {
          <footer class="patient-list-table__footer">
            <nav class="patient-list-table__pagination" aria-label="Paginación de pacientes">
              <button
                type="button"
                class="btn btn-outline btn-sm patient-list-table__page-btn"
                [disabled]="page() <= 0"
                (click)="pageChange.emit(page() - 1)"
              >
                Anterior
              </button>

              <span class="patient-list-table__page-info">
                Página {{ page() + 1 }} de {{ totalPages() || 1 }}
              </span>

              <button
                type="button"
                class="btn btn-outline btn-sm patient-list-table__page-btn"
                [disabled]="page() + 1 >= totalPages()"
                (click)="pageChange.emit(page() + 1)"
              >
                Siguiente
              </button>
            </nav>

            <p class="patient-list-table__total">
              {{ totalElements() }} {{ totalElements() === 1 ? 'paciente' : 'pacientes' }}
            </p>
          </footer>
        }
      }
    </div>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .patient-list-table-container {
      container-type: inline-size;
      width: 100%;
      min-width: 0;
    }

    .patient-list-table__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .patient-list-table__alert {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      align-items: flex-start;
    }

    .patient-list-table__wrapper {
      width: 100%;
      overflow-x: auto;
      max-height: calc(100vh - 16rem);
      position: relative;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background-color: var(--white);
    }

    .patient-list-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--fs-sm);
      text-align: start;
    }

    .patient-list-table th {
      position: sticky;
      top: 0;
      background-color: var(--slate-50);
      z-index: 1;
      padding: var(--space-sm) var(--space-md);
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
      white-space: nowrap;
    }

    .patient-list-table td {
      padding: var(--space-sm) var(--space-md);
      border-bottom: 1px solid var(--slate-100);
      vertical-align: middle;
      color: var(--color-text);
    }

    .patient-list-table tr:hover td {
      background-color: var(--slate-50);
    }

    .patient-list-table__btn {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      white-space: nowrap;
    }

    .patient-list-table__disabled-text {
      color: var(--color-text-muted);
      font-size: var(--fs-xs);
      font-style: italic;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }

    .patient-list-table__balance {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-sm);
      font-weight: 500;
      white-space: nowrap;
    }

    .patient-list-table__balance--due {
      color: var(--coral-700);
      background-color: color-mix(in srgb, var(--coral-500) 12%, transparent);
      font-weight: 600;
    }

    .patient-list-table__balance--credit {
      color: var(--teal-700);
      background-color: color-mix(in srgb, var(--teal-500) 12%, transparent);
    }

    .patient-list-table__balance--settled {
      color: var(--slate-700);
      background-color: var(--slate-100);
    }

    .patient-list-table__footer {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      align-items: center;
      margin-top: var(--space-md);
      padding: var(--space-xs) 0;
    }

    .patient-list-table__pagination {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .patient-list-table__page-btn {
      min-height: 44px;
    }

    .patient-list-table__page-info {
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .patient-list-table__total {
      margin: 0;
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
    }

    @container (max-width: 37.49rem) {
      .patient-list-table__wrapper {
        border: none;
        background: transparent;
        max-height: none;
        overflow: visible;
      }

      .table-cards thead {
        display: none;
      }

      .table-cards,
      .table-cards tbody,
      .table-cards tr,
      .table-cards td {
        display: block;
        width: 100%;
        box-sizing: border-box;
      }

      .table-cards tr {
        background: var(--white);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: var(--space-md);
        margin-bottom: var(--space-md);
      }

      .table-cards td {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-2xs) 0;
        border-bottom: none;
      }

      .table-cards td::before {
        content: attr(data-label);
        font-size: var(--fs-xs);
        font-weight: 600;
        color: var(--color-text-muted);
      }

      .table-cards td.patient-list-table__cell-first-name {
        font-size: var(--fs-md);
        font-weight: 700;
        color: var(--blue-950);
        padding-bottom: 0;
      }

      .table-cards td.patient-list-table__cell-first-name::before {
        content: none;
      }

      .table-cards td.patient-list-table__cell-last-name {
        font-size: var(--fs-md);
        font-weight: 700;
        color: var(--blue-950);
        padding-top: 0;
        border-bottom: 1px solid var(--slate-100);
        padding-bottom: var(--space-xs);
        margin-bottom: var(--space-xs);
      }

      .table-cards td.patient-list-table__cell-last-name::before {
        content: none;
      }

      .table-cards td.patient-list-table__cell-033,
      .table-cards td.patient-list-table__cell-actions {
        display: flex;
        justify-content: stretch;
        padding-top: var(--space-xs);
      }

      .table-cards td.patient-list-table__cell-033::before,
      .table-cards td.patient-list-table__cell-actions::before {
        content: none;
      }

      .table-cards td.patient-list-table__cell-033 .btn,
      .table-cards td.patient-list-table__cell-actions .btn {
        width: 100%;
      }
    }
  `,
})
export class PatientListTableComponent {
  readonly items = input.required<PatientListItem[]>();
  readonly view = input.required<PatientListView>();
  readonly canViewBalance = input<boolean>(false);
  readonly canView033 = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly page = input<number>(0);
  readonly totalPages = input<number>(0);
  readonly totalElements = input<number>(0);
  readonly hasActiveFilters = input<boolean>(false);

  readonly pageChange = output<number>();
  readonly retry = output<void>();
  readonly clearFilters = output<void>();

  readonly emptyTitle = computed(() => {
    return this.view() === 'CREATED'
      ? 'Ningún paciente registrado en este período.'
      : 'Ningún paciente atendido en este período.';
  });

  readonly emptyDescription = computed(() => {
    if (this.hasActiveFilters()) {
      return 'Intenta ajustar o quitar los filtros de búsqueda o saldo para ver más resultados.';
    }
    return null;
  });

  formatDocument(patient: PatientListItem): string {
    if (patient.documentType === 'PASAPORTE') {
      return `Pasaporte ${patient.documentNumber}`;
    }
    if (patient.documentType === 'RUC') {
      return `RUC ${patient.documentNumber}`;
    }
    return patient.documentNumber;
  }

  formatAge(age: number | null): string {
    return age !== null && age !== undefined ? `${age} años` : '—';
  }

  displayDate(patient: PatientListItem): string | null {
    return this.view() === 'CREATED' ? patient.createdAt : patient.lastEncounterAt;
  }
}
