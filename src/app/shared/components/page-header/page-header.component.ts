import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'bd-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div class="page-header__titles">
        <h1 class="page-header__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="page-header__subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="page-header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    .page-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-md);
      margin-bottom: var(--space-lg);
    }

    .page-header__titles {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .page-header__title {
      font-size: var(--fs-xl);
      color: var(--blue-900);
      margin: 0;
      line-height: var(--lh-tight);
    }

    .page-header__subtitle {
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
      margin: 0;
    }

    .page-header__actions {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
}
