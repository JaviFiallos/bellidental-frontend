import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Ban } from 'lucide-angular';
import { IconComponent, LucideIconData } from '../../../../shared/components/icon/icon.component';
import { Schedule, WEEKDAY_LABELS } from '../../models/schedule.models';
import { ShiftEditorState, ShiftValue } from '../../services/schedules.store';
import { ShiftEditorComponent } from '../shift-editor/shift-editor.component';

interface DayRow {
  weekday: number;
  label: string;
  shifts: Schedule[];
  restrictions: Schedule[];
}

const MONDAY = 1;
const SATURDAY = 6;
const SUNDAY = 7;

@Component({
  selector: 'bd-weekly-schedule',
  standalone: true,
  imports: [NgTemplateOutlet, IconComponent, ShiftEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="weekly-schedule">
      @for (row of weekRows(); track row.weekday) {
        <ng-container *ngTemplateOutlet="dayTemplate; context: { $implicit: row }" />
      }

      <details class="weekly-schedule__sunday" [open]="sundayHasContent()">
        <summary class="weekly-schedule__sunday-summary">Mostrar domingo</summary>
        <ng-container *ngTemplateOutlet="dayTemplate; context: { $implicit: sundayRow() }" />
      </details>
    </div>

    <ng-template #dayTemplate let-row>
      <section
        class="weekly-schedule__day"
        [attr.data-weekday]="row.weekday"
        [attr.aria-label]="row.label"
      >
        <h3 class="weekly-schedule__day-name">{{ row.label }}</h3>

        <div class="weekly-schedule__day-body">
          @if (row.shifts.length === 0) {
            <p class="weekly-schedule__empty">No atiende</p>
          }

          <ul class="weekly-schedule__chips">
            @for (rule of row.shifts; track rule.id) {
              <li class="weekly-schedule__chip">
                @if (canManage()) {
                  <button
                    type="button"
                    class="weekly-schedule__chip-time"
                    (click)="editShift.emit(rule)"
                  >
                    {{ formatRange(rule) }}
                  </button>
                  <button
                    type="button"
                    class="weekly-schedule__chip-action"
                    [attr.aria-label]="
                      'Desactivar turno ' + formatRange(rule) + ' del ' + dayName(row)
                    "
                    [disabled]="deactivatingId() === rule.id"
                    (click)="deactivateShift.emit(rule)"
                  >
                    <bd-icon [name]="icons.deactivate" [size]="16" />
                  </button>
                } @else {
                  <span class="weekly-schedule__chip-time">{{ formatRange(rule) }}</span>
                }
              </li>
            }

            @for (rule of row.restrictions; track rule.id) {
              <li class="weekly-schedule__chip weekly-schedule__chip--restriction">
                <span class="weekly-schedule__chip-time">No atiende (regla)</span>
                @if (canManage()) {
                  <button
                    type="button"
                    class="weekly-schedule__chip-action"
                    [attr.aria-label]="'Desactivar regla de no atención del ' + dayName(row)"
                    [disabled]="deactivatingId() === rule.id"
                    (click)="deactivateShift.emit(rule)"
                  >
                    <bd-icon [name]="icons.deactivate" [size]="16" />
                  </button>
                }
              </li>
            }
          </ul>

          @if (canManage()) {
            <button
              type="button"
              class="btn btn-ghost weekly-schedule__add"
              [attr.aria-label]="'Añadir turno el ' + dayName(row)"
              (click)="addShift.emit(row.weekday)"
            >
              + Añadir turno
            </button>
          }

          @let rowEditor = editor();
          @if (canManage() && rowEditor && rowEditor.weekday === row.weekday) {
            <bd-shift-editor
              [startTime]="rowEditor.startTime"
              [endTime]="rowEditor.endTime"
              [saving]="saving()"
              [errorMessage]="editorError()"
              (save)="editorSave.emit($event)"
              (cancel)="editorCancel.emit()"
            />
          }
        </div>
      </section>
    </ng-template>
  `,
  styles: `
    :host {
      display: block;
      container-type: inline-size;
      width: 100%;
    }

    .weekly-schedule {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .weekly-schedule__day {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      padding: var(--space-md);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .weekly-schedule__day-name {
      margin: 0;
      font-size: var(--fs-md);
      font-weight: 600;
      color: var(--blue-900);
    }

    .weekly-schedule__day-body {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      min-width: 0;
    }

    .weekly-schedule__empty {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .weekly-schedule__chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .weekly-schedule__chip {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      min-height: 44px;
      padding: 0 var(--space-xs) 0 var(--space-md);
      background-color: var(--blue-100);
      color: var(--blue-800);
      border-radius: var(--radius-sm);
      font-size: var(--fs-sm);
      font-weight: 500;
    }

    .weekly-schedule__chip--restriction {
      background-color: var(--slate-100);
      color: var(--slate-600);
    }

    .weekly-schedule__chip-time {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0;
      border: 0;
      background: none;
      font: inherit;
      color: inherit;
      cursor: default;
    }

    button.weekly-schedule__chip-time {
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .weekly-schedule__chip-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: inherit;
      cursor: pointer;

      &:hover:not(:disabled) {
        background-color: color-mix(in srgb, currentColor 12%, transparent);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .weekly-schedule__add {
      align-self: flex-start;
      min-height: 44px;
    }

    .weekly-schedule__sunday {
      background-color: var(--color-surface);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-xs) var(--space-md);
    }

    .weekly-schedule__sunday-summary {
      min-height: 44px;
      display: flex;
      align-items: center;
      cursor: pointer;
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--color-primary);
    }

    .weekly-schedule__sunday .weekly-schedule__day {
      border: 0;
      padding: var(--space-xs) 0 var(--space-md);
    }

    @container (min-width: 36rem) {
      .weekly-schedule__day {
        display: grid;
        grid-template-columns: 8rem minmax(0, 1fr);
        align-items: start;
        gap: var(--space-md);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .weekly-schedule__chip-action {
        transition: none;
      }
    }
  `,
})
export class WeeklyScheduleComponent {
  readonly rules = input.required<Schedule[]>();
  readonly canManage = input<boolean>(false);
  readonly editor = input<ShiftEditorState | null>(null);
  readonly editorError = input<string | null>(null);
  readonly saving = input<boolean>(false);
  readonly deactivatingId = input<number | null>(null);

  readonly addShift = output<number>();
  readonly editShift = output<Schedule>();
  readonly deactivateShift = output<Schedule>();
  readonly editorSave = output<ShiftValue>();
  readonly editorCancel = output<void>();

  readonly icons: { deactivate: LucideIconData } = { deactivate: Ban };

  private readonly dayRows = computed<DayRow[]>(() => {
    const rules = this.rules();
    return Object.keys(WEEKDAY_LABELS).map((key) => {
      const weekday = Number(key);
      const dayRules = rules.filter((rule) => rule.weekday === weekday);
      return {
        weekday,
        label: WEEKDAY_LABELS[weekday],
        shifts: dayRules
          .filter((rule) => rule.available)
          .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
        restrictions: dayRules.filter((rule) => !rule.available),
      };
    });
  });

  readonly weekRows = computed(() =>
    this.dayRows().filter((row) => row.weekday >= MONDAY && row.weekday <= SATURDAY)
  );

  readonly sundayRow = computed(
    () => this.dayRows().find((row) => row.weekday === SUNDAY) as DayRow
  );

  readonly sundayHasContent = computed(() => {
    const sunday = this.sundayRow();
    return (
      sunday.shifts.length > 0 ||
      sunday.restrictions.length > 0 ||
      this.editor()?.weekday === SUNDAY
    );
  });

  formatRange(rule: Schedule): string {
    return `${rule.startTime ?? ''} – ${rule.endTime ?? ''}`;
  }

  dayName(row: DayRow): string {
    return row.label.toLowerCase();
  }
}
