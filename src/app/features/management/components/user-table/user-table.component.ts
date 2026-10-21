import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import {
  describeRoles,
  describeUnmanageable,
  isManageableUser,
} from '../../domain/user-display';
import { Professional } from '../../../professionals';
import { User } from '../../models/user.models';

/** Tabla de cuentas. En contenedores estrechos cada fila pasa a tarjeta. Presentacional. */
@Component({
  selector: 'bd-user-table',
  standalone: true,
  imports: [ClinicDatePipe, ClinicTimePipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table class="table-cards user-table" aria-label="Cuentas de usuario">
      <thead>
        <tr>
          <th scope="col">Usuario</th>
          <th scope="col">Rol</th>
          <th scope="col">Profesional</th>
          <th scope="col">Estado</th>
          <th scope="col">Último acceso</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        @for (user of users(); track user.id) {
          <tr>
            <td data-label="Usuario" class="user-table__identity">
              <span class="user-table__username">{{ user.username }}</span>
              <span class="user-table__email">{{ user.email }}</span>
            </td>
            <td data-label="Rol">{{ describeRoles(user) }}</td>
            <td data-label="Profesional">{{ professionalsByUserId().get(user.id)?.fullName ?? '—' }}</td>
            <td data-label="Estado">
              @if (user.active) {
                <bd-status-badge tone="attended" label="Activo" />
              } @else {
                <bd-status-badge tone="cancelled" label="Inactivo" />
              }
            </td>
            <td data-label="Último acceso">
              @if (user.lastLoginAt) {
                {{ user.lastLoginAt | clinicDate }} · {{ user.lastLoginAt | clinicTime }}
              } @else {
                Nunca
              }
            </td>
            <td data-label="Acciones">
              @if (isManageable(user)) {
                @if (user.active) {
                  <button
                    type="button"
                    class="btn btn-outline user-table__action"
                    [disabled]="busyUserId() !== null"
                    [attr.aria-busy]="busyUserId() === user.id"
                    [attr.aria-label]="'Desactivar a ' + user.username"
                    (click)="deactivate.emit(user)"
                  >
                    {{ busyUserId() === user.id ? 'Guardando…' : 'Desactivar' }}
                  </button>
                } @else {
                  <button
                    type="button"
                    class="btn btn-outline user-table__action"
                    [disabled]="busyUserId() !== null"
                    [attr.aria-busy]="busyUserId() === user.id"
                    [attr.aria-label]="'Activar a ' + user.username"
                    (click)="activate.emit(user)"
                  >
                    {{ busyUserId() === user.id ? 'Guardando…' : 'Activar' }}
                  </button>
                }
              } @else {
                <span class="user-table__muted">{{ describeUnmanageable(user) }}</span>
              }
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

    .user-table__username {
      display: block;
      font-weight: 600;
      color: var(--blue-950);
    }

    .user-table__email {
      display: block;
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
    }

    .user-table__action {
      min-height: 44px;
      white-space: nowrap;
    }

    .user-table__muted {
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
        align-items: center;
        gap: var(--space-sm);
        border-bottom: none;
        padding: var(--space-xs) 0;
      }

      .table-cards td.user-table__identity {
        display: block;
      }

      .table-cards td::before {
        content: attr(data-label);
        font-size: var(--fs-xs);
        font-weight: 600;
        color: var(--color-text-muted);
      }

      .table-cards td.user-table__identity::before {
        content: none;
      }
    }
  `,
})
export class UserTableComponent {
  readonly users = input.required<User[]>();
  readonly professionalsByUserId = input.required<ReadonlyMap<string, Professional>>();
  readonly busyUserId = input<string | null>(null);

  readonly deactivate = output<User>();
  readonly activate = output<User>();

  readonly describeRoles = describeRoles;
  readonly describeUnmanageable = describeUnmanageable;
  readonly isManageable = isManageableUser;
}
