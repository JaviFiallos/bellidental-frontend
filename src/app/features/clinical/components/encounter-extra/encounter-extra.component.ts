import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { SaveStatus } from '../../services/encounter.store';
import { Encounter } from '../../models/encounter.models';
import {
  EncounterIndicatorField,
  EncounterTextField,
  VitalSignField,
} from '../../domain/encounter-completeness';
import { VitalSignsFieldsComponent } from '../vital-signs-fields/vital-signs-fields.component';
import { ClinicalIndicatorsComponent } from '../clinical-indicators/clinical-indicators.component';
import { EncounterPlansComponent } from '../encounter-plans/encounter-plans.component';

@Component({
  selector: 'bd-encounter-extra',
  standalone: true,
  imports: [VitalSignsFieldsComponent, ClinicalIndicatorsComponent, EncounterPlansComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="encounter-extra" aria-label="Más del 033">
      <button
        type="button"
        class="encounter-extra__toggle"
        aria-controls="encounter-extra-panel"
        [attr.aria-expanded]="expanded()"
        (click)="toggle()"
      >
        <span class="encounter-extra__title">Más del 033</span>
        <span
          class="encounter-extra__summary"
          [class.encounter-extra__summary--missing]="missingSections().length > 0"
        >
          {{ summary() }}
        </span>
        <span class="encounter-extra__chevron" aria-hidden="true">{{ expanded() ? '▴' : '▾' }}</span>
      </button>

      @if (expanded()) {
        <div id="encounter-extra-panel" class="encounter-extra__panel">
          @if (saveStatus() === 'error') {
            <div class="encounter-extra__error" role="alert">
              No se guardó: {{ saveErrorMessage() }} ·
              <button type="button" class="encounter-extra__retry" (click)="retrySave.emit()">
                Reintentar
              </button>
            </div>
          }

          <h3 class="encounter-extra__group-title">Signos vitales</h3>
          <bd-vital-signs-fields
            [values]="encounter()"
            [isReadOnly]="isReadOnly()"
            (vitalSignChange)="vitalSignChange.emit($event)"
          />

          <h3 class="encounter-extra__group-title">Examen e indicadores</h3>
          <bd-encounter-plans
            [values]="encounter()"
            [isReadOnly]="isReadOnly()"
            (textChange)="onTextChange($event)"
          />
          <bd-clinical-indicators
            [values]="encounter()"
            [isReadOnly]="isReadOnly()"
            (indicatorChange)="onIndicatorChange($event)"
          />
        </div>
      }
    </section>
  `,
  styles: `
    .encounter-extra {
      background-color: var(--white);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
      padding: var(--space-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .encounter-extra__toggle {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-xs) var(--space-sm);
      width: 100%;
      min-height: 44px;
      padding: 0;
      border: none;
      background: none;
      cursor: pointer;
      text-align: left;
      color: var(--blue-950);

      &:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: 2px;
        border-radius: var(--radius-sm);
      }
    }

    .encounter-extra__title {
      font-size: var(--fs-md);
      font-weight: 600;
    }

    .encounter-extra__summary {
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--teal-700);
    }

    .encounter-extra__summary--missing {
      color: var(--gold-700);
    }

    .encounter-extra__chevron {
      margin-left: auto;
      color: var(--slate-500);
    }

    .encounter-extra__panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding-top: var(--space-xs);
      border-top: 1px solid var(--slate-200);
    }

    .encounter-extra__group-title {
      margin: var(--space-xs) 0 0;
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--slate-800);
    }

    .encounter-extra__error {
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--coral-700);
    }

    .encounter-extra__retry {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0 var(--space-xs);
      border: none;
      background: none;
      color: var(--coral-700);
      text-decoration: underline;
      cursor: pointer;
      font-size: inherit;
      font-weight: inherit;

      &:focus-visible {
        outline: 2px solid var(--color-focus);
      }
    }
  `,
})
export class EncounterExtraComponent {
  readonly encounter = input.required<Encounter>();
  readonly missingSections = input<string[]>([]);
  readonly isReadOnly = input<boolean>(false);
  readonly saveStatus = input<SaveStatus>('idle');
  readonly saveErrorMessage = input<string | null>(null);

  readonly vitalSignChange = output<{ field: VitalSignField; value: number | null }>();
  readonly indicatorChange = output<{ field: EncounterIndicatorField; value: string | null }>();
  readonly textChange = output<{ field: EncounterTextField; value: string | null }>();
  readonly retrySave = output<void>();

  readonly expanded = signal<boolean>(false);

  summary(): string {
    const missing = this.missingSections();
    return missing.length === 0 ? 'Completo' : `Falta: ${missing.join(', ')}`;
  }

  toggle(): void {
    this.expanded.update((open) => !open);
  }

  onTextChange(event: { field: EncounterTextField; value: string | null }): void {
    this.textChange.emit(event);
  }

  onIndicatorChange(event: { field: EncounterIndicatorField; value: string | null }): void {
    this.indicatorChange.emit(event);
  }
}
