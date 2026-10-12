import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import {
  CreateHistoryEntryRequest,
  HistoryEntry,
  MedicalHistoryCondition,
} from '../../models/clinical-record.models';
import { HistoryConditionRowComponent } from '../history-condition-row/history-condition-row.component';

@Component({
  selector: 'bd-history-panel',
  standalone: true,
  imports: [
    FormsModule,
    AlertComponent,
    SkeletonComponent,
    HistoryConditionRowComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="history-panel">
      <!-- Encabezado del panel -->
      <header class="history-panel__header">
        <h2 id="history-panel-title" class="history-panel__title">
          Antecedentes de {{ patientName() || 'paciente' }}
        </h2>
      </header>

      <!-- Sección 1: Medicación actual -->
      <section class="history-panel__section" aria-labelledby="medication-label">
        <label id="medication-label" for="current-medication-input" class="history-panel__label">
          Medicación actual
        </label>
        <div class="medication-input-wrapper">
          <input
            #medicationInput
            id="current-medication-input"
            type="text"
            class="form-control history-panel__input"
            placeholder="Ninguna o nombre de medicamentos..."
            [ngModel]="currentMedication()"
            [disabled]="isReadOnly()"
            (blur)="onMedicationBlur($event)"
            (keydown.enter)="onMedicationEnter($event)"
          />
        </div>
        <div class="medication-status" aria-live="polite">
          @if (medicationStatus() === 'saving') {
            <span class="status-text status-text--saving">Guardando…</span>
          } @else if (medicationStatus() === 'saved') {
            <span class="status-text status-text--saved">✓ Guardado</span>
          } @else if (medicationStatus() === 'error') {
            <span class="status-text status-text--error">
              {{ medicationError() || 'Error al guardar' }}
            </span>
          }
        </div>
      </section>

      <!-- Sección 2: Estado 'El paciente no refiere antecedentes' -->
      <section class="history-panel__section history-panel__section--no-history" aria-label="Sin antecedentes">
        @if (noKnownHistory()) {
          <div class="no-history-active">
            <span class="no-history-badge">
              <span aria-hidden="true">✓</span> El paciente no refiere antecedentes
            </span>
            @if (!isReadOnly()) {
              <button
                type="button"
                class="btn-unmark-no-history"
                (click)="noKnownHistoryChange.emit(false)"
              >
                Desmarcar
              </button>
            }
          </div>
        } @else if (activeEntries().length === 0 && !isReadOnly()) {
          <button
            type="button"
            class="btn-mark-no-history"
            (click)="noKnownHistoryChange.emit(true)"
          >
            El paciente no refiere antecedentes
          </button>
        }

        @if (noKnownHistoryError()) {
          <div class="history-panel__error-alert" role="alert">
            <bd-alert variant="warning" [message]="noKnownHistoryError()!" />
          </div>
        }
      </section>

      <hr class="history-panel__divider" />

      <!-- Sección 3: Lista de 10 condiciones -->
      <section class="history-panel__section history-panel__conditions" aria-label="Condiciones clínicas">
        @if (conditionsLoading()) {
          <div class="conditions-skeleton" aria-busy="true">
            <bd-skeleton height="2.5rem" width="100%" />
            <bd-skeleton height="2.5rem" width="100%" />
            <bd-skeleton height="2.5rem" width="100%" />
            <bd-skeleton height="2.5rem" width="100%" />
          </div>
        } @else if (conditionsError()) {
          <div class="conditions-error">
            <bd-alert variant="error" [message]="conditionsError()!">
              <button
                type="button"
                class="btn-retry"
                (click)="retryConditions.emit()"
              >
                Reintentar
              </button>
            </bd-alert>
          </div>
        } @else {
          <div class="conditions-list">
            @for (cond of conditions(); track cond.id) {
              <bd-history-condition-row
                [condition]="cond"
                [entries]="getEntriesForCondition(cond.id)"
                [isReadOnly]="isReadOnly()"
                [errorMessage]="rowErrors()[cond.id] || null"
                [lastSuccessEntry]="lastSuccessEntry()"
                (addEntry)="addEntry.emit({ conditionId: cond.id, request: $event })"
                (voidEntry)="voidEntry.emit({ condition: cond, entry: $event })"
              />
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .history-panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
      box-sizing: border-box;
      color: var(--slate-800);
    }

    .history-panel__header {
      padding-bottom: var(--space-xs);
      border-bottom: 1px solid var(--slate-200);
    }

    .history-panel__title {
      font-size: var(--fs-md);
      font-weight: 700;
      color: var(--blue-950);
      margin: 0;
    }

    .history-panel__section {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .history-panel__label {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-600);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .medication-input-wrapper {
      width: 100%;
    }

    .history-panel__input {
      width: 100%;
      min-height: 44px;
      padding: 0.5rem 0.75rem;
      font-size: var(--fs-sm);
      border: 1px solid var(--slate-300);
      border-radius: var(--radius-sm);
      box-sizing: border-box;

      &:focus {
        border-color: var(--color-focus);
        outline: 2px solid var(--color-focus);
      }

      &:disabled {
        background-color: var(--slate-100);
        cursor: not-allowed;
      }
    }

    .medication-status {
      min-height: 1.25rem;
      font-size: var(--fs-xs);
    }

    .status-text--saving {
      color: var(--slate-500);
      font-style: italic;
    }

    .status-text--saved {
      color: var(--teal-700);
      font-weight: 600;
    }

    .status-text--error {
      color: var(--coral-700);
      font-weight: 600;
    }

    .history-panel__section--no-history {
      padding: var(--space-xs) 0;
    }

    .no-history-active {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      padding: var(--space-xs) var(--space-sm);
      background-color: var(--slate-100);
      border-radius: var(--radius-sm);
      border: 1px solid var(--slate-200);
    }

    .no-history-badge {
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--slate-600);
    }

    .btn-unmark-no-history {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 var(--space-sm);
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--coral-700);
      background: transparent;
      border: 1px solid color-mix(in srgb, var(--coral-500) 45%, var(--coral-100));
      border-radius: var(--radius-sm);
      cursor: pointer;

      &:hover {
        background-color: var(--coral-100);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
      }
    }

    .btn-mark-no-history {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      width: 100%;
      padding: 0 var(--space-md);
      font-size: var(--fs-xs);
      font-weight: 600;
      background-color: var(--slate-100);
      color: var(--slate-800);
      border: 1px dashed var(--slate-300);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background-color var(--transition-fast), border-color var(--transition-fast);


      &:hover {
        background-color: var(--slate-200);
        border-color: var(--slate-600);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
      }
    }

    .history-panel__error-alert {
      margin-top: var(--space-xs);
    }

    .history-panel__divider {
      border: 0;
      border-top: 1px solid var(--slate-200);
      margin: 0;
    }

    .history-panel__conditions {
      flex: 1;
    }

    .conditions-skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .conditions-list {
      display: flex;
      flex-direction: column;
    }

    .btn-retry {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 var(--space-md);
      margin-top: var(--space-xs);
      font-size: var(--fs-xs);
      font-weight: 600;
      background-color: var(--blue-900);
      color: var(--white);
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;

      &:hover {
        background-color: var(--blue-950);
      }
    }
  `,
})
export class HistoryPanelComponent {
  readonly patientName = input<string>('');
  readonly conditions = input<MedicalHistoryCondition[]>([]);
  readonly conditionsLoading = input<boolean>(false);
  readonly conditionsError = input<string | null>(null);
  readonly entries = input<HistoryEntry[]>([]);
  readonly currentMedication = input<string>('');
  readonly medicationStatus = input<string>('idle');
  readonly medicationError = input<string | null>(null);
  readonly noKnownHistory = input<boolean>(false);
  readonly noKnownHistoryError = input<string | null>(null);
  readonly isReadOnly = input<boolean>(false);
  readonly rowErrors = input<Record<number, string | null>>({});
  readonly lastSuccessEntry = input<HistoryEntry | null>(null);

  readonly addEntry = output<{ conditionId: number; request: CreateHistoryEntryRequest }>();
  readonly voidEntry = output<{ condition: MedicalHistoryCondition; entry: HistoryEntry }>();
  readonly medicationChange = output<string>();
  readonly noKnownHistoryChange = output<boolean>();
  readonly retryConditions = output<void>();

  readonly medicationInputRef = viewChild<ElementRef<HTMLInputElement>>('medicationInput');

  readonly activeEntries = computed<HistoryEntry[]>(() => {
    return this.entries().filter((e) => e.active);
  });

  getEntriesForCondition(conditionId: number): HistoryEntry[] {

    return this.entries().filter((e) => e.conditionId === conditionId);
  }

  onMedicationBlur(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.medicationChange.emit(val);
  }

  onMedicationEnter(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    inputEl.blur();
  }
}
