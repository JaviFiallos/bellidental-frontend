import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Observable } from 'rxjs';
import { ApiError } from '../../../../core/api/api.models';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { Encounter } from '../../../clinical';

export interface OpenEncounterDialogData {
  patientName: string;
  startAt: string;
  submit: (chiefComplaint: string) => Observable<Encounter>;
}

@Component({
  selector: 'bd-open-encounter-dialog',
  standalone: true,
  imports: [FormsModule, AlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="open-encounter-dialog">
      <div class="open-encounter-dialog__header">
        <h2 id="open-encounter-dialog-title" class="open-encounter-dialog__title">
          Atender a {{ data.patientName }}
        </h2>
      </div>

      <form (submit)="onSubmit($event)" class="open-encounter-dialog__body">
        @if (errorMessage()) {
          <bd-alert variant="error" [message]="errorMessage()" />
        }

        <div class="open-encounter-dialog__field">
          <label for="chief-complaint-input" class="open-encounter-dialog__label">
            Motivo de consulta
          </label>
          <input
            #inputEl
            id="chief-complaint-input"
            type="text"
            class="input"
            [ngModel]="chiefComplaint()"
            (ngModelChange)="chiefComplaint.set($event); errorMessage.set(null)"
            name="chiefComplaint"
            [disabled]="submitting()"
            autocomplete="off"
          />
        </div>

        <div class="open-encounter-dialog__footer">
          <button
            type="button"
            class="btn btn-outline open-encounter-dialog__btn"
            (click)="onCancel()"
            [disabled]="submitting()"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="btn btn-primary open-encounter-dialog__btn"
            [disabled]="submitting() || isSubmitDisabled()"
          >
            @if (submitting()) {
              Abriendo…
            } @else {
              Abrir atención
            }
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .open-encounter-dialog {
      background-color: var(--white);
      border-radius: var(--radius-lg);
      padding: var(--space-xl);
      max-width: 32rem;
      width: calc(100vw - 2rem);
      box-shadow: var(--shadow-xl);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
    }

    .open-encounter-dialog__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .open-encounter-dialog__title {
      font-size: var(--fs-lg);
      font-weight: 700;
      color: var(--blue-950);
      margin: 0;
      line-height: 1.25;
    }

    .open-encounter-dialog__body {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      margin: 0;
    }

    .open-encounter-dialog__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .open-encounter-dialog__label {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-700);
    }

    .open-encounter-dialog__footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-sm);
      margin-top: var(--space-xs);
    }

    .open-encounter-dialog__btn {
      min-height: 48px;
      padding: 0.5rem 1.25rem;
      font-size: var(--fs-sm);
      font-weight: 600;
    }

    @media (max-width: 480px) {
      .open-encounter-dialog__footer {
        flex-direction: column-reverse;
        width: 100%;
      }

      .open-encounter-dialog__btn {
        width: 100%;
      }
    }
  `,
})
export class OpenEncounterDialogComponent {
  readonly dialogRef = inject(DialogRef<Encounter>);
  readonly data: OpenEncounterDialogData = inject(DIALOG_DATA);

  readonly chiefComplaint = signal<string>('Paciente refiere ');
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  constructor() {
    afterNextRender(() => {
      const el = this.inputEl()?.nativeElement;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    });
  }

  isSubmitDisabled(): boolean {
    const val = this.chiefComplaint().trim();
    return val === '' || val === 'Paciente refiere';
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    if (this.isSubmitDisabled() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.data.submit(this.chiefComplaint().trim()).subscribe({
      next: (encounter) => {
        this.submitting.set(false);
        this.dialogRef.close(encounter);
      },
      error: (err: ApiError | Error) => {
        this.submitting.set(false);
        const msg =
          (err as ApiError)?.message ||
          (err as Error)?.message ||
          'Ocurrió un error al abrir la atención';
        this.errorMessage.set(msg);
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
