import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ApiError } from '../../../../core/api/api.models';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import {
  auditActionLabel,
  auditActionTone,
  AuditActionLabel,
  AuditActionTone,
  auditChangeRows,
  AuditChangeRow,
  auditUserLabel,
  AUDIT_ENTITY_LABELS,
} from '../../domain/audit-display';
import { AuditEntityName, AuditEntry } from '../../models/audit.models';

export interface AuditHistoryDialogData {
  title: string;
  entries$: Observable<AuditEntry[]>;
}

interface AuditRevisionView {
  /** Una revisión puede tocar varias entidades (atención completa). */
  key: string;
  revision: number;
  at: string;
  actionLabel: AuditActionLabel;
  actionTone: AuditActionTone;
  userLabel: string;
  isCreation: boolean;
  rows: AuditChangeRow[];
  entityLabel: string | null;
}

@Component({
  selector: 'bd-audit-history-dialog',
  standalone: true,
  imports: [
    AlertComponent,
    ClinicDatePipe,
    ClinicTimePipe,
    EmptyStateComponent,
    SkeletonComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="audit-history">
      <header class="audit-history__header">
        <h2 id="audit-history-title" class="audit-history__title">{{ data.title }}</h2>
        <button type="button" class="btn btn-ghost audit-history__close" (click)="dialogRef.close()">
          Cerrar
        </button>
      </header>

      <div class="audit-history__body">
        @if (loading()) {
          <div class="audit-history__skeleton" aria-busy="true">
            <bd-skeleton height="4.5rem" width="100%" />
            <bd-skeleton height="4.5rem" width="100%" />
            <bd-skeleton height="4.5rem" width="100%" />
          </div>
        } @else if (errorMessage(); as message) {
          <bd-alert variant="error" [message]="message" />
        } @else if (revisions().length === 0) {
          <bd-empty-state
            title="Sin cambios registrados"
            description="Los registros anteriores a la auditoría no tienen historial."
          />
        } @else {
          <ol class="audit-history__list">
            @for (view of revisions(); track view.key) {
              <li class="audit-history__entry">
                <div class="audit-history__entry-header">
                  <bd-status-badge [tone]="view.actionTone" [label]="view.actionLabel" />
                  @if (view.entityLabel) {
                    <span class="audit-history__entity-badge">{{ view.entityLabel }}</span>
                  }
                  <span class="audit-history__meta">
                    {{ view.userLabel }} · {{ view.at | clinicDate: 'long' }} · {{ view.at | clinicTime }}
                  </span>
                </div>

                @if (view.isCreation) {
                  <p class="audit-history__text">Creó el registro</p>
                  @if (view.rows.length > 0) {
                    <details class="audit-history__details">
                      <summary>Ver datos iniciales ({{ view.rows.length }})</summary>
                      <dl class="audit-history__rows">
                        @for (row of view.rows; track row.label) {
                          <div class="audit-history__row">
                            <dt>{{ row.label }}</dt>
                            <dd>{{ row.after }}</dd>
                          </div>
                        }
                      </dl>
                    </details>
                  }
                } @else if (view.rows.length === 0) {
                  <p class="audit-history__text">Sin cambios visibles</p>
                } @else {
                  <dl class="audit-history__rows">
                    @for (row of view.rows; track row.label) {
                      <div class="audit-history__row">
                        <dt>{{ row.label }}</dt>
                        <dd class="audit-history__change">
                          <span class="audit-history__before">{{ row.before }}</span>
                          <span class="audit-history__arrow" aria-hidden="true">→</span>
                          <span class="audit-history__after">{{ row.after }}</span>
                        </dd>
                      </div>
                    }
                  </dl>
                }
              </li>
            }
          </ol>
        }
      </div>
    </div>
  `,
  styles: `
    .audit-history {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      box-sizing: border-box;
      width: 100%;
      max-height: 90vh;
      padding: var(--space-lg);
      background-color: var(--white);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
    }

    .audit-history__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
    }

    .audit-history__title {
      margin: 0;
      font-size: var(--fs-lg);
      font-weight: 700;
      line-height: 1.25;
      color: var(--blue-950);
    }

    .audit-history__close {
      min-height: 44px;
      padding: 0 var(--space-md);
      font-size: var(--fs-sm);
      font-weight: 600;
    }

    .audit-history__body {
      container-type: inline-size;
      min-height: 0;
      overflow-y: auto;
    }

    .audit-history__skeleton,
    .audit-history__list {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .audit-history__entry {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-md);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
    }

    .audit-history__entry-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-xs) var(--space-sm);
    }

    .audit-history__entity-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.5rem;
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--blue-900);
      background-color: var(--blue-50);
      border: 1px solid var(--blue-200);
      border-radius: var(--radius-sm);
    }

    .audit-history__meta {
      font-size: var(--fs-xs);
      color: var(--slate-600);
    }

    .audit-history__text {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--slate-600);
    }

    .audit-history__details summary {
      min-height: 44px;
      display: flex;
      align-items: center;
      font-size: var(--fs-sm);
      color: var(--blue-800);
      cursor: pointer;
    }

    .audit-history__rows {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      margin: 0;
    }

    .audit-history__row {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      font-size: var(--fs-sm);
    }

    .audit-history__row dt {
      font-weight: 600;
      color: var(--slate-600);
    }

    .audit-history__row dd {
      margin: 0;
      color: var(--blue-950);
      overflow-wrap: anywhere;
    }

    .audit-history__change {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.4rem;
    }

    .audit-history__before {
      color: var(--slate-500);
      text-decoration: line-through;
    }

    .audit-history__arrow {
      color: var(--slate-500);
    }

    @container (min-width: 28rem) {
      .audit-history__row {
        display: grid;
        grid-template-columns: minmax(0, 11rem) minmax(0, 1fr);
        align-items: baseline;
        gap: var(--space-sm);
      }
    }
  `,
})
export class AuditHistoryDialogComponent {
  readonly dialogRef = inject<DialogRef<void>>(DialogRef);
  readonly data = inject<AuditHistoryDialogData>(DIALOG_DATA);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  private readonly entries = signal<AuditEntry[]>([]);

  /** Muestra la más reciente primero, ordenada cronológicamente. */
  readonly revisions = computed<AuditRevisionView[]>(() => {
    const raw = this.entries();
    const distinctEntities = new Set(
      raw.map((e) => e.entity).filter((e): e is AuditEntityName => !!e)
    );
    const showEntity = distinctEntities.size > 1;

    return raw
      .slice()
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime() || b.revision - a.revision)
      .map((entry) => {
        const actionLabel = auditActionLabel(entry);
        const entityLabel = showEntity && entry.entity ? (AUDIT_ENTITY_LABELS[entry.entity] ?? entry.entity) : null;
        return {
          key: `${entry.revision}-${entry.entity ?? ''}-${entry.entityId ?? ''}`,
          revision: entry.revision,
          at: entry.at,
          actionLabel,
          actionTone: auditActionTone(actionLabel),
          userLabel: auditUserLabel(entry.username),
          isCreation: entry.type === 'ADD',
          rows: auditChangeRows(entry),
          entityLabel,
        };
      });
  });

  constructor() {
    this.data.entries$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.errorMessage.set(err.message);
        this.loading.set(false);
      },
    });
  }
}
