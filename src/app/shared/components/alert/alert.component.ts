import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type AlertVariant = 'error' | 'warning' | 'info' | 'success';

@Component({
  selector: 'bd-alert',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bd-alert bd-alert--{{ variant() }}" [attr.role]="role()">
      @if (message()) {
        <span>{{ message() }}</span>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .bd-alert {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      font-size: var(--fs-sm);
      line-height: var(--lh-normal);
      font-weight: 500;
    }

    .bd-alert--error {
      background-color: var(--coral-100);
      color: var(--coral-700);
      border: 1px solid var(--coral-500);
    }

    .bd-alert--warning {
      background-color: var(--gold-100);
      color: var(--gold-700);
      border: 1px solid var(--gold-400);
    }

    .bd-alert--info {
      background-color: var(--blue-100);
      color: var(--blue-800);
      border: 1px solid var(--blue-500);
    }

    .bd-alert--success {
      background-color: var(--teal-100);
      color: var(--teal-700);
      border: 1px solid var(--teal-500);
    }
  `,
})
export class AlertComponent {
  readonly variant = input<AlertVariant>('error');
  readonly message = input<string | null>(null);
  readonly role = input<'alert' | 'status'>('alert');
}
