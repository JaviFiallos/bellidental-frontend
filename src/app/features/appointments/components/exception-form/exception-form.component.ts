import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExceptionDraft, ExceptionKind, ShiftValue } from '../../services/schedules.store';
import { ShiftEditorComponent } from '../shift-editor/shift-editor.component';

interface ShiftRow {
  id: number;
  startTime: string;
  endTime: string;
  value: ShiftValue | null;
}

const FIRST_SHIFT: ShiftValue = { startTime: '09:00', endTime: '13:00' };
const ADDED_SHIFT: ShiftValue = { startTime: '14:00', endTime: '20:00' };

@Component({
  selector: 'bd-exception-form',
  standalone: true,
  imports: [ReactiveFormsModule, ShiftEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="exception-form">
      <h3 class="exception-form__title">Nueva excepción</h3>

      <form class="exception-form__fields" [formGroup]="form" (keydown.escape)="cancel.emit()">
        <div class="exception-form__field">
          <label class="field-label" for="exception-date">Fecha</label>
          <input
            id="exception-date"
            class="input"
            type="date"
            formControlName="date"
            [min]="today()"
            [attr.aria-describedby]="dateHintId"
          />
          @if (dateIsPast()) {
            <p class="exception-form__error" role="alert">La fecha debe ser hoy o posterior</p>
          } @else if (dateHasRules()) {
            <p [id]="dateHintId" class="exception-form__hint">Esta fecha ya tiene reglas: se sumarán.</p>
          }
        </div>

        <fieldset class="exception-form__field">
          <legend class="field-label">Tipo</legend>
          <label class="exception-form__radio">
            <input type="radio" formControlName="kind" value="closed" />
            No atiende
          </label>
          <label class="exception-form__radio">
            <input type="radio" formControlName="kind" value="special" />
            Horario especial
          </label>
        </fieldset>
      </form>

      @if (kind() === 'special') {
        <div class="exception-form__shifts">
          @for (row of shiftRows(); track row.id; let index = $index) {
            <div class="exception-form__shift">
              <bd-shift-editor
                [startTime]="row.startTime"
                [endTime]="row.endTime"
                [embedded]="true"
                (valueChange)="onShiftChange(row.id, $event)"
              />
              @if (shiftRows().length > 1) {
                <button
                  type="button"
                  class="btn btn-ghost exception-form__btn"
                  [attr.aria-label]="'Quitar turno ' + (index + 1)"
                  (click)="removeShift(row.id)"
                >
                  Quitar turno
                </button>
              }
            </div>
          }

          <button type="button" class="btn btn-ghost exception-form__btn exception-form__add" (click)="addShift()">
            + Añadir turno
          </button>
        </div>
      }

      @if (errorMessage()) {
        <p class="exception-form__error" role="alert">{{ errorMessage() }}</p>
      }

      <div class="exception-form__actions">
        <button type="button" class="btn btn-ghost exception-form__btn" (click)="cancel.emit()">
          Cancelar
        </button>
        <button
          type="button"
          class="btn btn-primary exception-form__btn"
          [disabled]="!canSave()"
          (click)="submit()"
        >
          Guardar
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .exception-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
      background-color: var(--slate-50);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .exception-form__title {
      margin: 0;
      font-size: var(--fs-md);
      font-weight: 600;
      color: var(--blue-900);
    }

    .exception-form__fields {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .exception-form__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }

    .exception-form__radio {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      min-height: 44px;
      font-size: var(--fs-base);
      cursor: pointer;
    }

    .exception-form__shifts {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .exception-form__shift {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-xs);
    }

    .exception-form__shift bd-shift-editor {
      align-self: stretch;
    }

    .exception-form__hint {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .exception-form__error {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-danger);
      font-weight: 500;
    }

    .exception-form__actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-sm);
    }

    .exception-form__btn {
      min-height: 44px;
    }

    .exception-form__add {
      align-self: flex-start;
    }
  `,
})
export class ExceptionFormComponent {
  readonly today = input.required<string>();
  /** Fechas que ya tienen reglas (para el aviso "se sumarán"). */
  readonly existingDates = input<string[]>([]);
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly save = output<ExceptionDraft>();
  readonly cancel = output<void>();

  readonly dateHintId = 'exception-date-hint';

  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group({
    date: ['', [Validators.required]],
    kind: ['closed' as ExceptionKind, [Validators.required]],
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  private nextShiftId = 0;
  readonly shiftRows = signal<ShiftRow[]>([this.createRow(FIRST_SHIFT)]);

  readonly date = computed(() => this.formValue().date ?? '');
  readonly kind = computed<ExceptionKind>(() => this.formValue().kind ?? 'closed');
  readonly dateIsPast = computed(() => this.date() !== '' && this.date() < this.today());
  readonly dateHasRules = computed(() => this.existingDates().includes(this.date()));

  readonly canSave = computed(() => {
    if (this.saving() || !this.date() || this.dateIsPast()) return false;
    if (this.kind() === 'closed') return true;
    return this.shiftRows().every((row) => row.value !== null);
  });

  onShiftChange(rowId: number, value: ShiftValue | null): void {
    this.shiftRows.update((rows) =>
      rows.map((row) => (row.id === rowId ? { ...row, value } : row))
    );
  }

  addShift(): void {
    this.shiftRows.update((rows) => [...rows, this.createRow(ADDED_SHIFT)]);
  }

  removeShift(rowId: number): void {
    this.shiftRows.update((rows) => rows.filter((row) => row.id !== rowId));
  }

  submit(): void {
    if (!this.canSave()) return;

    const shifts = this.kind() === 'special'
      ? this.shiftRows().map((row) => row.value as ShiftValue)
      : [];
    this.save.emit({ date: this.date(), kind: this.kind(), shifts });
  }

  private createRow(shift: ShiftValue): ShiftRow {
    return { id: this.nextShiftId++, ...shift, value: shift };
  }
}
