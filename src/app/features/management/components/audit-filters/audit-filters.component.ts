import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AUDIT_ENTITY_LABELS } from '../../domain/audit-display';
import { AuditEntityName } from '../../models/audit.models';
import { User } from '../../models/user.models';

export interface AuditFiltersValues {
  from: string;
  to: string;
  entity: AuditEntityName | '';
  userId: string;
}

@Component({
  selector: 'bd-audit-filters',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="audit-filters">
      <div class="audit-filters__row">
        <div class="audit-filters__field">
          <label for="audit-filter-from" class="audit-filters__label">Desde</label>
          <input
            id="audit-filter-from"
            type="date"
            class="form-input audit-filters__input"
            [ngModel]="from()"
            (ngModelChange)="onFromChange($event)"
          />
        </div>

        <div class="audit-filters__field">
          <label for="audit-filter-to" class="audit-filters__label">Hasta</label>
          <input
            id="audit-filter-to"
            type="date"
            class="form-input audit-filters__input"
            [ngModel]="to()"
            (ngModelChange)="onToChange($event)"
          />
        </div>

        <div class="audit-filters__field">
          <label for="audit-filter-entity" class="audit-filters__label">Tipo de registro</label>
          <select
            id="audit-filter-entity"
            class="form-select audit-filters__select"
            [ngModel]="entity()"
            (ngModelChange)="onEntityChange($event)"
          >
            <option value="">Todos los tipos</option>
            @for (opt of entityOptions; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </div>

        <div class="audit-filters__field">
          <label for="audit-filter-user" class="audit-filters__label">Usuario</label>
          <select
            id="audit-filter-user"
            class="form-select audit-filters__select"
            [ngModel]="userId()"
            (ngModelChange)="onUserChange($event)"
          >
            <option value="">Todos los usuarios</option>
            @for (u of users(); track u.id) {
              <option [value]="u.id">{{ u.username }}</option>
            }
          </select>
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
    .audit-filters {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      padding: var(--space-md);
      background-color: var(--white);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
    }

    .audit-filters__row {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-sm);
    }

    @media (min-width: 640px) {
      .audit-filters__row {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 1024px) {
      .audit-filters__row {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .audit-filters__field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .audit-filters__label {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-700);
    }

    .audit-filters__input,
    .audit-filters__select {
      width: 100%;
      min-height: 40px;
    }

    .audit-filters__patient-bar {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      padding-top: var(--space-xs);
      border-top: 1px solid var(--slate-100);
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
      border-radius: var(--radius-full, 9999px);
    }

    .audit-filters__chip-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
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
  readonly from = input.required<string>();
  readonly to = input.required<string>();
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

  onFromChange(from: string): void {
    this.emitChange({ from, to: this.to(), entity: this.entity(), userId: this.userId() });
  }

  onToChange(to: string): void {
    this.emitChange({ from: this.from(), to, entity: this.entity(), userId: this.userId() });
  }

  onEntityChange(entity: AuditEntityName | ''): void {
    this.emitChange({ from: this.from(), to: this.to(), entity, userId: this.userId() });
  }

  onUserChange(userId: string): void {
    this.emitChange({ from: this.from(), to: this.to(), entity: this.entity(), userId });
  }

  private emitChange(values: AuditFiltersValues): void {
    this.filtersChange.emit(values);
  }
}
