import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CalendarX, ChevronLeft, ChevronRight } from 'lucide-angular';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { IconComponent, LucideIconData } from '../../../../shared/components/icon/icon.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { EffectiveDay } from '../../models/schedule.models';
import { toClockTime } from '../../services/schedules.api';

interface CalendarCell {
  date: string | null;
  dayNumber: number | null;
  weekdayShort: string;
  shifts: { startTime: string; endTime: string }[];
  exception: boolean;
  isToday: boolean;
  label: string;
}

const WEEKDAY_HEADERS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const WEEK_LENGTH = 7;
/** Cuántos turnos caben en una celda de la grilla; el resto se resume en "+N". */
const GRID_SHIFTS_VISIBLE = 2;

const weekdayLongFormatter = new Intl.DateTimeFormat('es-EC', { weekday: 'long', timeZone: 'UTC' });
const monthLongFormatter = new Intl.DateTimeFormat('es-EC', { month: 'long', timeZone: 'UTC' });

@Component({
  selector: 'bd-effective-calendar',
  standalone: true,
  imports: [AlertComponent, IconComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="effective-calendar" aria-labelledby="effective-calendar-title">
      <div class="effective-calendar__header">
        <h2 id="effective-calendar-title" class="effective-calendar__title">Calendario</h2>
        <nav class="effective-calendar__nav" aria-label="Cambiar de mes">
          <button
            type="button"
            class="btn btn-ghost effective-calendar__nav-btn"
            aria-label="Mes anterior"
            (click)="monthStep.emit(-1)"
          >
            <bd-icon [name]="icons.previous" [size]="20" />
          </button>
          <span class="effective-calendar__month" aria-live="polite">{{ monthLabel() }}</span>
          <button
            type="button"
            class="btn btn-ghost effective-calendar__nav-btn"
            aria-label="Mes siguiente"
            (click)="monthStep.emit(1)"
          >
            <bd-icon [name]="icons.next" [size]="20" />
          </button>
        </nav>
      </div>

      @if (errorMessage()) {
        <bd-alert variant="error" [message]="errorMessage()">
          <button type="button" class="btn btn-primary" (click)="retry.emit()">Reintentar</button>
        </bd-alert>
      } @else if (loading()) {
        <div class="effective-calendar__skeleton" aria-busy="true">
          <bd-skeleton height="18rem" width="100%" />
        </div>
      } @else {
        <table class="effective-calendar__table">
          <thead>
            <tr>
              @for (header of weekdayHeaders; track header) {
                <th scope="col">{{ header }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (week of weeks(); track $index) {
              <tr>
                @for (cell of week; track $index) {
                  <td
                    class="effective-calendar__cell"
                    [class.effective-calendar__cell--pad]="cell.date === null"
                    [class.effective-calendar__cell--today]="cell.isToday"
                    [class.effective-calendar__cell--closed]="cell.date !== null && cell.shifts.length === 0"
                    [attr.data-date]="cell.date"
                    [attr.aria-label]="cell.date ? cell.label : null"
                    [attr.aria-current]="cell.isToday ? 'date' : null"
                  >
                    @if (cell.date) {
                      <span class="effective-calendar__day-name" aria-hidden="true">{{ cell.weekdayShort }}</span>
                      <span class="effective-calendar__day-number" aria-hidden="true">{{ cell.dayNumber }}</span>

                      @if (cell.shifts.length > 0) {
                        <ul class="effective-calendar__shifts" aria-hidden="true">
                          @for (shift of cell.shifts; track $index; let shiftIndex = $index) {
                            <li
                              [class.effective-calendar__shift--extra]="shiftIndex >= ${GRID_SHIFTS_VISIBLE}"
                            >{{ shift.startTime }}–{{ shift.endTime }}</li>
                          }
                        </ul>
                        @if (cell.shifts.length > ${GRID_SHIFTS_VISIBLE}) {
                          <span class="effective-calendar__more" aria-hidden="true">+{{ cell.shifts.length - ${GRID_SHIFTS_VISIBLE} }}</span>
                        }
                      } @else {
                        <span class="effective-calendar__none" aria-hidden="true">No atiende</span>
                      }

                      @if (cell.exception) {
                        <span class="effective-calendar__exception" aria-hidden="true">
                          <bd-icon [name]="icons.exception" [size]="14" />
                          Excepción
                        </span>
                      }
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      container-type: inline-size;
      width: 100%;
    }

    .effective-calendar {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .effective-calendar__header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
    }

    .effective-calendar__title {
      margin: 0;
      font-size: var(--fs-lg);
    }

    .effective-calendar__nav {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .effective-calendar__nav-btn {
      min-width: 44px;
      min-height: 44px;
      padding: 0;
    }

    .effective-calendar__month {
      min-width: 9rem;
      text-align: center;
      font-weight: 600;
      color: var(--blue-900);
      text-transform: capitalize;
    }

    .effective-calendar__table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      table-layout: fixed;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .effective-calendar__table thead {
      display: none;
    }

    .effective-calendar__table tbody,
    .effective-calendar__table tr,
    .effective-calendar__table td {
      display: block;
    }

    .effective-calendar__cell {
      padding: var(--space-sm) var(--space-md);
      border-bottom: 1px solid var(--color-border);
      font-size: var(--fs-sm);
      color: var(--color-text);
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .effective-calendar__table td.effective-calendar__cell--pad {
      display: none;
    }

    .effective-calendar__cell--closed {
      color: var(--color-text-muted);
    }

    .effective-calendar__cell--today {
      box-shadow: inset 0 0 0 2px var(--color-focus);
    }

    .effective-calendar__day-name {
      font-weight: 600;
      color: var(--blue-900);
      margin-right: var(--space-xs);
    }

    .effective-calendar__day-number {
      font-weight: 600;
      color: var(--blue-900);
    }

    .effective-calendar__shifts {
      display: inline;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .effective-calendar__shifts li {
      display: inline;
    }

    .effective-calendar__shifts li + li::before {
      content: ', ';
    }

    .effective-calendar__more {
      display: none;
    }

    .effective-calendar__none {
      color: var(--color-text-muted);
    }

    .effective-calendar__exception {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      margin-left: var(--space-xs);
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--blue-800);
    }

    .effective-calendar__skeleton {
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-md);
    }

    @container (min-width: 36rem) {
      .effective-calendar__table thead {
        display: table-header-group;
      }

      .effective-calendar__table tbody {
        display: table-row-group;
      }

      .effective-calendar__table tr {
        display: table-row;
      }

      .effective-calendar__table th {
        padding: var(--space-xs);
        font-size: var(--fs-sm);
        font-weight: 600;
        color: var(--blue-900);
        text-align: left;
        border-bottom: 1px solid var(--color-border);
        background-color: var(--slate-50);
      }

      .effective-calendar__table td.effective-calendar__cell {
        display: table-cell;
        height: 6rem;
        vertical-align: top;
        border-right: 1px solid var(--color-border);
      }

      .effective-calendar__table td.effective-calendar__cell--pad {
        display: table-cell;
        background-color: var(--slate-50);
      }

      .effective-calendar__day-name {
        display: none;
      }

      .effective-calendar__shifts li {
        display: block;
        font-size: var(--fs-xs);
      }

      .effective-calendar__shifts li + li::before {
        content: none;
      }

      .effective-calendar__shifts li.effective-calendar__shift--extra {
        display: none;
      }

      .effective-calendar__more {
        display: inline;
        font-size: var(--fs-xs);
        color: var(--color-text-muted);
      }

      .effective-calendar__exception {
        display: flex;
        margin: var(--space-xs) 0 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .effective-calendar__nav-btn {
        transition: none;
      }
    }
  `,
})
export class EffectiveCalendarComponent {
  /** Mes visible en formato `YYYY-MM`. */
  readonly month = input.required<string>();
  readonly days = input<EffectiveDay[]>([]);
  readonly today = input.required<string>();
  readonly exceptionDates = input<string[]>([]);
  readonly loading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly monthStep = output<number>();
  readonly retry = output<void>();

  readonly weekdayHeaders = WEEKDAY_HEADERS;
  readonly icons: { previous: LucideIconData; next: LucideIconData; exception: LucideIconData } = {
    previous: ChevronLeft,
    next: ChevronRight,
    exception: CalendarX,
  };

  readonly monthLabel = computed(() => {
    const first = this.firstDayOfMonth();
    const name = monthLongFormatter.format(first);
    return `${name} ${first.getUTCFullYear()}`;
  });

  readonly weeks = computed<CalendarCell[][]>(() => {
    const first = this.firstDayOfMonth();
    const year = first.getUTCFullYear();
    const monthIndex = first.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const leadingBlanks = (first.getUTCDay() + 6) % 7;

    const shiftsByDate = new Map(
      this.days().map((day) => [
        day.date,
        day.shifts.map((shift) => ({
          startTime: toClockTime(shift.startTime) ?? '',
          endTime: toClockTime(shift.endTime) ?? '',
        })),
      ])
    );
    const exceptions = new Set(this.exceptionDates());

    const cells: CalendarCell[] = [];
    for (let blank = 0; blank < leadingBlanks; blank++) {
      cells.push(this.blankCell());
    }
    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
      const date = new Date(Date.UTC(year, monthIndex, dayNumber));
      const isoDate = `${this.month()}-${String(dayNumber).padStart(2, '0')}`;
      const shifts = shiftsByDate.get(isoDate) ?? [];
      const exception = exceptions.has(isoDate);
      const weekdayIndex = (date.getUTCDay() + 6) % 7;

      cells.push({
        date: isoDate,
        dayNumber,
        weekdayShort: WEEKDAY_HEADERS[weekdayIndex],
        shifts,
        exception,
        isToday: isoDate === this.today(),
        label: this.describeDay(date, shifts, exception),
      });
    }
    while (cells.length % WEEK_LENGTH !== 0) {
      cells.push(this.blankCell());
    }

    const weeks: CalendarCell[][] = [];
    for (let start = 0; start < cells.length; start += WEEK_LENGTH) {
      weeks.push(cells.slice(start, start + WEEK_LENGTH));
    }
    return weeks;
  });

  private firstDayOfMonth(): Date {
    const [year, monthNumber] = this.month().split('-').map(Number);
    return new Date(Date.UTC(year, monthNumber - 1, 1));
  }

  private blankCell(): CalendarCell {
    return {
      date: null,
      dayNumber: null,
      weekdayShort: '',
      shifts: [],
      exception: false,
      isToday: false,
      label: '',
    };
  }

  private describeDay(
    date: Date,
    shifts: { startTime: string; endTime: string }[],
    exception: boolean
  ): string {
    const dayLabel = `${weekdayLongFormatter.format(date)} ${date.getUTCDate()} de ${monthLongFormatter.format(date)}`;
    const shiftsText =
      shifts.length > 0 ? shifts.map((shift) => `${shift.startTime}–${shift.endTime}`).join(', ') : 'No atiende';
    return `${dayLabel}: ${shiftsText}${exception ? ', con excepción' : ''}`;
  }
}
