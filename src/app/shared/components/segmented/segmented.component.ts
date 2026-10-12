import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from '@angular/core';
import { IconComponent, LucideIconData } from '../icon/icon.component';

export interface SegmentedOption<T = string> {
  value: T;
  label: string;
  icon?: LucideIconData;
}

@Component({
  selector: 'bd-segmented',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bd-segmented"
      role="radiogroup"
      [attr.aria-label]="label() || 'Opciones'"
      (keydown)="onKeyDown($event)"
    >
      @for (opt of options(); track opt.value; let i = $index) {
        <button
          type="button"
          role="radio"
          class="bd-segmented__item"
          [class.bd-segmented__item--active]="value() === opt.value"
          [attr.aria-checked]="value() === opt.value"
          [tabindex]="value() === opt.value ? 0 : -1"
          (click)="selectOption(opt.value)"
        >
          @if (opt.icon) {
            <bd-icon [name]="opt.icon" [size]="16" class="bd-segmented__icon" />
          }
          <span class="bd-segmented__label">{{ opt.label }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    .bd-segmented {
      display: inline-flex;
      align-items: center;
      background-color: var(--slate-100);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-sm);
      padding: 2px;
      gap: 2px;
    }

    .bd-segmented__item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      border: none;
      background: transparent;
      padding: 0.4rem 0.85rem;
      border-radius: calc(var(--radius-sm) - 2px);
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--slate-600);
      cursor: pointer;
      min-height: 44px;
      transition: background-color var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);
      white-space: nowrap;
      user-select: none;
    }

    .bd-segmented__item:hover:not(.bd-segmented__item--active) {
      color: var(--slate-800);
      background-color: color-mix(in srgb, var(--slate-200) 50%, transparent);
    }

    .bd-segmented__item:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 1px;
    }

    .bd-segmented__item--active {
      background-color: var(--white);
      color: var(--blue-900);
      font-weight: 600;
      box-shadow: var(--shadow-sm);
    }

    .bd-segmented__icon {
      color: currentColor;
    }
  `,
})
export class SegmentedComponent<T = string> {
  readonly options = input.required<SegmentedOption<T>[]>();
  readonly label = input<string | null>(null);
  readonly value = model.required<T>();

  selectOption(val: T): void {
    if (this.value() !== val) {
      this.value.set(val);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    const opts = this.options();
    if (!opts.length) return;

    const currentIndex = opts.findIndex((o) => o.value === this.value());
    let nextIndex = -1;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex = currentIndex < opts.length - 1 ? currentIndex + 1 : 0;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex = currentIndex > 0 ? currentIndex - 1 : opts.length - 1;
    }

    if (nextIndex !== -1) {
      this.selectOption(opts[nextIndex].value);
      // Focus active button
      const buttons = (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="radio"]');
      buttons[nextIndex]?.focus();
    }
  }
}
