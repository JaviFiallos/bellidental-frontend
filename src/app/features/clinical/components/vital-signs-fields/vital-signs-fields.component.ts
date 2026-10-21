import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Encounter } from '../../models/encounter.models';
import { VITAL_SIGN_RULES, VitalSignField, vitalSignError } from '../../domain/encounter-completeness';

interface VitalSignDefinition {
  field: VitalSignField;
  label: string;
  unit: string;
  step: string;
}

@Component({
  selector: 'bd-vital-signs-fields',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vital-signs">
      @for (definition of definitions; track definition.field) {
        <div class="vital-signs__field">
          <label class="vital-signs__label" [attr.for]="'vital-' + definition.field">
            {{ definition.label }}
          </label>

          @if (isReadOnly()) {
            <p class="vital-signs__readonly">
              {{ displayValue(definition.field) }} <span class="vital-signs__unit">{{ definition.unit }}</span>
            </p>
          } @else {
            <div class="vital-signs__input-row">
              <input
                [id]="'vital-' + definition.field"
                type="number"
                class="input vital-signs__input"
                [step]="definition.step"
                [ngModel]="values()[definition.field]"
                (ngModelChange)="onValueChange(definition.field, $event)"
                [attr.aria-invalid]="errors()[definition.field] ? 'true' : null"
                [attr.aria-describedby]="'vital-' + definition.field + '-help'"
              />
              <span class="vital-signs__unit">{{ definition.unit }}</span>
            </div>
            <span
              [id]="'vital-' + definition.field + '-help'"
              class="vital-signs__help"
              [class.vital-signs__help--error]="errors()[definition.field]"
              [attr.role]="errors()[definition.field] ? 'alert' : null"
            >
              {{ errors()[definition.field] ?? rangeHelp(definition.field) }}
            </span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .vital-signs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
      gap: var(--space-md);
    }

    .vital-signs__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      min-width: 0;
    }

    .vital-signs__label {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-600);
    }

    .vital-signs__input-row {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .vital-signs__input {
      min-height: 44px;
      width: 100%;
      min-width: 0;
    }

    .vital-signs__unit {
      font-size: var(--fs-xs);
      color: var(--slate-500);
      white-space: nowrap;
    }

    .vital-signs__readonly {
      margin: 0;
      padding: 0.5rem 0;
      font-size: var(--fs-sm);
      color: var(--slate-800);
    }

    .vital-signs__help {
      font-size: var(--fs-xs);
      color: var(--slate-500);
    }

    .vital-signs__help--error {
      color: var(--coral-700);
      font-weight: 500;
    }
  `,
})
export class VitalSignsFieldsComponent {
  readonly values = input.required<Pick<Encounter, VitalSignField>>();
  readonly isReadOnly = input<boolean>(false);
  readonly vitalSignChange = output<{ field: VitalSignField; value: number | null }>();

  readonly errors = signal<Partial<Record<VitalSignField, string>>>({});

  readonly definitions: readonly VitalSignDefinition[] = [
    { field: 'bpSystolic', label: 'PA sistólica', unit: 'mmHg', step: '1' },
    { field: 'bpDiastolic', label: 'PA diastólica', unit: 'mmHg', step: '1' },
    { field: 'heartRate', label: 'Frecuencia cardíaca', unit: 'lpm', step: '1' },
    { field: 'temperature', label: 'Temperatura', unit: '°C', step: '0.1' },
    { field: 'respiratoryRate', label: 'Frecuencia respiratoria', unit: 'rpm', step: '1' },
  ];

  rangeHelp(field: VitalSignField): string {
    const rule = VITAL_SIGN_RULES[field];
    return `Rango ${rule.min}–${rule.max}`;
  }

  displayValue(field: VitalSignField): string {
    const value = this.values()[field];
    return value === null || value === undefined ? 'No registrada' : String(value);
  }

  onValueChange(field: VitalSignField, value: number | null): void {
    const error = vitalSignError(field, value);
    this.errors.update((current) => ({ ...current, [field]: error ?? undefined }));
    // Un valor fuera de rango no se emite: el store conserva el último válido.
    if (error === null) {
      this.vitalSignChange.emit({ field, value });
    }
  }
}
