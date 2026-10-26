import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import {
  auditSummaryPhrase,
  auditUserLabel,
} from '../../domain/audit-display';
import { AuditEntityName, AuditLogEntry, AuditRevisionType } from '../../models/audit.models';

interface DayGroup {
  date: string;
  entries: AuditLogEntry[];
}

const guayaquilDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Guayaquil',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

@Component({
  selector: 'bd-audit-timeline',
  standalone: true,
  imports: [
    AlertComponent,
    ClinicDatePipe,
    ClinicTimePipe,
    EmptyStateComponent,
    RouterLink,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="audit-timeline">
      @if (loading()) {
        <div class="audit-timeline__skeleton" aria-busy="true">
          <bd-skeleton height="4rem" width="100%" />
          <bd-skeleton height="4rem" width="100%" />
          <bd-skeleton height="4rem" width="100%" />
        </div>
      } @else if (error(); as err) {
        <div class="audit-timeline__error">
          <bd-alert variant="error" [message]="err" />
          <button type="button" class="btn btn-outline" (click)="retry.emit()">
            Reintentar
          </button>
        </div>
      } @else if (entries().length === 0) {
        <bd-empty-state
          title="Sin cambios en este período"
          description="No se registraron cambios en las fechas y filtros seleccionados."
        />
      } @else {
        <div class="audit-timeline__groups">
          @for (group of dayGroups(); track group.date) {
            <section class="audit-timeline__group">
              <h3 class="audit-timeline__day-header">
                {{ group.date | clinicDate: 'long' }}
              </h3>

              <ul class="audit-timeline__list">
                @for (entry of group.entries; track entry.revision + entry.entity + entry.entityId) {
                  <li class="audit-timeline__item">
                    <div class="audit-timeline__item-main">
                      <time class="audit-timeline__time">{{ entry.at | clinicTime }}</time>
                      <span class="audit-timeline__user">{{ userLabel(entry.username) }}</span>
                      <span class="audit-timeline__phrase">{{ summaryPhrase(entry.type, entry.entity) }}</span>
                      @if (entry.patientName) {
                        <span class="audit-timeline__sep">·</span>
                        @if (entry.patientId) {
                          <a
                            class="audit-timeline__patient"
                            [routerLink]="['/pacientes', entry.patientId]"
                          >
                            {{ entry.patientName }}
                          </a>
                        } @else {
                          <span class="audit-timeline__patient-text">{{ entry.patientName }}</span>
                        }
                      }
                    </div>

                    <div class="audit-timeline__item-actions">
                      <button
                        type="button"
                        class="btn btn-outline btn-sm audit-timeline__btn"
                        (click)="openDetails.emit(entry)"
                      >
                        Ver cambios
                      </button>
                    </div>
                  </li>
                }
              </ul>
            </section>
          }
        </div>

        @if (totalPages() > 1 || totalElements() > 0) {
          <nav class="audit-timeline__pagination" aria-label="Paginación de auditoría">
            <button
              type="button"
              class="btn btn-outline btn-sm"
              [disabled]="page() <= 0"
              (click)="pageChange.emit(page() - 1)"
            >
              Anterior
            </button>

            <span class="audit-timeline__page-info">
              Página {{ page() + 1 }} de {{ totalPages() || 1 }}
            </span>

            <button
              type="button"
              class="btn btn-outline btn-sm"
              [disabled]="page() + 1 >= totalPages()"
              (click)="pageChange.emit(page() + 1)"
            >
              Siguiente
            </button>
          </nav>
        }
      }
    </div>
  `,
  styles: `
    .audit-timeline {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      width: 100%;
    }

    .audit-timeline__skeleton,
    .audit-timeline__error,
    .audit-timeline__groups {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .audit-timeline__group {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .audit-timeline__day-header {
      margin: 0;
      padding-bottom: 0.25rem;
      font-size: var(--fs-sm);
      font-weight: 700;
      color: var(--blue-950);
      text-transform: capitalize;
      border-bottom: 2px solid var(--slate-200);
    }

    .audit-timeline__list {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .audit-timeline__item {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-md);
      background-color: var(--white);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
    }

    @media (min-width: 640px) {
      .audit-timeline__item {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-md);
      }
    }

    .audit-timeline__item-main {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.35rem 0.5rem;
      font-size: var(--fs-sm);
    }

    .audit-timeline__time {
      font-family: var(--font-mono, monospace);
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-500);
    }

    .audit-timeline__user {
      font-weight: 600;
      color: var(--blue-950);
    }

    .audit-timeline__phrase {
      color: var(--slate-700);
    }

    .audit-timeline__sep {
      color: var(--slate-400);
    }

    .audit-timeline__patient {
      font-weight: 500;
      color: var(--blue-800);
      text-decoration: underline;
    }

    .audit-timeline__patient:hover {
      color: var(--blue-950);
    }

    .audit-timeline__patient-text {
      color: var(--slate-600);
    }

    .audit-timeline__item-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    .audit-timeline__btn {
      min-height: 36px;
      padding: 0 var(--space-sm);
      white-space: nowrap;
    }

    .audit-timeline__pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-md);
      padding: var(--space-sm) 0;
    }

    .audit-timeline__page-info {
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--slate-700);
    }
  `,
})
export class AuditTimelineComponent {
  readonly entries = input.required<AuditLogEntry[]>();
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly page = input<number>(0);
  readonly totalPages = input<number>(0);
  readonly totalElements = input<number>(0);

  readonly pageChange = output<number>();
  readonly openDetails = output<AuditLogEntry>();
  readonly retry = output<void>();

  readonly dayGroups = computed<DayGroup[]>(() => {
    const list = this.entries();
    const map = new Map<string, AuditLogEntry[]>();

    for (const entry of list) {
      let dateKey: string;
      try {
        dateKey = guayaquilDateFormatter.format(new Date(entry.at));
      } catch {
        dateKey = entry.at.slice(0, 10);
      }
      const existing = map.get(dateKey);
      if (existing) {
        existing.push(entry);
      } else {
        map.set(dateKey, [entry]);
      }
    }

    return Array.from(map.entries()).map(([date, entries]) => ({
      date,
      entries,
    }));
  });

  userLabel(username: string | null): string {
    return auditUserLabel(username);
  }

  summaryPhrase(type: AuditRevisionType, entity: AuditEntityName): string {
    return auditSummaryPhrase(type, entity);
  }
}
