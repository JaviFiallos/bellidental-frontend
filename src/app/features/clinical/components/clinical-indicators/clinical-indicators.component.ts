import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  SegmentedComponent,
  SegmentedOption,
} from '../../../../shared/components/segmented/segmented.component';
import { Encounter } from '../../models/encounter.models';
import { EncounterIndicatorField } from '../../domain/encounter-completeness';

interface IndicatorDefinition {
  field: EncounterIndicatorField;
  label: string;
  options: SegmentedOption<string | null>[];
}

const SEVERITY_OPTIONS: SegmentedOption<string | null>[] = [
  { value: null, label: 'Ninguna' },
  { value: 'LEVE', label: 'Leve' },
  { value: 'MODERADA', label: 'Moderada' },
  { value: 'SEVERA', label: 'Severa' },
];

const MALOCCLUSION_LABELS: Record<string, string> = {
  ANGLE_I: 'Angle I',
  ANGLE_II: 'Angle II',
  ANGLE_III: 'Angle III',
};

@Component({
  selector: 'bd-clinical-indicators',
  standalone: true,
  imports: [SegmentedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="indicators">
      @for (definition of definitions; track definition.field) {
        <div class="indicators__field">
          <span class="indicators__label" [id]="'indicator-' + definition.field">
            {{ definition.label }}
          </span>

          @if (isReadOnly()) {
            <p class="indicators__readonly">{{ displayValue(definition.field) }}</p>
          } @else {
            <bd-segmented
              [options]="definition.options"
              [value]="values()[definition.field] ?? null"
              (valueChange)="onValueChange(definition.field, $event)"
              [label]="definition.label"
            />
          }
        </div>
      }
    </div>
  `,
  styles: `
    .indicators {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .indicators__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .indicators__label {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-600);
    }

    .indicators__readonly {
      margin: 0;
      padding: 0.5rem 0;
      font-size: var(--fs-sm);
      color: var(--slate-800);
    }
  `,
})
export class ClinicalIndicatorsComponent {
  readonly values = input.required<Pick<Encounter, EncounterIndicatorField>>();
  readonly isReadOnly = input<boolean>(false);
  readonly indicatorChange = output<{ field: EncounterIndicatorField; value: string | null }>();

  readonly definitions: readonly IndicatorDefinition[] = [
    {
      field: 'periodontalDisease',
      label: 'Enfermedad periodontal',
      options: SEVERITY_OPTIONS,
    },
    { field: 'fluorosis', label: 'Fluorosis', options: SEVERITY_OPTIONS },
    {
      field: 'malocclusion',
      label: 'Maloclusión',
      options: [
        { value: null, label: 'Ninguna' },
        { value: 'ANGLE_I', label: 'Angle I' },
        { value: 'ANGLE_II', label: 'Angle II' },
        { value: 'ANGLE_III', label: 'Angle III' },
      ],
    },
  ];

  displayValue(field: EncounterIndicatorField): string {
    const value = this.values()[field];
    if (!value) return 'Ninguna';
    if (field === 'malocclusion') return MALOCCLUSION_LABELS[value] ?? value;
    return SEVERITY_OPTIONS.find((option) => option.value === value)?.label ?? value;
  }

  onValueChange(field: EncounterIndicatorField, value: string | null): void {
    if (value === (this.values()[field] ?? null)) return;
    this.indicatorChange.emit({ field, value });
  }
}
