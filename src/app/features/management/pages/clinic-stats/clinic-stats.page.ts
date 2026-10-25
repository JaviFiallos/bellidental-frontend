import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { ClinicClock } from '../../../../core/services/clinic-clock.service';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import {
  parseStatsPeriod,
  shiftStatsAnchor,
  StatsPeriodKind,
} from '../../../../shared/utils/stats-period';
import { ClinicStatsStore } from '../../services/clinic-stats.store';
import { StatsKpisComponent } from '../../components/stats-kpis/stats-kpis.component';
import { StatsPeriodBarComponent } from '../../../../shared/components/stats-period-bar/stats-period-bar.component';
import { BarListComponent } from '../../components/bar-list/bar-list.component';
import { DailyActivityChartComponent } from '../../components/daily-activity-chart/daily-activity-chart.component';
import { ProfessionalStatsTableComponent } from '../../components/professional-stats-table/professional-stats-table.component';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { groupDailyStats } from '../../domain/daily-series';
import {
  appointmentStatusRows,
  channelRows,
  paymentMethodRows,
  topDiagnosisRows,
  topTreatmentRows,
} from '../../domain/stats-labels';

@Component({
  selector: 'bd-clinic-stats-page',
  standalone: true,
  imports: [
    AlertComponent,
    BarListComponent,
    DailyActivityChartComponent,
    PageHeaderComponent,
    ProfessionalStatsTableComponent,
    SkeletonComponent,
    StatsKpisComponent,
    StatsPeriodBarComponent,
  ],
  providers: [ClinicStatsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="clinic-stats">
      <bd-page-header title="Estadísticas" [subtitle]="period().label" />

      <bd-stats-period-bar
        [period]="period()"
        (kindChange)="onKindChange($event)"
        (shift)="onShift($event)"
        (today)="onToday()"
        (rangeApply)="onRangeApply($event)"
      />

      @if (store.error(); as message) {
        <bd-alert variant="error" [message]="message">
          <button type="button" class="btn btn-primary" (click)="store.retry()">Reintentar</button>
        </bd-alert>
      } @else {
        <bd-stats-kpis [summary]="store.summary()" />

        <div class="clinic-stats__panels">
          @if (store.summary(); as stats) {
            <section class="card clinic-stats__panel clinic-stats__panel--full" aria-labelledby="stats-daily-title">
              <h2 id="stats-daily-title" class="clinic-stats__panel-title">Actividad por día</h2>
              <bd-daily-activity-chart
                [buckets]="dailySeries().buckets"
                [granularity]="dailySeries().granularity"
              />
            </section>

            <section class="card clinic-stats__panel" aria-labelledby="stats-status-title">
              <h2 id="stats-status-title" class="clinic-stats__panel-title">Citas por estado</h2>
              <bd-bar-list [rows]="statusRows()" ariaLabel="Citas por estado" />
            </section>

            <section class="card clinic-stats__panel" aria-labelledby="stats-channel-title">
              <h2 id="stats-channel-title" class="clinic-stats__panel-title">Citas por canal</h2>
              <bd-bar-list [rows]="channelRowsView()" ariaLabel="Citas por canal" />
            </section>

            <section class="card clinic-stats__panel" aria-labelledby="stats-method-title">
              <h2 id="stats-method-title" class="clinic-stats__panel-title">Cobrado por método</h2>
              <bd-bar-list [rows]="methodRows()" ariaLabel="Cobrado por método" />
            </section>

            <section class="card clinic-stats__panel" aria-labelledby="stats-professional-title">
              <h2 id="stats-professional-title" class="clinic-stats__panel-title">Por profesional</h2>
              <bd-professional-stats-table [rows]="stats.byProfessional" />
            </section>

            <section class="card clinic-stats__panel" aria-labelledby="stats-treatment-title">
              <h2 id="stats-treatment-title" class="clinic-stats__panel-title">Top 3 tratamientos</h2>
              <bd-bar-list
                [rows]="topTreatmentRowsView()"
                ariaLabel="Top 3 tratamientos"
                emptyText="Sin tratamientos en el período"
              />
            </section>

            <section class="card clinic-stats__panel" aria-labelledby="stats-diagnoses-title">
              <h2 id="stats-diagnoses-title" class="clinic-stats__panel-title">Top 3 diagnósticos</h2>
              <bd-bar-list
                [rows]="topDiagnosisRowsView()"
                ariaLabel="Top 3 diagnósticos"
                emptyText="Sin diagnósticos en el período"
              />
            </section>
          } @else {
            <section class="card clinic-stats__panel clinic-stats__panel--full" aria-busy="true">
              <bd-skeleton height="1.25rem" width="30%" />
              <bd-skeleton height="12rem" width="100%" />
            </section>
            @for (index of placeholders; track index) {
              <section class="card clinic-stats__panel" aria-busy="true">
                <bd-skeleton height="1.25rem" width="50%" />
                <bd-skeleton height="6rem" width="100%" />
              </section>
            }
          }
        </div>
      }
    </section>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .clinic-stats {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      min-width: 0;
      padding: var(--space-md);
      box-sizing: border-box;

      @include bp.bp-up(md) {
        padding: var(--space-lg);
      }
    }

    .clinic-stats .btn {
      min-height: 44px;
    }

    .clinic-stats__panels {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
      gap: var(--space-md);
      min-width: 0;
    }

    .clinic-stats__panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      min-width: 0;
      margin: 0;
    }

    .clinic-stats__panel--full {
      grid-column: 1 / -1;
    }

    .clinic-stats__panel-title {
      margin: 0;
      font-size: var(--fs-md);
      font-weight: 600;
      color: var(--blue-950);
    }
  `,
})
export class ClinicStatsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clinicClock = inject(ClinicClock);
  readonly store = inject(ClinicStatsStore);
  readonly placeholders = [1, 2, 3, 4, 5, 6];

  private readonly moneyPipe = new MoneyPipe();
  readonly dailySeries = computed(() => {
    const s = this.store.summary();
    return s
      ? groupDailyStats(s.byDay ?? [], s.from, s.to)
      : { granularity: 'day' as const, buckets: [] };
  });
  readonly statusRows = computed(() =>
    appointmentStatusRows(this.store.summary()?.appointments.byStatus ?? {})
  );
  readonly channelRowsView = computed(() => channelRows(this.store.summary()?.byChannel ?? []));
  readonly methodRows = computed(() =>
    paymentMethodRows(this.store.summary()?.billing.byMethod ?? {}, (value) =>
      this.moneyPipe.transform(value)
    )
  );
  readonly topTreatmentRowsView = computed(() =>
    topTreatmentRows(this.store.summary()?.topTreatments ?? [], (value) =>
      this.moneyPipe.transform(value)
    )
  );
  readonly topDiagnosisRowsView = computed(() =>
    topDiagnosisRows(this.store.summary()?.topDiagnoses ?? [])
  );

  /** Período leído de la URL (`?periodo=&fecha=&desde=&hasta=`), para que "Atrás" lo conserve. */
  readonly period = toSignal(
    this.route.queryParamMap.pipe(
      map((params) =>
        parseStatsPeriod(
          params.get('periodo'),
          params.get('fecha'),
          params.get('desde'),
          params.get('hasta'),
          this.clinicClock.todayDateString()
        )
      )
    ),
    { requireSync: true }
  );

  constructor() {
    effect(() => {
      const period = this.period();
      untracked(() => this.store.load(period));
    });
  }

  onKindChange(kind: StatsPeriodKind): void {
    if (kind === 'rango') {
      const today = this.clinicClock.todayDateString();
      this.navigateToRange(this.period().from ?? today, this.period().to ?? today);
      return;
    }
    this.navigateTo(kind, this.period().anchorDate);
  }

  onShift(direction: -1 | 1): void {
    this.navigateTo(this.period().kind, shiftStatsAnchor(this.period(), direction));
  }

  onToday(): void {
    this.navigateTo(this.period().kind, this.clinicClock.todayDateString());
  }

  onRangeApply(range: { from: string; to: string }): void {
    this.navigateToRange(range.from, range.to);
  }

  private navigateTo(kind: StatsPeriodKind, anchorDate: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { periodo: kind, fecha: anchorDate, desde: null, hasta: null },
    });
  }

  private navigateToRange(from: string, to: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { periodo: 'rango', fecha: null, desde: from, hasta: to },
    });
  }
}
