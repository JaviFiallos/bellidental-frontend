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
import { SessionStore } from '../../../../core/auth/session.store';
import { ClinicClock } from '../../../../core/services/clinic-clock.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatsPeriodBarComponent } from '../../../../shared/components/stats-period-bar/stats-period-bar.component';
import {
  parseStatsPeriod,
  shiftStatsAnchor,
  StatsPeriodKind,
} from '../../../../shared/utils/stats-period';
import { PatientListFiltersComponent } from '../../components/patient-list-filters/patient-list-filters.component';
import { PatientListTableComponent } from '../../components/patient-list-table/patient-list-table.component';
import { PatientListView } from '../../models/patient.models';
import { PatientListStore } from '../../services/patient-list.store';

@Component({
  selector: 'bd-patient-list-page',
  standalone: true,
  imports: [
    EmptyStateComponent,
    PageHeaderComponent,
    PatientListFiltersComponent,
    PatientListTableComponent,
    StatsPeriodBarComponent,
  ],
  providers: [PatientListStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="patient-list-page">
      <bd-page-header
        title="Pacientes"
        subtitle="Lista de últimos atendidos y últimos registrados"
      />

      @if (unlinkedUser()) {
        <bd-empty-state title="Tu usuario no está registrado como profesional" />
      } @else {
      <bd-stats-period-bar
        [period]="period()"
        [allowAll]="true"
        (kindChange)="onPeriodKindChange($event)"
        (shift)="onShift($event)"
        (today)="onToday()"
        (rangeApply)="onRangeApply($event)"
      />

      <bd-patient-list-filters
        [view]="view()"
        [query]="query()"
        [withBalance]="withBalance()"
        [canFilterBalance]="canFilterBalance()"
        (viewChange)="onViewChange($event)"
        (queryChange)="onQueryChange($event)"
        (withBalanceChange)="onWithBalanceChange($event)"
      />

      <bd-patient-list-table
        [items]="store.items()"
        [view]="view()"
        [canViewBalance]="canViewBalance()"
        [canView033]="canView033()"
        [loading]="store.loading()"
        [error]="store.error()"
        [page]="store.page()"
        [totalPages]="store.totalPages()"
        [totalElements]="store.totalElements()"
        [hasActiveFilters]="hasActiveFilters()"
        (pageChange)="onPageChange($event)"
        (retry)="store.retry()"
        (clearFilters)="onClearFilters()"
      />
      }
    </section>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .patient-list-page {
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
  `,
})
export class PatientListPage {
  readonly store = inject(PatientListStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly clock = inject(ClinicClock);
  private readonly sessionStore = inject(SessionStore);

  private readonly queryParams = toSignal(this.route.queryParamMap);

  readonly canFilterBalance = computed(() => this.sessionStore.hasPermission('BILLING_READ'));
  readonly canViewBalance = computed(() => this.sessionStore.hasPermission('BILLING_READ'));
  /** Odontólogo o director sin profesional vinculado: mismo aviso que «Mis atenciones» (la secretaria siempre ve la lista). */
  readonly unlinkedUser = computed(() => {
    const profile = this.sessionStore.profile();
    return (
      (profile === 'ODONTOLOGO' || profile === 'DIRECTOR') &&
      !this.sessionStore.currentUser()?.professionalId
    );
  });

  readonly canView033 = computed(() => {
    const profile = this.sessionStore.profile();
    return profile === 'ODONTOLOGO' || profile === 'DIRECTOR';
  });

  readonly period = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => {
        return parseStatsPeriod(
          params.get('periodo'),
          params.get('fecha'),
          params.get('desde'),
          params.get('hasta'),
          this.clock.todayDateString(),
          'todas',
          true
        );
      })
    ),
    { requireSync: true }
  );

  readonly view = computed<PatientListView>(() => {
    const raw = this.queryParams()?.get('vista');
    return raw === 'registrados' ? 'CREATED' : 'ATTENDED';
  });

  readonly query = computed<string>(() => {
    return this.queryParams()?.get('q') || '';
  });

  readonly withBalance = computed<boolean>(() => {
    return this.canFilterBalance() && this.queryParams()?.get('saldo') === '1';
  });

  readonly page = computed<number>(() => {
    const raw = this.queryParams()?.get('pagina');
    const p = raw !== null && raw !== undefined ? parseInt(raw, 10) : 0;
    return isNaN(p) || p < 0 ? 0 : p;
  });

  readonly hasActiveFilters = computed<boolean>(() => {
    return (
      this.query().length >= 2 ||
      this.withBalance() ||
      this.period().kind !== 'todas'
    );
  });

  constructor() {
    effect(() => {
      const view = this.view();
      const period = this.period();
      const query = this.query();
      const withBalance = this.withBalance();
      const page = this.page();
      if (this.unlinkedUser()) {
        return;
      }

      untracked(() => {
        this.store.load({
          view,
          from: period.from,
          to: period.to,
          withBalance: withBalance ? true : undefined,
          query: query.length >= 2 ? query : undefined,
          page,
          size: 20,
        });
      });
    });
  }

  onViewChange(view: PatientListView): void {
    this.updateQuery({
      vista: view === 'CREATED' ? 'registrados' : null,
      pagina: 0,
    });
  }

  onQueryChange(q: string): void {
    this.updateQuery({
      q: q.length >= 2 ? q : null,
      pagina: 0,
    });
  }

  onWithBalanceChange(checked: boolean): void {
    this.updateQuery({
      saldo: checked ? '1' : null,
      pagina: 0,
    });
  }

  onPeriodKindChange(kind: StatsPeriodKind): void {
    if (kind === 'todas') {
      this.updateQuery({
        periodo: null,
        fecha: null,
        desde: null,
        hasta: null,
        pagina: 0,
      });
      return;
    }
    if (kind === 'rango') {
      const today = this.clock.todayDateString();
      this.updateQuery({
        periodo: 'rango',
        fecha: null,
        desde: this.period().from ?? today,
        hasta: this.period().to ?? today,
        pagina: 0,
      });
      return;
    }
    this.updateQuery({
      periodo: kind,
      fecha: this.period().anchorDate,
      desde: null,
      hasta: null,
      pagina: 0,
    });
  }

  onShift(direction: -1 | 1): void {
    this.updateQuery({
      periodo: this.period().kind,
      fecha: shiftStatsAnchor(this.period(), direction),
      pagina: 0,
    });
  }

  onToday(): void {
    this.updateQuery({
      periodo: this.period().kind,
      fecha: this.clock.todayDateString(),
      pagina: 0,
    });
  }

  onRangeApply(range: { from: string; to: string }): void {
    this.updateQuery({
      periodo: 'rango',
      fecha: null,
      desde: range.from,
      hasta: range.to,
      pagina: 0,
    });
  }

  onPageChange(page: number): void {
    this.updateQuery({ pagina: page });
  }

  onClearFilters(): void {
    this.updateQuery({
      q: null,
      saldo: null,
      periodo: null,
      fecha: null,
      desde: null,
      hasta: null,
      pagina: 0,
    });
  }

  private updateQuery(params: Record<string, string | number | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
