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
import { ClinicClock } from '../../../../core/services/clinic-clock.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  AuditFiltersComponent,
  AuditFiltersValues,
} from '../../components/audit-filters/audit-filters.component';
import { AuditTimelineComponent } from '../../components/audit-timeline/audit-timeline.component';
import { AUDIT_ENTITY_LABELS } from '../../domain/audit-display';
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
  ],
  providers: [AuditLogStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="audit-log-page">
      <bd-page-header
        title="Auditoría"
        subtitle="Registro de actividad y cambios del sistema"
      />

      <bd-audit-filters
        [from]="from()"
        [to]="to()"
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
    .audit-log-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      width: 100%;
      max-width: var(--container-max, 1200px);
      margin: 0 auto;
      padding: var(--space-md);
      box-sizing: border-box;
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

  readonly defaultFrom = computed(() => this.clock.addDays(this.clock.todayDateString(), -6));
  readonly defaultTo = computed(() => this.clock.todayDateString());

  readonly from = computed(() => this.queryParams()?.get('desde') || this.defaultFrom());
  readonly to = computed(() => this.queryParams()?.get('hasta') || this.defaultTo());
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
      const from = this.from();
      const to = this.to();
      const entity = this.entity();
      const userId = this.userId();
      const patientId = this.patientId();
      const page = this.page();

      untracked(() => {
        this.store.load({
          from,
          to,
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

  onFiltersChange(values: AuditFiltersValues): void {
    this.updateQuery({
      desde: values.from !== this.defaultFrom() ? values.from : null,
      hasta: values.to !== this.defaultTo() ? values.to : null,
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

  private updateQuery(params: Record<string, string | number | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
