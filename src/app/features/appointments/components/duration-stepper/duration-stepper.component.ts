import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  DEFAULT_DURATION_MINUTES,
  formatDuration,
  MAX_DURATION_MINUTES,
  SLOT_STEP_MINUTES,
} from '../../domain/slot-ranges';

@Component({
  selector: 'bd-duration-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="duration-stepper" role="group" aria-label="Duración de la cita">
      <button
        type="button"
        class="duration-stepper__btn duration-stepper__btn--minus"
        [disabled]="value() <= min()"
        aria-label="Reducir duración"
        (click)="onDecrement()"
      >
        −
      </button>
      <span
        class="duration-stepper__value"
        aria-live="polite"
        aria-atomic="true"
      >
        {{ formattedValue() }}
      </span>
      <button
        type="button"
        class="duration-stepper__btn duration-stepper__btn--plus"
        [disabled]="value() >= max()"
        aria-label="Aumentar duración"
        (click)="onIncrement()"
      >
        +
      </button>
    </div>
  `,
  styles: `
    .duration-stepper {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      background-color: var(--slate-100);
      border: 1px solid var(--slate-300);
      border-radius: var(--radius-sm);
      padding: 0.15rem;
    }

    .duration-stepper__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 1px solid var(--slate-300);
      border-radius: var(--radius-sm);
      background-color: var(--white);
      color: var(--slate-800);
      font-size: var(--fs-md);
      font-weight: 700;
      cursor: pointer;
      user-select: none;
      transition: all var(--transition-fast);
      box-sizing: border-box;

      &:hover:not(:disabled) {
        background-color: var(--slate-200);
        border-color: var(--slate-400);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: 2px;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    .duration-stepper__value {
      min-width: 5.5rem;
      text-align: center;
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--blue-950);
      padding: 0 var(--space-xs);
    }
  `,
})
export class DurationStepperComponent {
  readonly value = input<number>(DEFAULT_DURATION_MINUTES);
  readonly min = input<number>(SLOT_STEP_MINUTES);
  readonly max = input<number>(MAX_DURATION_MINUTES);
  readonly step = input<number>(SLOT_STEP_MINUTES);

  readonly valueChange = output<number>();

  readonly formattedValue = computed(() => formatDuration(this.value()));

  onDecrement(): void {
    const next = Math.max(this.min(), this.value() - this.step());
    this.valueChange.emit(next);
  }

  onIncrement(): void {
    const next = Math.min(this.max(), this.value() + this.step());
    this.valueChange.emit(next);
  }
}
