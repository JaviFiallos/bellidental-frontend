import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ShiftValue } from '../../services/schedules.store';

let nextEditorId = 0;

@Component({
  selector: 'bd-shift-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="shift-editor" [formGroup]="form" (ngSubmit)="submit()" (keydown.escape)="cancel.emit()">
      <div class="shift-editor__fields">
        <div class="shift-editor__field">
          <label class="field-label" [for]="startId">Inicio</label>
          <input
            [id]="startId"
            class="input"
            type="time"
            step="900"
            formControlName="startTime"
            [attr.aria-invalid]="rangeError() ? 'true' : null"
            [attr.aria-describedby]="rangeError() ? errorId : null"
          />
        </div>
        <div class="shift-editor__field">
          <label class="field-label" [for]="endId">Fin</label>
          <input
            [id]="endId"
            class="input"
            type="time"
            step="900"
            formControlName="endTime"
            [attr.aria-invalid]="rangeError() ? 'true' : null"
            [attr.aria-describedby]="rangeError() ? errorId : null"
          />
        </div>
      </div>

      @if (rangeError(); as message) {
        <p [id]="errorId" class="shift-editor__error" role="alert">{{ message }}</p>
      } @else if (errorMessage()) {
        <p class="shift-editor__error" role="alert">{{ errorMessage() }}</p>
      }

      @if (!embedded()) {
        <div class="shift-editor__actions">
          <button type="button" class="btn btn-ghost shift-editor__btn" (click)="cancel.emit()">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary shift-editor__btn" [disabled]="!canSave()">
            Guardar
          </button>
        </div>
      }
    </form>
  `,
  styles: `
    :host {
      display: block;
    }

    .shift-editor {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      padding: var(--space-md);
      background-color: var(--slate-50);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
    }

    .shift-editor__fields {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-md);
    }

    .shift-editor__field {
      display: flex;
      flex-direction: column;
      flex: 1 1 9rem;
      min-width: 0;
    }

    .shift-editor__error {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-danger);
      font-weight: 500;
    }

    .shift-editor__actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-sm);
    }

    .shift-editor__btn {
      min-height: 44px;
    }
  `,
})
export class ShiftEditorComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  readonly startTime = input<string>('');
  readonly endTime = input<string>('');
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  /** Sin botones: el padre recibe el valor válido (o null) en cada cambio, p. ej. en el formulario de excepciones. */
  readonly embedded = input<boolean>(false);

  readonly save = output<ShiftValue>();
  readonly cancel = output<void>();
  readonly valueChange = output<ShiftValue | null>();

  readonly startId = `shift-start-${nextEditorId}`;
  readonly endId = `shift-end-${nextEditorId}`;
  readonly errorId = `shift-error-${nextEditorId++}`;

  readonly form = this.formBuilder.nonNullable.group({
    startTime: ['', [Validators.required]],
    endTime: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.form.reset({ startTime: this.startTime(), endTime: this.endTime() });

    if (this.embedded()) {
      this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
        this.valueChange.emit(this.isValid() ? this.form.getRawValue() : null);
      });
    }
  }

  private isValid(): boolean {
    const { startTime, endTime } = this.form.getRawValue();
    return !!startTime && !!endTime && endTime > startTime;
  }

  rangeError(): string | null {
    const { startTime, endTime } = this.form.getRawValue();
    if (!startTime || !endTime) return null;
    return endTime <= startTime ? 'La hora de fin debe ser posterior a la de inicio' : null;
  }

  canSave(): boolean {
    return !this.saving() && this.form.valid && this.rangeError() === null;
  }

  submit(): void {
    if (this.embedded() || !this.canSave()) return;
    const { startTime, endTime } = this.form.getRawValue();
    this.save.emit({ startTime, endTime });
  }
}
