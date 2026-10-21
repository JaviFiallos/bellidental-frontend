import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, LucideIconData } from '../icon/icon.component';

@Component({
  selector: 'bd-empty-state',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bd-empty-state" role="status">
      @if (icon()) {
        <div class="bd-empty-state__icon-wrapper">
          <bd-icon [name]="icon()!" [size]="36" class="bd-empty-state__icon" />
        </div>
      }
      <h3 class="bd-empty-state__title">{{ title() }}</h3>
      @if (description()) {
        <p class="bd-empty-state__description">{{ description() }}</p>
      }
      <div class="bd-empty-state__actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .bd-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--space-xl) var(--space-md);
      background-color: var(--white);
      border: 1px dashed var(--slate-300);
      border-radius: var(--radius-md);
      margin: var(--space-md) 0;
    }

    .bd-empty-state__icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background-color: var(--slate-100);
      color: var(--slate-500);
      margin-bottom: var(--space-md);
    }

    .bd-empty-state__title {
      font-size: var(--fs-md);
      font-weight: 600;
      color: var(--blue-950);
      margin: 0 0 var(--space-xs) 0;
    }

    .bd-empty-state__description {
      font-size: var(--fs-sm);
      color: var(--slate-500);
      max-width: 440px;
      margin: 0 0 var(--space-md) 0;
      line-height: var(--lh-normal);
    }

    .bd-empty-state__actions {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-top: var(--space-xs);
    }
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly icon = input<LucideIconData | null>(null);
}
