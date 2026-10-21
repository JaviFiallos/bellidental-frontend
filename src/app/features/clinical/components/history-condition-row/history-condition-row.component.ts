import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  effect,
} from '@angular/core';
import {
  CreateHistoryEntryRequest,
  HistoryEntry,
  MedicalHistoryCondition,
} from '../../models/clinical-record.models';
import { HistoryEntryFormComponent } from '../history-entry-form/history-entry-form.component';

@Component({
  selector: 'bd-history-condition-row',
  standalone: true,
  imports: [HistoryEntryFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="condition-row" [class.condition-row--has-error]="!!errorMessage()">
      <div class="condition-row__header">
        <span class="condition-row__title">{{ condition().name }}</span>
      </div>

      <!-- Chips de entradas activas -->
      @if (activeEntries().length > 0) {
        <div class="condition-row__chips">
          @for (entry of activeEntries(); track entry.id) {
            <span class="condition-chip">
              <span class="condition-chip__label">{{ formatEntryLabel(entry) }}</span>
              @if (!isReadOnly()) {
                <button
                  type="button"
                  class="condition-chip__void-btn"
                  [attr.aria-label]="voidAriaLabel(entry)"
                  (click)="onVoidClick(entry)"
                >
                  ✕
                </button>
              }
            </span>
          }
        </div>
      }

      <!-- Acciones de alta (solo si no es readOnly) -->
      @if (!isReadOnly()) {
        <div class="condition-row__actions">
          <!-- Botón + Personal: solo si no hay personal activa (o si es "Otro") -->
          @if (!hasPersonalActive() || isOtherCondition()) {
            @if (isOtherCondition()) {
              <button
                type="button"
                class="btn-row-action"
                (click)="openForm('PERSONAL')"
              >
                + Personal
              </button>
            } @else {
              <button
                type="button"
                class="btn-row-action"
                (click)="addPersonalDirect()"
              >
                + Personal
              </button>
            }
          }

          <!-- Botón + Familiar -->
          <button
            type="button"
            class="btn-row-action"
            (click)="openForm('FAMILY')"
          >
            + Familiar
          </button>
        </div>

        <!-- Formulario en línea desplegable -->
        @if (showForm()) {
          <bd-history-entry-form
            [conditionId]="condition().id"
            [scope]="formScope()"
            [isOtherCondition]="isOtherCondition()"
            (submitRequest)="onSubmitForm($event)"
            (cancel)="closeForm()"
          />
        }
      }

      <!-- Mensaje de error de la fila -->
      @if (errorMessage()) {
        <div class="condition-row__error" role="alert">
          {{ errorMessage() }}
        </div>
      }
    </div>
  `,
  styles: `
    .condition-row {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      padding: var(--space-sm) 0;
      border-bottom: 1px solid var(--slate-200);

      &:last-child {
        border-bottom: none;
      }
    }

    .condition-row--has-error {
      background-color: var(--coral-100);
      border-radius: var(--radius-sm);
      padding: var(--space-sm);
    }

    .condition-row__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .condition-row__title {
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--slate-800);
    }

    .condition-row__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .condition-chip {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-pill);
      font-size: var(--fs-xs);
      font-weight: 500;
      background-color: var(--coral-100);
      color: var(--coral-700);
      border: 1px solid color-mix(in srgb, var(--coral-500) 45%, var(--coral-100));
    }

    .condition-chip__void-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      min-height: 24px;
      padding: 0 2px;
      border: none;
      background: transparent;
      color: var(--coral-700);
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      border-radius: 50%;

      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        min-width: 44px;
        min-height: 44px;
        width: 100%;
        height: 100%;
      }

      &:hover {
        background-color: color-mix(in srgb, var(--coral-500) 15%, var(--coral-100));
        color: var(--coral-700);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
      }
    }

    .condition-row__actions {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      margin-top: 0.2rem;
    }

    .btn-row-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 var(--space-sm);
      font-size: var(--fs-xs);
      font-weight: 600;
      border-radius: var(--radius-sm);
      background-color: var(--white);
      color: var(--blue-900);
      border: 1px solid var(--blue-300);
      cursor: pointer;
      transition: background-color var(--transition-fast), border-color var(--transition-fast);

      &:hover {
        background-color: var(--blue-50);
        border-color: var(--blue-400);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
      }
    }

    .condition-row__error {
      font-size: var(--fs-xs);
      color: var(--coral-700);
      font-weight: 600;
      margin-top: 0.2rem;
    }
  `,
})
export class HistoryConditionRowComponent {
  readonly condition = input.required<MedicalHistoryCondition>();
  readonly entries = input<HistoryEntry[]>([]);
  readonly isReadOnly = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly lastSuccessEntry = input<HistoryEntry | null>(null);

  readonly addEntry = output<CreateHistoryEntryRequest>();
  readonly voidEntry = output<HistoryEntry>();

  readonly isOtherCondition = computed<boolean>(() => this.condition().name.trim() === 'Otro');

  readonly activeEntries = computed<HistoryEntry[]>(() => {
    return this.entries().filter((e) => e.active);
  });

  readonly hasPersonalActive = computed<boolean>(() => {
    return this.activeEntries().some((e) => e.scope === 'PERSONAL');
  });

  // State for inline form
  readonly showForm = signal<boolean>(false);
  readonly formScope = signal<'PERSONAL' | 'FAMILY'>('PERSONAL');

  constructor() {
    // Si se registró con éxito una entrada de esta condición, cerramos el formulario
    effect(() => {
      const last = this.lastSuccessEntry();
      if (last && last.conditionId === this.condition().id) {
        this.showForm.set(false);
      }
    });
  }

  formatEntryLabel(entry: HistoryEntry): string {
    if (this.isOtherCondition()) {
      const desc = entry.description || 'Otro';
      if (entry.scope === 'PERSONAL') {
        return `Personal: ${desc}`;
      }
      return `Familiar (${entry.relative || 'pariente'}): ${desc}`;
    }

    if (entry.scope === 'PERSONAL') {
      return 'Personal';
    }
    return `Familiar: ${entry.relative || ''}`;
  }

  voidAriaLabel(entry: HistoryEntry): string {
    const scopeLabel = entry.scope === 'PERSONAL' ? 'Personal' : `Familiar ${entry.relative || ''}`.trim();
    return `Anular ${this.condition().name} ${scopeLabel}`;
  }

  onVoidClick(entry: HistoryEntry): void {
    this.voidEntry.emit(entry);
  }

  addPersonalDirect(): void {
    this.showForm.set(false);
    this.addEntry.emit({
      conditionId: this.condition().id,
      scope: 'PERSONAL',
    });
  }

  openForm(scope: 'PERSONAL' | 'FAMILY'): void {
    this.formScope.set(scope);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  onSubmitForm(req: CreateHistoryEntryRequest): void {
    // No cerramos inmediatamente; esperamos éxito para no perder lo escrito si hay error 400/409
    this.addEntry.emit(req);
  }
}
