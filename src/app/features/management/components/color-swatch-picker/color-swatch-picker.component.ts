import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  normalizeHexColor,
  SUGGESTED_PROFESSIONAL_COLORS,
} from '../../domain/professional-colors';

@Component({
  selector: 'bd-color-swatch-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ColorSwatchPickerComponent),
      multi: true,
    },
  ],
  template: `
    <div class="color-picker">
      <div class="color-picker__swatches" role="radiogroup" aria-label="Color de agenda">
        @for (swatch of swatches; track swatch.hex) {
          <button
            type="button"
            role="radio"
            class="color-picker__swatch"
            [class.is-selected]="isSelected(swatch.hex)"
            [attr.aria-checked]="isSelected(swatch.hex)"
            [attr.aria-label]="swatch.name"
            [style.background-color]="swatch.hex"
            [disabled]="disabled()"
            (click)="selectColor(swatch.hex)"
          >
            @if (isSelected(swatch.hex)) {
              <span class="color-picker__check" aria-hidden="true">✓</span>
            }
          </button>
        }
      </div>

      <div class="color-picker__custom">
        <label for="custom-color-input" class="color-picker__custom-label">
          Otro color:
        </label>
        <div class="color-picker__custom-control">
          <input
            id="custom-color-input"
            type="color"
            class="color-picker__input-color"
            [value]="selectedColor()"
            [disabled]="disabled()"
            (input)="onCustomInput($event)"
            aria-label="Elegir otro color"
          />
          <span class="color-picker__hex">{{ selectedColor() }}</span>
        </div>
      </div>
    </div>
  `,
  styles: `
    .color-picker {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .color-picker__swatches {
      display: grid;
      grid-template-columns: repeat(4, 44px);
      gap: var(--space-xs);
    }

    .color-picker__swatch {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 2px solid transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
      position: relative;
      transition: transform 0.1s ease, border-color 0.1s ease;

      &:hover:not(:disabled) {
        transform: scale(1.05);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: 2px;
      }

      &.is-selected {
        border-color: var(--white);
        box-shadow: 0 0 0 2px var(--blue-900);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .color-picker__check {
      color: var(--white);
      font-size: 1.125rem;
      font-weight: 700;
      line-height: 1;
      text-shadow: 0 1px 2px color-mix(in srgb, var(--blue-950) 60%, transparent);
    }

    .color-picker__custom {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .color-picker__custom-label {
      font-size: var(--fs-xs);
      font-weight: 500;
      color: var(--color-text-muted);
    }

    .color-picker__custom-control {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .color-picker__input-color {
      width: 44px;
      height: 44px;
      padding: 0;
      border: 1px solid var(--slate-300);
      border-radius: var(--radius-md);
      cursor: pointer;
      background: none;

      &:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: 2px;
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
    }

    .color-picker__hex {
      font-size: var(--fs-xs);
      font-variant-numeric: tabular-nums;
      color: var(--color-text);
      font-weight: 600;
    }
  `,
})
export class ColorSwatchPickerComponent implements ControlValueAccessor {
  readonly swatches = SUGGESTED_PROFESSIONAL_COLORS;

  readonly selectedColor = signal<string>(SUGGESTED_PROFESSIONAL_COLORS[0].hex);
  readonly disabled = signal<boolean>(false);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  isSelected(hex: string): boolean {
    return normalizeHexColor(this.selectedColor()) === normalizeHexColor(hex);
  }

  selectColor(hex: string): void {
    if (this.disabled()) return;
    const normalized = normalizeHexColor(hex);
    this.selectedColor.set(normalized);
    this.onChange(normalized);
    this.onTouched();
  }

  onCustomInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const normalized = normalizeHexColor(input.value);
    this.selectedColor.set(normalized);
    this.onChange(normalized);
    this.onTouched();
  }

  writeValue(value: string | null): void {
    if (value) {
      this.selectedColor.set(normalizeHexColor(value));
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
