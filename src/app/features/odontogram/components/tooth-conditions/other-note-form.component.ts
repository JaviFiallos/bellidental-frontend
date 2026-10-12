import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'bd-other-note-form',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="other-form" (keydown.escape)="cancel.emit()">
      <label for="other-note-input" class="other-form__label">
        Nota (obligatoria)
      </label>
      <input
        #noteInput
        id="other-note-input"
        type="text"
        class="input other-form__input"
        placeholder="Describe el hallazgo..."
        [ngModel]="noteText()"
        (ngModelChange)="noteText.set($event)"
        (keydown.enter)="onSubmit()"
        required
      />
      <div class="other-form__actions">
        <button
          type="button"
          class="btn btn-primary other-form__btn"
          [disabled]="saving() || !noteText().trim()"
          (click)="onSubmit()"
        >
          Registrar
        </button>
        <button
          type="button"
          class="btn btn-outline other-form__btn"
          (click)="cancel.emit()"
        >
          Cancelar
        </button>
      </div>
    </div>
  `,
  styles: `
    .other-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      padding: var(--space-sm);
      background: var(--slate-50);
      border-radius: var(--radius-sm);
      border: 1px solid var(--slate-300);
      margin-top: var(--space-xs);
    }

    .other-form__label {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-600);
    }

    .other-form__input {
      min-height: 44px;
      font-size: var(--fs-sm);
    }

    .other-form__actions {
      display: flex;
      gap: var(--space-xs);
    }

    .other-form__btn {
      min-height: 44px;
      font-size: var(--fs-sm);
      padding: 0 var(--space-md);
    }
  `,
})
export class OtherNoteFormComponent {
  @ViewChild('noteInput') noteInput?: ElementRef<HTMLInputElement>;

  readonly saving = input<boolean>(false);
  readonly noteSubmitted = output<string>();
  readonly cancel = output<void>();

  readonly noteText = signal<string>('');

  focus(): void {
    this.noteText.set('');
    setTimeout(() => this.noteInput?.nativeElement?.focus());
  }

  onSubmit(): void {
    const text = this.noteText().trim();
    if (!text || this.saving()) return;
    this.noteSubmitted.emit(text);
  }
}
