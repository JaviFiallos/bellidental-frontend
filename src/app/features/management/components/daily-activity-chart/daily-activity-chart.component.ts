import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { DailyBucket, DailyGranularity } from '../../domain/daily-series';

export type DailyMetricKey = 'completedEncounters' | 'appointments' | 'newPatients' | 'collected';

interface MetricOption {
  key: DailyMetricKey;
  label: string;
}

const METRICS: MetricOption[] = [
  { key: 'completedEncounters', label: 'Pacientes atendidos' },
  { key: 'appointments', label: 'Citas' },
  { key: 'newPatients', label: 'Pacientes nuevos' },
  { key: 'collected', label: 'Ingresos' },
];

/** Gráfico de actividad por día con selector de métrica y barras en SVG/CSS. */
@Component({
  selector: 'bd-daily-activity-chart',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="daily-chart">
      <div class="daily-chart__toolbar" role="toolbar" aria-label="Métricas del gráfico de actividad">
        <span class="daily-chart__toolbar-label">Métrica:</span>
        <div class="daily-chart__metric-buttons">
          @for (option of metrics; track option.key) {
            <button
              type="button"
              class="btn daily-chart__metric-btn"
              [class.btn-primary]="selectedMetric() === option.key"
              [class.btn-outline]="selectedMetric() !== option.key"
              [attr.aria-pressed]="selectedMetric() === option.key"
              (click)="onSelectMetric(option.key)"
            >
              {{ option.label }}
            </button>
          }
        </div>
      </div>

      <div
        class="daily-chart__canvas-wrapper"
        role="img"
        [attr.aria-label]="chartAriaLabel()"
      >
        <div class="daily-chart__scroll-area">
          <div class="daily-chart__bars">
            @for (bucket of buckets(); track bucket.label) {
              @let val = valueFor(bucket);
              @let pct = heightPercent(val);
              <div
                class="daily-chart__column"
                tabindex="0"
                [attr.aria-label]="bucket.ariaLabel + ': ' + formattedValue(val)"
              >
                <div class="daily-chart__bar-track">
                  <div
                    class="daily-chart__bar"
                    [style.height.%]="pct"
                    [class.daily-chart__bar--zero]="val === 0"
                  >
                    <span class="daily-chart__tooltip" role="tooltip">
                      {{ formattedValue(val) }}
                    </span>
                  </div>
                </div>
                <span class="daily-chart__label">{{ bucket.label }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <table class="visually-hidden" [attr.aria-label]="'Detalle de ' + currentMetricLabel()">
        <thead>
          <tr>
            <th scope="col">Período</th>
            <th scope="col">{{ currentMetricLabel() }}</th>
          </tr>
        </thead>
        <tbody>
          @for (bucket of buckets(); track bucket.label) {
            <tr>
              <td>{{ bucket.ariaLabel }}</td>
              <td>{{ formattedValue(valueFor(bucket)) }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      width: 100%;
    }

    .daily-chart {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      min-width: 0;
    }

    .daily-chart__toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-sm);
    }

    .daily-chart__toolbar-label {
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--color-text-muted);
    }

    .daily-chart__metric-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
    }

    .daily-chart__metric-btn {
      min-height: 44px;
      padding: 0 var(--space-md);
      font-size: var(--fs-sm);
    }

    .daily-chart__canvas-wrapper {
      position: relative;
      background-color: color-mix(in srgb, var(--color-surface) 95%, var(--slate-100));
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-md) var(--space-sm) var(--space-xs);
      box-sizing: border-box;
      min-width: 0;
    }

    .daily-chart__scroll-area {
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      min-width: 0;
      padding-bottom: var(--space-xs);
    }

    .daily-chart__bars {
      display: flex;
      align-items: flex-end;
      gap: var(--space-xs);
      height: 12rem;
      min-width: fit-content;
      padding-top: var(--space-lg);
    }

    .daily-chart__column {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      min-width: 2.75rem;
      flex: 1 0 auto;
      height: 100%;
      cursor: pointer;
      outline: none;
    }

    .daily-chart__column:focus-visible .daily-chart__bar {
      outline: 2px solid var(--blue-950);
      outline-offset: 2px;
    }

    .daily-chart__column:hover .daily-chart__tooltip,
    .daily-chart__column:focus-visible .daily-chart__tooltip {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(-4px);
    }

    .daily-chart__bar-track {
      position: relative;
      width: 1.5rem;
      height: calc(100% - 1.75rem);
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .daily-chart__bar {
      position: relative;
      width: 100%;
      background-color: var(--teal-700);
      border-radius: var(--radius-xs) var(--radius-xs) 0 0;
      transition: height 0.2s ease-out, background-color 0.15s ease;
      min-height: 2px;
    }

    .daily-chart__bar--zero {
      min-height: 0;
      height: 0 !important;
    }

    .daily-chart__column:hover .daily-chart__bar,
    .daily-chart__column:focus-visible .daily-chart__bar {
      background-color: color-mix(in srgb, var(--teal-700) 80%, var(--blue-950));
    }

    .daily-chart__tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(0);
      background-color: var(--blue-950);
      color: var(--white);
      padding: 2px 6px;
      font-size: var(--fs-xs);
      font-weight: 600;
      border-radius: var(--radius-xs);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.15s ease, transform 0.15s ease;
      z-index: 10;
      box-shadow: var(--shadow-sm);
    }

    .daily-chart__label {
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
      margin-top: var(--space-xs);
      white-space: nowrap;
      text-align: center;
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `,
})
export class DailyActivityChartComponent {
  readonly buckets = input.required<DailyBucket[]>();
  readonly granularity = input<DailyGranularity>('day');

  readonly metrics = METRICS;
  readonly selectedMetric = signal<DailyMetricKey>('completedEncounters');

  private readonly moneyPipe = new MoneyPipe();

  readonly currentMetricLabel = computed(() => {
    const key = this.selectedMetric();
    return METRICS.find((m) => m.key === key)?.label ?? 'Pacientes atendidos';
  });

  readonly maxValue = computed(() => {
    const list = this.buckets();
    if (list.length === 0) return 0;
    const values = list.map((b) => this.valueFor(b));
    return Math.max(0, ...values);
  });

  readonly totalValue = computed(() => {
    return this.buckets().reduce((acc, b) => acc + this.valueFor(b), 0);
  });

  readonly chartAriaLabel = computed(() => {
    const metric = this.currentMetricLabel();
    const count = this.buckets().length;
    const total = this.formattedValue(this.totalValue());
    return `Gráfico de actividad por día: ${metric}. Total: ${total} en ${count} períodos.`;
  });

  onSelectMetric(metric: DailyMetricKey): void {
    this.selectedMetric.set(metric);
  }

  valueFor(bucket: DailyBucket): number {
    const key = this.selectedMetric();
    return bucket[key];
  }

  heightPercent(val: number): number {
    const max = this.maxValue();
    if (max <= 0 || val <= 0) return 0;
    return Math.round((val / max) * 100);
  }

  formattedValue(val: number): string {
    if (this.selectedMetric() === 'collected') {
      return this.moneyPipe.transform(val);
    }
    return String(val);
  }
}
