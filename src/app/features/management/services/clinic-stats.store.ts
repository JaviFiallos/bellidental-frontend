import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import { DashboardSummary } from '../models/dashboard.models';
import { DashboardApi } from './dashboard.api';
import { StatsPeriod } from '../../../shared/utils/stats-period';

@Injectable()
export class ClinicStatsStore {
  private readonly dashboardApi = inject(DashboardApi);

  private readonly requests = new Subject<StatsPeriod>();
  private lastPeriod: StatsPeriod | null = null;

  readonly summary = signal<DashboardSummary | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.requests
      .pipe(
        switchMap((period) => this.fetchSummary(period)),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  load(period: StatsPeriod): void {
    this.lastPeriod = period;
    this.requests.next(period);
  }

  retry(): void {
    if (this.lastPeriod) {
      this.load(this.lastPeriod);
    }
  }

  private fetchSummary(period: StatsPeriod): Observable<DashboardSummary> {
    this.loading.set(true);
    this.error.set(null);
    this.summary.set(null);

    return this.dashboardApi.summary(period.from ?? '', period.to ?? '').pipe(
      tap({
        next: (summary) => {
          this.summary.set(summary);
          this.loading.set(false);
        },
        error: (err: ApiError) => {
          this.loading.set(false);
          this.error.set(err?.message || 'No se pudieron cargar las estadísticas');
        },
      }),
      catchError(() => EMPTY)
    );
  }
}
