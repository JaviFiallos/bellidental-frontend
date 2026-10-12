import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { ChevronLeft, ChevronRight } from 'lucide-angular';
import { IconComponent, LucideIconData } from '../icon/icon.component';

@Component({
  selector: 'bd-date-nav',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="bd-date-nav" aria-label="Navegación de fecha">
      <div class="bd-date-nav__controls">
        <button
          type="button"
          class="bd-date-nav__btn-icon"
          aria-label="Día anterior"
          (click)="prev.emit()"
        >
          <bd-icon [name]="chevronLeftIcon" [size]="18" />
        </button>

        <span class="bd-date-nav__date-text" aria-live="polite">
          {{ formattedDate() }}
        </span>

        <button
          type="button"
          class="bd-date-nav__btn-icon"
          aria-label="Día siguiente"
          (click)="next.emit()"
        >
          <bd-icon [name]="chevronRightIcon" [size]="18" />
        </button>
      </div>

      <button
        type="button"
        class="bd-date-nav__btn-today"
        [disabled]="isToday()"
        (click)="today.emit()"
      >
        Hoy
      </button>
    </nav>
  `,
  styles: `
    .bd-date-nav {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      flex-wrap: wrap;
    }

    .bd-date-nav__controls {
      display: inline-flex;
      align-items: center;
      background-color: var(--white);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-sm);
      padding: 2px 4px;
      box-shadow: var(--shadow-sm);
    }

    .bd-date-nav__btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      border: none;
      background: transparent;
      border-radius: calc(var(--radius-sm) - 2px);
      color: var(--slate-600);
      cursor: pointer;
      transition: background-color var(--transition-fast), color var(--transition-fast);
    }

    .bd-date-nav__btn-icon:hover {
      background-color: var(--slate-100);
      color: var(--blue-900);
    }

    .bd-date-nav__btn-icon:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 1px;
    }

    .bd-date-nav__date-text {
      padding: 0 0.75rem;
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--blue-950);
      text-transform: lowercase;
      white-space: nowrap;
    }

    .bd-date-nav__date-text::first-letter {
      text-transform: uppercase;
    }

    .bd-date-nav__btn-today {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 44px;
      min-height: 44px;
      padding: 0 0.85rem;
      font-size: var(--fs-sm);
      font-weight: 500;
      background-color: var(--white);
      color: var(--blue-800);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-sm);
      cursor: pointer;
      box-shadow: var(--shadow-sm);
      transition: all var(--transition-fast);
    }

    .bd-date-nav__btn-today:hover:not(:disabled) {
      background-color: var(--slate-100);
      color: var(--blue-950);
      border-color: var(--slate-300);
    }

    .bd-date-nav__btn-today:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 1px;
    }

    .bd-date-nav__btn-today:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background-color: var(--slate-50);
      border-color: var(--slate-200);
      color: var(--slate-500);
      box-shadow: none;
    }
  `,
})
export class DateNavComponent {
  readonly date = input.required<string>();
  readonly isToday = input<boolean>(false);

  readonly prev = output<void>();
  readonly next = output<void>();
  readonly today = output<void>();

  readonly chevronLeftIcon: LucideIconData = ChevronLeft;
  readonly chevronRightIcon: LucideIconData = ChevronRight;

  readonly formattedDate = computed(() => {
    const raw = this.date();
    if (!raw) return '';
    const parts = raw.split('-');
    if (parts.length < 3) return raw;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    // Use midday UTC to prevent timezone shifts across borders
    const dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0));

    const formatter = new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatter.format(dateObj);
  });
}
