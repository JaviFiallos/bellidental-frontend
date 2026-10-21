import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Aviso sobre el odontograma mientras se elige la pieza final de una prótesis. */
@Component({
  selector: 'bd-span-notice',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="span-notice" role="status" aria-live="polite">
      <span class="span-notice__text">
        @if (error(); as message) {
          <strong>{{ message }}</strong>
        } @else {
          {{ conditionName() }} desde la pieza {{ startCode() }}: toca la pieza final de la misma arcada.
        }
        @if (partnerHint(); as hint) {
          Puedes cambiar a {{ hint }}.
        }
      </span>
      <button type="button" class="btn btn-outline btn-sm span-notice__cancel" (click)="cancel.emit()">
        Cancelar
      </button>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .span-notice {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      padding: 0.6rem 0.9rem;
      background: var(--gold-100);
      border: 1px solid var(--gold-400);
      border-radius: var(--radius-sm);
      color: var(--gold-700);
      font-size: var(--fs-sm);
      font-weight: 500;
    }

    .span-notice__text {
      min-width: 0;
    }

    .span-notice__cancel {
      flex-shrink: 0;
      min-height: 44px;
      padding: 0 var(--space-sm);
    }
  `,
})
export class SpanNoticeComponent {
  readonly conditionName = input.required<string>();
  readonly startCode = input.required<number>();
  readonly error = input<string | null>(null);
  readonly partnerHint = input<string | null>(null);

  readonly cancel = output<void>();
}
