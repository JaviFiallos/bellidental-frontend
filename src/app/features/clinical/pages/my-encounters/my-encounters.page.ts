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
import { DateNavComponent } from '../../../../shared/components/date-nav/date-nav.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  SegmentedComponent,
  SegmentedOption,
} from '../../../../shared/components/segmented/segmented.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { EncounterLogTableComponent } from '../../components/encounter-log-table/encounter-log-table.component';
import { encounterSummaryText } from '../../domain/encounter-log';
import {
  CalendarPeriodKind,
  parseCalendarPeriod,
  shiftCalendarAnchor,
} from '../../../../shared/utils/calendar-period';
import { MyEncountersStore } from '../../services/my-encounters.store';

@Component({
  selector: 'bd-my-encounters-page',
  standalone: true,
  imports: [
    AlertComponent,
    DateNavComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    SegmentedComponent,
    SkeletonComponent,
    EncounterLogTableComponent,
  ],
  providers: [MyEncountersStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="my-encounters">
      <bd-page-header title="Mis atenciones" [subtitle]="summary()" />

      <div class="my-encounters__toolbar">
        <bd-segmented
          label="Tipo de período"
          [options]="periodOptions"
          [value]="period().kind"
          (valueChange)="onKindChange($event)"
        />

        <bd-date-nav
          [date]="period().anchorDate"
          [label]="period().label"
          [unit]="period().unit"
          [isToday]="period().isToday"
          (prev)="onShift(-1)"
          (next)="onShift(1)"
          (today)="onToday()"
        />

        <label class="my-encounters__only-open">
          <input
            #onlyOpenInput
            type="checkbox"
            [checked]="store.onlyOpen()"
            (change)="store.setOnlyOpen(onlyOpenInput.checked)"
          />
          <span>Solo abiertas</span>
        </label>
      </div>

      @if (store.unlinkedUser()) {
        <bd-empty-state title="Tu usuario no está registrado como profesional" />
      } @else if (store.loading()) {
        <div class="my-encounters__skeleton" aria-busy="true">
          <bd-skeleton height="3rem" width="100%" />
          <bd-skeleton height="3rem" width="100%" />
          <bd-skeleton height="3rem" width="100%" />
        </div>
      } @else if (store.error()) {
        <div class="my-encounters__error">
          <bd-alert variant="error" [message]="store.error()">
            <button type="button" class="btn btn-primary" (click)="store.retry()">
              Reintentar
            </button>
          </bd-alert>
        </div>
      } @else if (store.visibleEncounters().length === 0) {
        <bd-empty-state
          [title]="store.onlyOpen() ? 'No hay atenciones abiertas en este período' : 'No hay atenciones en este período'"
        />
      } @else {
        <bd-encounter-log-table [appointments]="store.visibleEncounters()" />
      }
    </section>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .my-encounters {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      min-width: 0;
      padding: var(--space-md);
      box-sizing: border-box;
    }

    .my-encounters__toolbar {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-sm);

      @include bp.bp-up(md) {
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
      }
    }

    .my-encounters__only-open {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      min-height: 44px;
      font-size: var(--fs-sm);
      color: var(--slate-800);
      cursor: pointer;
    }

    .my-encounters__only-open input {
      width: 1.25rem;
      height: 1.25rem;
      accent-color: var(--blue-800);
    }

    .my-encounters__only-open:has(input:focus-visible) {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
    }

    .my-encounters__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .my-encounters__error .btn {
      min-height: 44px;
    }
  `,
})
export class MyEncountersPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clinicClock = inject(ClinicClock);
  readonly store = inject(MyEncountersStore);

  readonly periodOptions: SegmentedOption<CalendarPeriodKind>[] = [
    { value: 'dia', label: 'Día' },
    { value: 'semana', label: 'Semana' },
    { value: 'mes', label: 'Mes' },
  ];

  /** Período leído de la URL (`?periodo=&fecha=`), para que "Atrás" desde una atención lo conserve. */
  readonly period = toSignal(
    this.route.queryParamMap.pipe(
      map((params) =>
        parseCalendarPeriod(
          params.get('periodo'),
          params.get('fecha'),
          this.clinicClock.todayDateString()
        )
      )
    ),
    { requireSync: true }
  );

  readonly summary = computed(() =>
    this.store.unlinkedUser() || this.store.loading()
      ? null
      : encounterSummaryText(this.store.encounters().length, this.store.openCount())
  );

  constructor() {
    effect(() => {
      const period = this.period();
      untracked(() => this.store.load(period));
    });
  }

  onKindChange(kind: CalendarPeriodKind): void {
    this.navigateTo(kind, this.period().anchorDate);
  }

  onShift(direction: -1 | 1): void {
    this.navigateTo(this.period().kind, shiftCalendarAnchor(this.period(), direction));
  }

  onToday(): void {
    this.navigateTo(this.period().kind, this.clinicClock.todayDateString());
  }

  private navigateTo(kind: CalendarPeriodKind, anchorDate: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { periodo: kind, fecha: anchorDate },
    });
  }
}
