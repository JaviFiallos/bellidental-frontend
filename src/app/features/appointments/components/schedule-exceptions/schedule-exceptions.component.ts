import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import { Schedule } from '../../models/schedule.models';
import { ExceptionDraft, ExceptionGroup } from '../../services/schedules.store';
import { ExceptionFormComponent } from '../exception-form/exception-form.component';

@Component({
  selector: 'bd-schedule-exceptions',
  standalone: true,
  imports: [ClinicDatePipe, ExceptionFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="schedule-exceptions" aria-labelledby="schedule-exceptions-title">
      <div class="schedule-exceptions__header">
        <h2 id="schedule-exceptions-title" class="schedule-exceptions__title">Excepciones</h2>
        @if (canManage() && !formOpen()) {
          <button type="button" class="btn btn-outline schedule-exceptions__add" (click)="add.emit()">
            Añadir excepción
          </button>
        }
      </div>

      @if (canManage() && formOpen()) {
        <bd-exception-form
          [today]="today()"
          [existingDates]="existingDates()"
          [saving]="formSaving()"
          [errorMessage]="formError()"
          (save)="formSave.emit($event)"
          (cancel)="formCancel.emit()"
        />
      }

      @if (groups().length === 0) {
        <p class="schedule-exceptions__empty">Sin excepciones próximas</p>
      } @else {
        <ul class="schedule-exceptions__list">
          @for (group of groups(); track group.date) {
            @let label = (group.date + 'T12:00:00-05:00') | clinicDate;
            <li class="schedule-exceptions__item" [attr.data-date]="group.date">
              <div class="schedule-exceptions__info">
                <h3 class="schedule-exceptions__date">{{ label }}</h3>
                <p class="schedule-exceptions__status">{{ statusText(group) }}</p>
              </div>
              @if (canManage()) {
                <button
                  type="button"
                  class="btn btn-ghost schedule-exceptions__remove"
                  [attr.aria-label]="'Quitar excepción del ' + label"
                  [disabled]="removingDate() === group.date"
                  (click)="remove.emit(group)"
                >
                  Quitar excepción
                </button>
              }
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .schedule-exceptions {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .schedule-exceptions__header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
    }

    .schedule-exceptions__title {
      margin: 0;
      font-size: var(--fs-lg);
    }

    .schedule-exceptions__add,
    .schedule-exceptions__remove {
      min-height: 44px;
    }

    .schedule-exceptions__empty {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .schedule-exceptions__list {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .schedule-exceptions__item {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      padding: var(--space-md);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .schedule-exceptions__info {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      min-width: 0;
    }

    .schedule-exceptions__date {
      margin: 0;
      font-size: var(--fs-md);
      font-weight: 600;
      color: var(--blue-900);
    }

    .schedule-exceptions__status {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text);
    }
  `,
})
export class ScheduleExceptionsComponent {
  readonly groups = input.required<ExceptionGroup[]>();
  readonly today = input.required<string>();
  readonly existingDates = input<string[]>([]);
  readonly canManage = input<boolean>(false);
  readonly formOpen = input<boolean>(false);
  readonly formSaving = input<boolean>(false);
  readonly formError = input<string | null>(null);
  readonly removingDate = input<string | null>(null);

  readonly add = output<void>();
  readonly formSave = output<ExceptionDraft>();
  readonly formCancel = output<void>();
  readonly remove = output<ExceptionGroup>();

  statusText(group: ExceptionGroup): string {
    if (group.rules.some((rule) => !rule.available)) return 'No atiende';
    return group.rules.map((rule) => this.formatRange(rule)).join(', ');
  }

  private formatRange(rule: Schedule): string {
    return `${rule.startTime ?? ''} – ${rule.endTime ?? ''}`;
  }
}
