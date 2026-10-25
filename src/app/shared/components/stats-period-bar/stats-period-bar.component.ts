import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { DateNavComponent } from '../date-nav/date-nav.component';
import { FieldComponent } from '../field/field.component';
import {
  SegmentedComponent,
  SegmentedOption,
} from '../segmented/segmented.component';
import { StatsPeriod, StatsPeriodKind, validateStatsRange } from '../../utils/stats-period';

const PERIOD_OPTIONS: SegmentedOption<StatsPeriodKind>[] = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'rango', label: 'Rango' },
];

const PERIOD_OPTIONS_WITH_ALL: SegmentedOption<StatsPeriodKind>[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'rango', label: 'Rango' },
];

@Component({
  selector: 'bd-stats-period-bar',
  standalone: true,
  imports: [DateNavComponent, FieldComponent, SegmentedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stats-period-bar">
      <bd-segmented
        label="Período"
        [options]="periodOptions()"
        [value]="period().kind"
        (valueChange)="kindChange.emit($event)"
      />

      @if (period().kind === 'rango') {
        <form class="stats-period-bar__range" novalidate (submit)="$event.preventDefault(); apply()">
          <bd-field label="Desde" fieldId="stats-desde">
            <input
              id="stats-desde"
              #fromInput
              class="input"
              type="date"
              [value]="fromDate()"
              (change)="fromDate.set(fromInput.value)"
            />
          </bd-field>
          <bd-field label="Hasta" fieldId="stats-hasta">
            <input
              id="stats-hasta"
              #toInput
              class="input"
              type="date"
              [value]="toDate()"
              (change)="toDate.set(toInput.value)"
            />
          </bd-field>
          <button type="submit" class="btn btn-primary">Aplicar</button>
          @if (rangeError(); as message) {
            <p class="stats-period-bar__error" role="alert">{{ message }}</p>
          }
        </form>
      } @else if (period().kind !== 'todas') {
        <bd-date-nav
          [date]="period().anchorDate"
          [label]="period().label"
          [unit]="period().unit"
          [isToday]="period().isToday"
          (prev)="shift.emit(-1)"
          (next)="shift.emit(1)"
          (today)="today.emit()"
        />
      }
    </div>
  `,
  styles: `
    @use '../../styles/breakpoints' as bp;

    .stats-period-bar {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      min-width: 0;
    }

    .stats-period-bar__range {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-sm);
      align-items: end;
    }

    .stats-period-bar__error {
      grid-column: 1 / -1;
      margin: 0;
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--coral-700);
    }

    .stats-period-bar__range .btn {
      min-height: 44px;
    }

    .stats-period-bar__range .input {
      min-height: 44px;
      width: 100%;
      box-sizing: border-box;
    }

    @include bp.bp-up(md) {
      .stats-period-bar {
        flex-direction: row;
        align-items: flex-end;
        flex-wrap: wrap;
      }

      .stats-period-bar__range {
        grid-template-columns: repeat(2, minmax(10rem, 14rem)) auto;
      }
    }
  `,
})
export class StatsPeriodBarComponent {
  readonly period = input.required<StatsPeriod>();
  readonly allowAll = input<boolean>(false);

  readonly kindChange = output<StatsPeriodKind>();
  readonly shift = output<-1 | 1>();
  readonly today = output<void>();
  readonly rangeApply = output<{ from: string; to: string }>();

  readonly periodOptions = computed(() =>
    this.allowAll() ? PERIOD_OPTIONS_WITH_ALL : PERIOD_OPTIONS
  );

  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');
  readonly rangeError = signal<string | null>(null);

  constructor() {
    // Precarga el formulario de rango con el período que se estaba viendo.
    effect(() => {
      const period = this.period();
      untracked(() => {
        this.fromDate.set(period.from ?? '');
        this.toDate.set(period.to ?? '');
        this.rangeError.set(null);
      });
    });
  }

  apply(): void {
    const from = this.fromDate();
    const to = this.toDate();
    const error = validateStatsRange(from, to);
    this.rangeError.set(error);
    if (!error) {
      this.rangeApply.emit({ from, to });
    }
  }
}

