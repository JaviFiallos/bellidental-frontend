import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionStore } from '../../../../core/auth/session.store';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { Schedule, WEEKDAY_LABELS } from '../../models/schedule.models';
import { SchedulesStore, ShiftValue } from '../../services/schedules.store';
import { WeeklyScheduleComponent } from '../../components/weekly-schedule/weekly-schedule.component';

@Component({
  selector: 'bd-schedules-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    SkeletonComponent,
    AlertComponent,
    EmptyStateComponent,
    WeeklyScheduleComponent,
  ],
  providers: [SchedulesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="schedules-page">
      <bd-page-header title="Horarios" />

      @if (store.professionalsLoading()) {
        <div class="schedules-page__skeleton" aria-busy="true">
          <bd-skeleton height="3rem" width="100%" />
          <bd-skeleton height="8rem" width="100%" />
        </div>
      } @else if (store.professionalsError()) {
        <bd-alert variant="error" [message]="store.professionalsError()">
          <button type="button" class="btn btn-primary" (click)="retryProfessionals()">Reintentar</button>
        </bd-alert>
      } @else if (store.professionals().length === 0) {
        <bd-empty-state
          title="No hay profesionales activos"
          description="Activa un profesional para gestionar su horario."
        />
      } @else {
        <div class="schedules-page__selector">
          <label class="field-label" for="schedules-professional">Profesional</label>
          <div class="schedules-page__select-row">
            <span
              class="schedules-page__dot"
              aria-hidden="true"
              [style.background-color]="store.selectedProfessional()?.colorTag || 'var(--slate-300)'"
            ></span>
            <select
              #professionalSelect
              id="schedules-professional"
              class="input schedules-page__select"
              (change)="onProfessionalChange(professionalSelect.value)"
            >
              @for (professional of store.professionals(); track professional.id) {
                <option
                  [value]="professional.id"
                  [selected]="professional.id === store.selectedProfessionalId()"
                >
                  {{ professional.fullName }}
                </option>
              }
            </select>
          </div>
        </div>

        @if (store.rulesLoading()) {
          <div class="schedules-page__skeleton" aria-busy="true">
            <bd-skeleton height="4rem" width="100%" />
            <bd-skeleton height="4rem" width="100%" />
            <bd-skeleton height="4rem" width="100%" />
          </div>
        } @else if (store.rulesError()) {
          <bd-alert variant="error" [message]="store.rulesError()">
            <button type="button" class="btn btn-primary" (click)="store.retryRules()">Reintentar</button>
          </bd-alert>
        } @else {
          <bd-weekly-schedule
            [rules]="store.rules()"
            [canManage]="canManage"
            [editor]="store.editor()"
            [editorError]="store.editorError()"
            [saving]="store.saving()"
            [deactivatingId]="store.deactivatingId()"
            (addShift)="store.openCreate($event)"
            (editShift)="store.openEdit($event)"
            (deactivateShift)="onDeactivate($event)"
            (editorSave)="onEditorSave($event)"
            (editorCancel)="store.closeEditor()"
          />
        }
      }
    </div>
  `,
  styles: `
    .schedules-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      width: 100%;
      max-width: 56rem;
      margin: 0 auto;
      box-sizing: border-box;
    }

    .schedules-page__selector {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .schedules-page__select-row {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .schedules-page__dot {
      flex: 0 0 auto;
      width: 14px;
      height: 14px;
      border-radius: 50%;
    }

    .schedules-page__select {
      flex: 1 1 auto;
      min-width: 0;
    }

    .schedules-page__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-lg);
    }
  `,
})
export class SchedulesPage implements OnInit {
  readonly store = inject(SchedulesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionStore = inject(SessionStore);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  get canManage(): boolean {
    return this.sessionStore.hasPermission('SCHEDULE_MANAGE');
  }

  ngOnInit(): void {
    this.store.loadProfessionals(this.route.snapshot.queryParamMap.get('profesional'));
  }

  retryProfessionals(): void {
    this.store.loadProfessionals(this.store.selectedProfessionalId());
  }

  onProfessionalChange(professionalId: string): void {
    this.store.selectProfessional(professionalId);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { profesional: professionalId },
      replaceUrl: true,
    });
  }

  onEditorSave(value: ShiftValue): void {
    this.store.saveShift(value);
  }

  onDeactivate(rule: Schedule): void {
    const day = (WEEKDAY_LABELS[rule.weekday ?? 0] ?? '').toLowerCase();
    const isShift = rule.available;

    this.confirmDialog
      .open({
        title: isShift ? 'Desactivar turno' : 'Desactivar regla',
        message: isShift
          ? `¿Desactivar el turno de ${rule.startTime} a ${rule.endTime} del ${day}? Las citas ya agendadas no se cancelan.`
          : `¿Desactivar la regla "No atiende" del ${day}? Las citas ya agendadas no se cancelan.`,
        confirmLabel: 'Desactivar',
        cancelLabel: 'Cancelar',
        tone: 'danger',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result.confirmed) {
          this.store.deactivate(rule);
        }
      });
  }
}
