import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BarTone = 'scheduled' | 'attended' | 'no-show' | 'cancelled';

export interface BarRow {
  key: string;
  label: string;
  value: number;
  valueText: string;
  tone?: BarTone;
  rank?: number;
  detail?: string;
}

/** Lista de barras horizontales en CSS. La cifra siempre va visible junto a la etiqueta. */
@Component({
  selector: 'bd-bar-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasData()) {
      <ul class="bar-list" role="list" [attr.aria-label]="ariaLabel()">
        @for (row of rows(); track row.key) {
          <li class="bar-list__item">
            <div class="bar-list__header">
              <span class="bar-list__name">
                @if (row.rank !== undefined) {
                  <span class="bar-list__rank" aria-hidden="true">{{ row.rank }}</span>
                }
                <span class="bar-list__text">
                  <span class="bar-list__label">{{ row.label }}</span>
                  @if (row.detail) {
                    <span class="bar-list__detail">{{ row.detail }}</span>
                  }
                </span>
              </span>
              <span class="bar-list__value">{{ row.valueText }}</span>
            </div>
            <div class="bar-list__track">
              <div
                class="bar-list__fill"
                aria-hidden="true"
                [attr.data-tone]="row.tone ?? 'neutral'"
                [style.width.%]="widthOf(row)"
              ></div>
            </div>
          </li>
        }
      </ul>
    } @else {
      <p class="bar-list__empty">{{ emptyText() }}</p>
    }
  `,
  styles: `
    .bar-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .bar-list__header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--space-sm);
      margin-bottom: 0.25rem;
      font-size: var(--fs-sm);
    }

    .bar-list__name {
      display: flex;
      align-items: baseline;
      gap: var(--space-sm);
      min-width: 0;
    }

    .bar-list__rank {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--blue-950);
      background-color: var(--blue-50);
    }

    .bar-list__text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .bar-list__label {
      color: var(--slate-600);
      overflow-wrap: anywhere;
      min-width: 0;
    }

    .bar-list__detail {
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
    }

    .bar-list__value {
      font-weight: 600;
      color: var(--blue-950);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .bar-list__track {
      width: 100%;
      height: 0.75rem;
      background-color: var(--blue-50);
      border-radius: 999px;
      overflow: hidden;
    }

    .bar-list__fill {
      height: 100%;
      min-width: 0;
      border-radius: 999px;
      background-color: var(--blue-400);
    }

    .bar-list__fill[data-tone='scheduled'] {
      background-color: var(--blue-600);
    }

    .bar-list__fill[data-tone='attended'] {
      background-color: var(--teal-500);
    }

    .bar-list__fill[data-tone='no-show'] {
      background-color: var(--coral-500);
    }

    .bar-list__fill[data-tone='cancelled'] {
      background-color: var(--slate-300);
    }

    .bar-list__empty {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--slate-600);
    }
  `,
})
export class BarListComponent {
  readonly rows = input.required<BarRow[]>();
  readonly ariaLabel = input.required<string>();
  readonly emptyText = input<string>('Sin datos en el período');

  readonly hasData = computed(() => this.rows().some((row) => row.value > 0));

  private readonly maxValue = computed(() =>
    this.rows().reduce((max, row) => Math.max(max, row.value), 0)
  );

  widthOf(row: BarRow): number {
    if (row.value <= 0 || this.maxValue() <= 0) return 0;
    return Math.max(2, (row.value / this.maxValue()) * 100);
  }
}
