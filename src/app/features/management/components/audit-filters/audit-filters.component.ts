import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { AUDIT_ENTITY_LABELS } from '../../domain/audit-display';
import { AuditEntityName } from '../../models/audit.models';
import { User } from '../../models/user.models';

export interface AuditFiltersValues {
  entity: AuditEntityName | '';
  userId: string;
}

@Component({
  selector: 'bd-audit-filters',
  standalone: true,
  imports: [FormsModule, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="audit-filters">
      <div class="audit-filters__row">
        <div class="audit-filters__field">
          <bd-field label="Tipo de registro" fieldId="audit-filter-entity">
            <select
              id="audit-filter-entity"
              class="input"
              [ngModel]="entity()"
              (ngModelChange)="onEntityChange($event)"
            >
              <option value="">Todos los tipos</option>
              @for (opt of entityOptions; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </bd-field>
        </div>

        <div class="audit-filters__field">
          <bd-field label="Usuario" fieldId="audit-filter-user">
            <select
              id="audit-filter-user"
              class="input"
              [ngModel]="userId()"
              (ngModelChange)="onUserChange($event)"
            >
              <option value="">Todos los usuarios</option>
              @for (u of users(); track u.id) {
                <option [value]="u.id">{{ u.username }}</option>
              }
            </select>
          </bd-field>
        </div>
      </div>

      @if (patientId()) {
        <div class="audit-filters__patient-bar">
          <span class="audit-filters__chip">
            Paciente: <strong>{{ patientName() || patientId() }}</strong>
            <button
              type="button"
              class="audit-filters__chip-remove"
              aria-label="Quitar filtro de paciente"
              (click)="clearPatient.emit()"
            >
              ✕
            </button>
          </span>
        </div>
      }
    </div>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .audit-filters {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .audit-filters__row {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);

      @include bp.bp-up(md) {
        flex-direction: row;
        flex-wrap: wrap;
        align-items: flex-end;
      }
    }

    .audit-filters__field {
      width: 100%;

      @include bp.bp-up(md) {
        width: auto;
        min-width: 14rem;
      }
    }

    .audit-filters__patient-bar {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .audit-filters__chip {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      padding: 0.25rem 0.625rem;
      font-size: var(--fs-xs);
      color: var(--blue-900);
      background-color: var(--blue-50);
      border: 1px solid var(--blue-200);
      border-radius: var(--radius-lg);
    }

    .audit-filters__chip-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      margin: -0.625rem -0.5rem -0.625rem -0.25rem;
      padding: 0;
      font-size: 0.75rem;
      color: var(--blue-800);
      background: transparent;
      border: none;
      border-radius: 50%;
      cursor: pointer;
    }

    .audit-filters__chip-remove:hover {
      background-color: var(--blue-200);
    }
  `,
})
export class AuditFiltersComponent {
  readonly entity = input<AuditEntityName | ''>('');
  readonly userId = input<string>('');
  readonly patientId = input<string | null>(null);
  readonly patientName = input<string | null>(null);
  readonly users = input<User[]>([]);

  readonly filtersChange = output<AuditFiltersValues>();
  readonly clearPatient = output<void>();

  readonly entityOptions = Object.entries(AUDIT_ENTITY_LABELS).map(([value, label]) => ({
    value: value as AuditEntityName,
    label,
  }));

  onEntityChange(entity: AuditEntityName | ''): void {
    this.filtersChange.emit({ entity, userId: this.userId() });
  }

  onUserChange(userId: string): void {
    this.filtersChange.emit({ entity: this.entity(), userId });
  }
}
