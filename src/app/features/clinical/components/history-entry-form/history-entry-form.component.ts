import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  viewChild,
  afterNextRender,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreateHistoryEntryRequest } from '../../models/clinical-record.models';

@Component({
  selector: 'bd-history-entry-form',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="entry-form" (ngSubmit)="onSubmit()">
      @if (isOtherCondition()) {
        <div class="entry-form__field">
          <label class="sr-only" [attr.for]="'desc-input-' + conditionId()">
            Descripción
          </label>
          <input
            #descInput
            [id]="'desc-input-' + conditionId()"
            type="text"
            class="form-control entry-form__input"
            placeholder="Descripción *"
            [(ngModel)]="description"
            (input)="description = $any($event.target).value"
            name="description"
            required
            autocomplete="off"
            (keydown.escape)="cancel.emit()"
          />
        </div>
      }

      @if (scope() === 'FAMILY') {
        <div class="entry-form__field">
          <label class="sr-only" [attr.for]="'family-input-' + conditionId()">
            ¿Qué familiar?
          </label>
          <input
            #familyInput
            [id]="'family-input-' + conditionId()"
            type="text"
            class="form-control entry-form__input"
            placeholder="¿Qué familiar? (máx. 30) *"
            maxlength="30"
            [(ngModel)]="relative"
            (input)="relative = $any($event.target).value"
            name="relative"
            required
            autocomplete="off"
            (keydown.enter)="$event.preventDefault(); onSubmit()"
            (keydown.escape)="cancel.emit()"
          />
        </div>
      }

      <div class="entry-form__btns">
        <button
          type="submit"
          class="btn-form-submit"
          [disabled]="isSubmitDisabled()"
        >
          Registrar
        </button>
        <button
          type="button"
          class="btn-form-cancel"
          (click)="cancel.emit()"
        >
          Cancelar
        </button>
      </div>
    </form>
  `,
  styles: `
    .entry-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      padding: var(--space-xs);
      background-color: var(--slate-50);
      border: 1px solid var(--slate-300);
      border-radius: var(--radius-sm);
      margin-top: var(--space-xs);
    }

    .entry-form__field {
      width: 100%;
    }

    .entry-form__input {
      width: 100%;
      min-height: 44px;
      box-sizing: border-box;
      padding: 0.5rem 0.75rem;
      font-size: var(--fs-sm);
      border: 1px solid var(--slate-300);
      border-radius: var(--radius-sm);

      &:focus {
        border-color: var(--color-focus);
        outline: 2px solid var(--color-focus);
      }
    }

    .entry-form__btns {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .btn-form-submit {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 var(--space-md);
      font-size: var(--fs-xs);
      font-weight: 600;
      border-radius: var(--radius-sm);
      background-color: var(--blue-900);
      color: var(--white);
      border: none;
      cursor: pointer;

      &:hover:not(:disabled) {
        background-color: var(--blue-950);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
      }
    }

    .btn-form-cancel {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 var(--space-sm);
      font-size: var(--fs-xs);
      font-weight: 500;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--slate-600);
      border: 1px solid var(--slate-300);
      cursor: pointer;

      &:hover {
        background-color: var(--slate-200);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
      }
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
  `,
})
export class HistoryEntryFormComponent {
  readonly conditionId = input.required<number>();
  readonly scope = input.required<'PERSONAL' | 'FAMILY'>();
  readonly isOtherCondition = input<boolean>(false);

  readonly submitRequest = output<CreateHistoryEntryRequest>();
  readonly cancel = output<void>();

  readonly familyInputRef = viewChild<ElementRef<HTMLInputElement>>('familyInput');
  readonly descInputRef = viewChild<ElementRef<HTMLInputElement>>('descInput');

  relative = '';
  description = '';

  constructor() {
    afterNextRender(() => {
      if (this.isOtherCondition()) {
        this.descInputRef()?.nativeElement.focus();
      } else {
        this.familyInputRef()?.nativeElement.focus();
      }
    });
  }

  isSubmitDisabled(): boolean {
    if (this.isOtherCondition() && !this.description.trim()) {
      return true;
    }
    if (this.scope() === 'FAMILY' && !this.relative.trim()) {
      return true;
    }
    return false;
  }

  onSubmit(): void {
    if (this.isSubmitDisabled()) return;

    const req: CreateHistoryEntryRequest = {
      conditionId: this.conditionId(),
      scope: this.scope(),
    };

    if (this.scope() === 'FAMILY') {
      req.relative = this.relative.trim();
    }

    if (this.isOtherCondition()) {
      req.description = this.description.trim();
    }

    this.submitRequest.emit(req);
  }

}
