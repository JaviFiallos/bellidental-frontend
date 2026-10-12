import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, LucideIconData } from '../icon/icon.component';

export type StatusBadgeTone =
  | 'scheduled'
  | 'waiting'
  | 'in-progress'
  | 'attended'
  | 'no-show'
  | 'cancelled';

@Component({
  selector: 'bd-status-badge',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="bd-status-badge bd-status-badge--{{ tone() }}">
      @if (icon()) {
        <bd-icon [name]="icon()!" [size]="12" class="bd-status-badge__icon" />
      } @else {
        <span class="bd-status-badge__dot"></span>
      }
      <span class="bd-status-badge__label">{{ label() }}</span>
      @if (showCheck()) {
        <span class="bd-status-badge__check" aria-hidden="true">✓</span>
      }
    </span>
  `,
  styles: `
    .bd-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-sm);
      font-size: var(--fs-xs);
      font-weight: 600;
      line-height: 1.2;
      white-space: nowrap;
      user-select: none;
    }

    .bd-status-badge__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: currentColor;
      flex-shrink: 0;
    }

    .bd-status-badge__icon {
      flex-shrink: 0;
    }

    .bd-status-badge__check {
      font-weight: 700;
      margin-left: -1px;
    }

    .bd-status-badge--scheduled {
      background-color: var(--appointment-scheduled-bg);
      color: var(--appointment-scheduled-text);
      border: 1px solid color-mix(in srgb, var(--appointment-scheduled-bar) 40%, transparent);
    }
    .bd-status-badge--scheduled .bd-status-badge__dot {
      background-color: var(--appointment-scheduled-bar);
    }

    .bd-status-badge--waiting {
      background-color: var(--appointment-waiting-bg);
      color: var(--appointment-waiting-text);
      border: 1px solid color-mix(in srgb, var(--appointment-waiting-bar) 40%, transparent);
    }
    .bd-status-badge--waiting .bd-status-badge__dot {
      background-color: var(--appointment-waiting-bar);
    }

    .bd-status-badge--in-progress {
      background-color: var(--appointment-in-progress-bg);
      color: var(--appointment-in-progress-text);
      border: 1px solid color-mix(in srgb, var(--appointment-in-progress-bar) 40%, transparent);
    }
    .bd-status-badge--in-progress .bd-status-badge__dot {
      background-color: var(--appointment-in-progress-bar);
    }

    .bd-status-badge--attended {
      background-color: var(--appointment-completed-bg);
      color: var(--appointment-completed-text);
      border: 1px solid color-mix(in srgb, var(--appointment-completed-bar) 40%, transparent);
    }
    .bd-status-badge--attended .bd-status-badge__dot {
      background-color: var(--appointment-completed-bar);
    }

    .bd-status-badge--no-show {
      background-color: var(--appointment-no-show-bg);
      color: var(--appointment-no-show-text);
      border: 1px solid color-mix(in srgb, var(--appointment-no-show-bar) 40%, transparent);
    }
    .bd-status-badge--no-show .bd-status-badge__dot {
      background-color: var(--appointment-no-show-bar);
    }

    .bd-status-badge--cancelled {
      background-color: var(--appointment-cancelled-bg);
      color: var(--appointment-cancelled-text);
      border: 1px solid color-mix(in srgb, var(--appointment-cancelled-bar) 40%, transparent);
    }
    .bd-status-badge--cancelled .bd-status-badge__dot {
      background-color: var(--appointment-cancelled-bar);
    }
  `,
})
export class StatusBadgeComponent {
  readonly tone = input.required<StatusBadgeTone>();
  readonly label = input.required<string>();
  readonly icon = input<LucideIconData | null>(null);
  readonly showCheck = input<boolean>(false);
}
