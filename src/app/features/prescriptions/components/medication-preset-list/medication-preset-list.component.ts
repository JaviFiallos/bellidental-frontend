import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { Medication, MedicationPreset } from '../../models/prescription.models';

/**
 * Lista presentacional de posologías predefinidas de un medicamento.
 */
@Component({
  selector: 'bd-medication-preset-list',
  standalone: true,
  imports: [EmptyStateComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="preset-list">
      <div class="preset-list__header">
        <div class="preset-list__toolbar">
          @if (!medication().active) {
            <p class="preset-list__disabled-hint">
              Activa el medicamento para agregar posologías.
            </p>
          }
          <button
            type="button"
            class="btn btn-accent"
            [disabled]="!medication().active"
            (click)="newPreset.emit()"
          >
            Nueva posología
          </button>
        </div>
      </div>

      @if (medication().presets.length === 0) {
        <bd-empty-state
          title="Todavía no hay posologías"
          description="Crea la primera con «Nueva posología»."
        />
      } @else {
        <ul class="preset-list__items" aria-label="Posologías del medicamento">
          @for (preset of medication().presets; track preset.id) {
            <li class="preset-item" [class.preset-item--inactive]="!preset.active">
              <div class="preset-item__content">
                <div class="preset-item__top">
                  <strong class="preset-item__label">{{ preset.label }}</strong>
                  @if (preset.active) {
                    <bd-status-badge tone="attended" label="Activa" />
                  } @else {
                    <bd-status-badge tone="cancelled" label="Inactiva" />
                  }
                </div>

                <div class="preset-item__posology">
                  {{ preset.dose }} · {{ preset.frequency }} · {{ preset.duration }}
                </div>

                @if (preset.instructions) {
                  <p class="preset-item__instructions">{{ preset.instructions }}</p>
                }
              </div>

              <div class="preset-item__actions">
                <button
                  type="button"
                  class="btn btn-ghost preset-item__action"
                  [disabled]="busyId() !== null"
                  [attr.aria-label]="'Editar ' + preset.label"
                  (click)="editPreset.emit(preset)"
                >
                  Editar
                </button>
                @if (preset.active) {
                  <button
                    type="button"
                    class="btn btn-outline preset-item__action"
                    [disabled]="busyId() !== null"
                    [attr.aria-busy]="busyId() === preset.id"
                    [attr.aria-label]="'Desactivar ' + preset.label"
                    (click)="deactivatePreset.emit(preset)"
                  >
                    {{ busyId() === preset.id ? 'Guardando…' : 'Desactivar' }}
                  </button>
                } @else {
                  <button
                    type="button"
                    class="btn btn-outline preset-item__action"
                    [disabled]="busyId() !== null"
                    [attr.aria-busy]="busyId() === preset.id"
                    [attr.aria-label]="'Activar ' + preset.label"
                    (click)="activatePreset.emit(preset)"
                  >
                    {{ busyId() === preset.id ? 'Guardando…' : 'Activar' }}
                  </button>
                }
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .preset-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
      box-sizing: border-box;
    }

    .preset-list__header {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .preset-list__toolbar {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      align-items: flex-start;
    }

    .preset-list__toolbar .btn {
      min-height: 44px;
    }

    .preset-list__disabled-hint {
      margin: 0;
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
    }

    .preset-list__items {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .preset-item {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background-color: var(--color-surface);
    }

    .preset-item--inactive {
      opacity: 0.7;
    }

    .preset-item__top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-sm);
    }

    .preset-item__label {
      font-size: var(--fs-sm);
      color: var(--blue-950);
    }

    .preset-item__posology {
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
      margin-top: var(--space-xs);
    }

    .preset-item__instructions {
      margin: var(--space-xs) 0 0;
      font-size: var(--fs-xs);
      color: var(--color-text);
      font-style: italic;
    }

    .preset-item__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
      justify-content: flex-end;
      border-top: 1px solid var(--slate-100);
      padding-top: var(--space-xs);
    }

    .preset-item__action {
      min-height: 44px;
      white-space: nowrap;
    }
  `,
})
export class MedicationPresetListComponent {
  readonly medication = input.required<Medication>();
  readonly busyId = input<number | null>(null);

  readonly newPreset = output<void>();
  readonly editPreset = output<MedicationPreset>();
  readonly deactivatePreset = output<MedicationPreset>();
  readonly activatePreset = output<MedicationPreset>();
}
