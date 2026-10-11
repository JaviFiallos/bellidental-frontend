import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'bd-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bd-field" [class.has-error]="!!error()">
      @if (label()) {
        <label [attr.for]="fieldId()" class="bd-field__label">
          {{ label() }}
          @if (required()) {
            <span class="bd-field__required" aria-hidden="true">*</span>
          }
        </label>
      }

      <div class="bd-field__control">
        <ng-content />
      </div>

      @if (error()) {
        <p [id]="errorId()" class="bd-field__error" role="alert">
          {{ error() }}
        </p>
      } @else if (hint()) {
        <p [id]="hintId()" class="bd-field__hint">
          {{ hint() }}
        </p>
      }
    </div>
  `,
  styles: `
    .bd-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      width: 100%;
    }

    .bd-field__label {
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--color-text);
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .bd-field__required {
      color: var(--color-danger);
    }

    .bd-field__control {
      position: relative;
      width: 100%;
    }

    .bd-field__error {
      font-size: var(--fs-xs);
      color: var(--color-danger);
      margin: 0;
      line-height: var(--lh-tight);
    }

    .bd-field__hint {
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
      margin: 0;
      line-height: var(--lh-tight);
    }
  `,
})
export class FieldComponent {
  readonly label = input<string>('');
  readonly fieldId = input<string>('');
  readonly required = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);

  readonly errorId = computed(() => (this.fieldId() ? `${this.fieldId()}-error` : undefined));
  readonly hintId = computed(() => (this.fieldId() ? `${this.fieldId()}-hint` : undefined));
}
