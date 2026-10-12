import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  reasonLabel?: string;
}

export interface ConfirmDialogResult {
  confirmed: boolean;
  reason?: string;
}

let nextDialogId = 0;

@Component({
  selector: 'bd-confirm-dialog',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="confirm-dialog">
      <div class="confirm-dialog__header">
        <h2 id="confirm-dialog-title" class="confirm-dialog__title">{{ data.title }}</h2>
      </div>

      <div class="confirm-dialog__body">
        <p id="confirm-dialog-desc" class="confirm-dialog__message">{{ data.message }}</p>

        @if (data.reasonLabel) {
          <div class="confirm-dialog__field">
            <label [for]="reasonId" class="confirm-dialog__label">
              {{ data.reasonLabel }}
            </label>
            <textarea
              [id]="reasonId"
              class="confirm-dialog__textarea"
              rows="3"
              [ngModel]="reason()"
              (ngModelChange)="reason.set($event)"
            ></textarea>
          </div>
        }
      </div>

      <div class="confirm-dialog__footer">
        <button
          type="button"
          class="btn btn-outline confirm-dialog__btn"
          cdkFocusInitial
          (click)="onCancel()"
        >
          {{ data.cancelLabel || 'Volver' }}
        </button>
        <button
          type="button"
          class="btn confirm-dialog__btn"
          [class.btn-danger]="data.tone === 'danger'"
          [class.btn-primary]="data.tone !== 'danger'"
          (click)="onConfirm()"
        >
          {{ data.confirmLabel || 'Confirmar' }}
        </button>
      </div>
    </div>
  `,
  styles: `
    .confirm-dialog {
      background-color: var(--white);
      border-radius: var(--radius-lg);
      padding: var(--space-xl);
      max-width: 28rem;
      width: calc(100vw - 2rem);
      box-shadow: var(--shadow-xl);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
    }

    .confirm-dialog__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .confirm-dialog__title {
      font-size: var(--fs-lg);
      font-weight: 700;
      color: var(--blue-950);
      margin: 0;
      line-height: 1.25;
    }

    .confirm-dialog__body {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .confirm-dialog__message {
      font-size: var(--fs-sm);
      color: var(--slate-700);
      margin: 0;
      line-height: 1.5;
    }

    .confirm-dialog__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .confirm-dialog__label {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-700);
    }

    .confirm-dialog__textarea {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--slate-300);
      border-radius: var(--radius-sm);
      padding: var(--space-xs) var(--space-sm);
      font-family: inherit;
      font-size: var(--fs-sm);
      resize: vertical;

      &:focus {
        outline: 2px solid var(--color-focus);
        outline-offset: -1px;
        border-color: transparent;
      }
    }

    .confirm-dialog__footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-sm);
    }

    .confirm-dialog__btn {
      min-height: 44px;
      padding: 0.5rem 1rem;
      font-size: var(--fs-sm);
      font-weight: 600;
    }

    @media (max-width: 480px) {
      .confirm-dialog__footer {
        flex-direction: column-reverse;
        width: 100%;
      }

      .confirm-dialog__btn {
        width: 100%;
      }
    }
  `,
})
export class ConfirmDialogComponent {
  readonly dialogRef = inject(DialogRef<ConfirmDialogResult>);
  readonly data: ConfirmDialogOptions = inject(DIALOG_DATA);

  private readonly id = nextDialogId++;
  readonly titleId = `confirm-dialog-title-${this.id}`;
  readonly messageId = `confirm-dialog-desc-${this.id}`;
  readonly reasonId = `confirm-dialog-reason-${this.id}`;

  readonly reason = signal<string>('');

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }

  onConfirm(): void {
    this.dialogRef.close({
      confirmed: true,
      reason: this.data.reasonLabel ? this.reason() : undefined,
    });
  }
}
