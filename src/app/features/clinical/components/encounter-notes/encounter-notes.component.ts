import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SaveStatus } from '../../services/encounter.store';

@Component({
  selector: 'bd-encounter-notes',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="encounter-notes" aria-label="Notas de la atención">
      <div class="encounter-notes__grid">
        <!-- Campo Motivo de consulta -->
        <div class="encounter-notes__field">
          <div class="encounter-notes__label-bar">
            <label for="chief-complaint-input" class="encounter-notes__label">
              Motivo de consulta <span class="required-mark" aria-hidden="true">*</span>
            </label>
            <div class="encounter-notes__save-status" aria-live="polite">
              @switch (saveStatus()) {
                @case ('saving') {
                  <span class="status-text status-text--saving">Guardando…</span>
                }
                @case ('saved') {
                  <span class="status-text status-text--saved">✓ Guardado</span>
                }
                @case ('error') {
                  <span class="status-text status-text--error">
                    No se guardó: {{ saveErrorMessage() }} ·
                    <button type="button" class="btn-link" (click)="retrySave.emit()">
                      Reintentar
                    </button>
                  </span>
                }
              }
            </div>
          </div>

          @if (isReadOnly()) {
            <p class="encounter-notes__readonly-text">{{ chiefComplaint() }}</p>
          } @else {
            <input
              id="chief-complaint-input"
              type="text"
              class="input encounter-notes__input"
              [ngModel]="chiefComplaint()"
              (ngModelChange)="chiefComplaintChange.emit($event)"
              [attr.aria-invalid]="!chiefComplaint().trim()"
              placeholder="Motivo de la consulta"
              required
            />
            @if (!chiefComplaint().trim()) {
              <span class="field-error" role="alert">El motivo es obligatorio</span>
            }
          }
        </div>

        <!-- Campo Enfermedad actual -->
        <div class="encounter-notes__field">
          <label for="current-illness-input" class="encounter-notes__label">
            Enfermedad actual (opcional)
          </label>

          @if (isReadOnly()) {
            <p class="encounter-notes__readonly-text">
              {{ currentIllness() || 'No registrada' }}
            </p>
          } @else {
            <input
              id="current-illness-input"
              type="text"
              class="input encounter-notes__input"
              [ngModel]="currentIllness()"
              (ngModelChange)="currentIllnessChange.emit($event)"
              placeholder="Evolución y estado actual"
            />
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .encounter-notes {
      container-type: inline-size;
      background-color: var(--white);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
      padding: var(--space-md);
    }

    .encounter-notes__grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-md);

      @container (min-width: 680px) {
        grid-template-columns: 1fr 1fr;
      }
    }

    .encounter-notes__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2xs);
    }

    .encounter-notes__label-bar {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-xs);
    }

    .encounter-notes__label {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-700);
    }

    .required-mark {
      color: var(--coral-600);
    }

    .encounter-notes__save-status {
      font-size: var(--fs-xs);
      font-weight: 500;
    }

    .status-text--saving {
      color: var(--slate-500);
    }

    .status-text--saved {
      color: var(--teal-700);
      font-weight: 600;
    }

    .status-text--error {
      color: var(--coral-700);
      font-weight: 600;
    }

    .btn-link {
      background: none;
      border: none;
      padding: 0;
      color: var(--coral-800);
      text-decoration: underline;
      cursor: pointer;
      font-size: inherit;
      font-weight: inherit;
    }

    .encounter-notes__readonly-text {
      margin: 0;
      padding: 0.5rem 0;
      font-size: var(--fs-sm);
      color: var(--slate-900);
      line-height: var(--lh-normal);
    }

    .field-error {
      font-size: var(--fs-xs);
      color: var(--coral-700);
      font-weight: 500;
    }
  `,
})
export class EncounterNotesComponent {
  readonly chiefComplaint = input.required<string>();
  readonly currentIllness = input.required<string>();
  readonly isReadOnly = input<boolean>(false);
  readonly saveStatus = input<SaveStatus>('idle');
  readonly saveErrorMessage = input<string | null>(null);

  readonly chiefComplaintChange = output<string>();
  readonly currentIllnessChange = output<string>();
  readonly retrySave = output<void>();
}
