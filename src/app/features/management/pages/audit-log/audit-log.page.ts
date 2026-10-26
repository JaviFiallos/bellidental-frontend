import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { ClinicClock } from '../../../../core/services/clinic-clock.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  AuditFiltersComponent,
  AuditFiltersValues,
} from '../../components/audit-filters/audit-filters.component';
import { StatsPeriodBarComponent } from '../../../../shared/components/stats-period-bar/stats-period-bar.component';
import { AuditTimelineComponent } from '../../components/audit-timeline/audit-timeline.component';
import { AUDIT_ENTITY_LABELS } from '../../domain/audit-display';
import {
  parseStatsPeriod,
  shiftStatsAnchor,
  StatsPeriodKind,
} from '../../../../shared/utils/stats-period';
import { AuditEntityName, AuditLogEntry } from '../../models/audit.models';
import { AuditHistoryDialogService } from '../../services/audit-history-dialog.service';
import { AuditLogStore } from '../../services/audit-log.store';

@Component({
  selector: 'bd-audit-log-page',
  standalone: true,
  imports: [
    AuditFiltersComponent,
    AuditTimelineComponent,
    PageHeaderComponent,
    StatsPeriodBarComponent,
  ],
  providers: [AuditLogStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="audit-log-page">
      <bd-page-header
        title="Auditoría"
        subtitle="Registro de actividad y cambios del sistema"
      />

      <bd-stats-period-bar
        [period]="period()"
        (kindChange)="onKindChange($event)"
        (shift)="onShift($event)"
        (today)="onToday()"
        (rangeApply)="onRangeApply($event)"
      />

      <bd-audit-filters
        [entity]="entity()"
        [userId]="userId()"
        [patientId]="patientId() || null"
        [patientName]="store.patientName()"
        [users]="store.users()"
        (filtersChange)="onFiltersChange($event)"
        (clearPatient)="onClearPatient()"
      />

      <bd-audit-timeline
        [entries]="store.entries()"
        [loading]="store.loading()"
        [error]="store.error()"
        [page]="store.page()"
        [totalPages]="store.totalPages()"
        [totalElements]="store.totalElements()"
        (pageChange)="onPageChange($event)"
        (openDetails)="onOpenDetails($event)"
        (retry)="store.reload()"
      />
    </section>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .audit-log-page {
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
export class AuditLogPage implements OnInit {
  readonly store = inject(AuditLogStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly clock = inject(ClinicClock);
  private readonly auditHistory = inject(AuditHistoryDialogService);

  private readonly queryParams = toSignal(this.route.queryParamMap);

  readonly period = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => {
        const hasPatient = !!params.get('paciente');
        const hasPeriod = !!params.get('periodo');
        const defaultKind = hasPatient && !hasPeriod ? 'mes' : 'semana';
        return parseStatsPeriod(
          params.get('periodo'),
          params.get('fecha'),
          params.get('desde'),
          params.get('hasta'),
          this.clock.todayDateString(),
          defaultKind
        );
      })
    ),
    { requireSync: true }
  );

  readonly entity = computed(
    () => (this.queryParams()?.get('tipo') || '') as AuditEntityName | ''
  );
  readonly userId = computed(() => this.queryParams()?.get('usuario') || '');
  readonly patientId = computed(() => this.queryParams()?.get('paciente') || '');
  readonly page = computed(() => {
    const raw = this.queryParams()?.get('pagina');
    const p = raw !== null && raw !== undefined ? parseInt(raw, 10) : 0;
    return isNaN(p) || p < 0 ? 0 : p;
  });

  constructor() {
    effect(() => {
      const period = this.period();
      const entity = this.entity();
      const userId = this.userId();
      const patientId = this.patientId();
      const page = this.page();

      untracked(() => {
        this.store.load({
          from: period.from ?? '',
          to: period.to ?? '',
          entity: entity || undefined,
          userId: userId || undefined,
          patientId: patientId || undefined,
          page,
          size: 50,
        });
      });
    });
  }

  ngOnInit(): void {
    this.store.loadUsers();
  }

  onKindChange(kind: StatsPeriodKind): void {
    if (kind === 'rango') {
      const today = this.clock.todayDateString();
      this.navigateToRange(this.period().from ?? today, this.period().to ?? today);
      return;
    }
    this.navigateTo(kind, this.period().anchorDate);
  }

  onShift(direction: -1 | 1): void {
    this.navigateTo(this.period().kind, shiftStatsAnchor(this.period(), direction));
  }

  onToday(): void {
    this.navigateTo(this.period().kind, this.clock.todayDateString());
  }

  onRangeApply(range: { from: string; to: string }): void {
    this.navigateToRange(range.from, range.to);
  }

  onFiltersChange(values: AuditFiltersValues): void {
    this.updateQuery({
      tipo: values.entity || null,
      usuario: values.userId || null,
      pagina: 0,
    });
  }

  onClearPatient(): void {
    this.updateQuery({ paciente: null, pagina: 0 });
  }

  onPageChange(page: number): void {
    this.updateQuery({ pagina: page });
  }

  onOpenDetails(entry: AuditLogEntry): void {
    const entityLabel = AUDIT_ENTITY_LABELS[entry.entity] ?? entry.entity;
    this.auditHistory.open({
      entity: entry.entity,
      id: entry.entityId,
      title: `Historial de cambios: ${entityLabel}`,
    });
  }

  private navigateTo(kind: StatsPeriodKind, anchorDate: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { periodo: kind, fecha: anchorDate, desde: null, hasta: null, pagina: 0 },
      queryParamsHandling: 'merge',
    });
  }

  private navigateToRange(from: string, to: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { periodo: 'rango', fecha: null, desde: from, hasta: to, pagina: 0 },
      queryParamsHandling: 'merge',
    });
  }

  private updateQuery(params: Record<string, string | number | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
