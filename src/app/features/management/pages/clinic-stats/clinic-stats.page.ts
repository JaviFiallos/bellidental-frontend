import {
  ChangeDetectionStrategy,
  Component,
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
import {
  parseStatsPeriod,
  shiftStatsAnchor,
  StatsPeriodKind,
} from '../../domain/stats-period';
import { ClinicStatsStore } from '../../services/clinic-stats.store';
import { StatsKpisComponent } from '../../components/stats-kpis/stats-kpis.component';
import { StatsPeriodBarComponent } from '../../components/stats-period-bar/stats-period-bar.component';

@Component({
  selector: 'bd-clinic-stats-page',
  standalone: true,
  imports: [AlertComponent, PageHeaderComponent, StatsKpisComponent, StatsPeriodBarComponent],
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
  `,
})
export class ClinicStatsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clinicClock = inject(ClinicClock);
  readonly store = inject(ClinicStatsStore);

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
      this.navigateToRange(this.period().from, this.period().to);
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
