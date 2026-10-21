import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SkeletonVariant = 'line' | 'rect' | 'circle';

@Component({
  selector: 'bd-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bd-skeleton bd-skeleton--{{ variant() }}"
      [style.width]="width()"
      [style.height]="height()"
      [style.border-radius]="borderRadius()"
      aria-hidden="true"
    ></div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .bd-skeleton {
      background: linear-gradient(
        90deg,
        var(--slate-100) 25%,
        var(--slate-200) 50%,
        var(--slate-100) 75%
      );
      background-size: 200% 100%;
      animation: bd-skeleton-shimmer 1.8s ease-in-out infinite;
    }

    .bd-skeleton--line {
      height: 1rem;
      border-radius: var(--radius-sm);
    }

    .bd-skeleton--rect {
      border-radius: var(--radius-sm);
    }

    .bd-skeleton--circle {
      border-radius: 50%;
    }

    @keyframes bd-skeleton-shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .bd-skeleton {
        animation: none;
        background: var(--slate-100);
      }
    }
  `,
})
export class SkeletonComponent {
  readonly variant = input<SkeletonVariant>('rect');
  readonly width = input<string>('100%');
  readonly height = input<string>('1rem');
  readonly borderRadius = input<string | null>(null);
}
