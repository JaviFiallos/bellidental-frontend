import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';
import { IconComponent } from '../icon/icon.component';
import { CheckCircle2, AlertCircle, X } from 'lucide-angular';

@Component({
  selector: 'bd-toast-host',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="toast-container" aria-live="polite" aria-atomic="true">
      @for (toast of notificationService.toasts(); track toast.id) {
        <div
          class="toast toast--{{ toast.type }}"
          [attr.role]="toast.type === 'error' ? 'alert' : 'status'"
        >
          <div class="toast__icon">
            @if (toast.type === 'success') {
              <bd-icon [name]="successIcon" [size]="20" />
            } @else {
              <bd-icon [name]="errorIcon" [size]="20" />
            }
          </div>
          <span class="toast__message">{{ toast.message }}</span>
          <button
            type="button"
            class="toast__close-btn"
            aria-label="Cerrar notificación"
            (click)="notificationService.dismiss(toast.id)"
          >
            <bd-icon [name]="closeIcon" [size]="16" />
          </button>
        </div>
      }
    </aside>
  `,
  styles: `
    .toast-container {
      position: fixed;
      bottom: var(--space-md);
      right: var(--space-md);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      max-width: 400px;
      width: calc(100% - 2 * var(--space-md));
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-md);
      font-size: var(--fs-sm);
      font-weight: 500;
      animation: toastIn var(--transition-base) forwards;
    }

    .toast--success {
      background-color: var(--teal-100);
      color: var(--teal-700);
      border: 1px solid var(--teal-500);
    }

    .toast--error {
      background-color: var(--coral-100);
      color: var(--coral-700);
      border: 1px solid var(--coral-500);
    }

    .toast__icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .toast__message {
      flex: 1;
      line-height: var(--lh-tight);
    }

    .toast__close-btn {
      flex-shrink: 0;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: currentColor;
      opacity: 0.8;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      min-height: 24px;

      &:hover {
        opacity: 1;
      }

      &:focus-visible {
        outline: 2px solid currentColor;
      }
    }

    @keyframes toastIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
})
export class ToastHostComponent {
  readonly notificationService = inject(NotificationService);

  readonly successIcon = CheckCircle2;
  readonly errorIcon = AlertCircle;
  readonly closeIcon = X;
}
