import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { AlertCircle, Clock } from 'lucide-angular';
import { ClinicClock } from '../../../../core/services/clinic-clock.service';
import { DateNavComponent } from '../../../../shared/components/date-nav/date-nav.component';
import { IconComponent, LucideIconData } from '../../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  SegmentedComponent,
  SegmentedOption,
} from '../../../../shared/components/segmented/segmented.component';

@Component({
  selector: 'bd-agenda-toolbar',
  standalone: true,
  imports: [
    PageHeaderComponent,
    DateNavComponent,
    SegmentedComponent,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="agenda-toolbar">
      <div class="agenda-toolbar__header-row">
        <bd-page-header title="Agenda" />

        <div class="agenda-toolbar__actions">
          <bd-date-nav
            [date]="date()"
            [isToday]="isToday()"
            (prev)="onPrevDay()"
            (next)="onNextDay()"
            (today)="onToday()"
          />

          <bd-segmented
            [options]="viewOptions"
            [value]="view()"
            label="Vista de agenda"
            (valueChange)="onViewChange($event)"
          />

          <label class="agenda-toolbar__toggle-cancelled">
            <input
              type="checkbox"
              class="agenda-toolbar__checkbox"
              [checked]="showCancelled()"
              (change)="onToggleCancelled($event)"
            />
            <span class="agenda-toolbar__checkbox-label">Ver canceladas</span>
          </label>

          <div class="agenda-toolbar__updated" aria-live="polite">
            @if (refreshError()) {
              <span class="agenda-toolbar__updated-error">
                <bd-icon [name]="alertIcon" [size]="14" />
                No se pudo actualizar
              </span>
            } @else if (updatedText()) {
              <span class="agenda-toolbar__updated-time">
                <bd-icon [name]="clockIcon" [size]="14" />
                {{ updatedText() }}
              </span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .agenda-toolbar {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      margin-bottom: var(--space-md);
    }

    .agenda-toolbar__header-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-md);
    }

    .agenda-toolbar__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-md);
    }

    .agenda-toolbar__toggle-cancelled {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: var(--fs-sm);
      color: var(--slate-600);
      cursor: pointer;
      user-select: none;
      min-height: 44px;
    }

    .agenda-toolbar__checkbox {
      width: 16px;
      height: 16px;
      accent-color: var(--color-primary);
      cursor: pointer;
    }

    .agenda-toolbar__updated {
      font-size: var(--fs-xs);
      color: var(--slate-500);
      display: inline-flex;
      align-items: center;
      min-height: 20px;
    }

    .agenda-toolbar__updated-time {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--slate-500);
    }

    .agenda-toolbar__updated-error {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--coral-700);
      font-weight: 500;
    }
  `,
})
export class AgendaToolbarComponent {
  private readonly clinicClock = inject(ClinicClock);

  readonly date = input.required<string>();
  readonly view = input.required<'professional' | 'status'>();
  readonly showCancelled = input.required<boolean>();
  readonly lastUpdatedAt = input<Date | null>(null);
  readonly refreshError = input<boolean>(false);

  readonly dateChange = output<string>();
  readonly viewChange = output<'professional' | 'status'>();
  readonly toggleCancelled = output<boolean>();

  readonly clockIcon: LucideIconData = Clock;
  readonly alertIcon: LucideIconData = AlertCircle;

  readonly viewOptions: SegmentedOption<'professional' | 'status'>[] = [
    { value: 'professional', label: 'Por profesional' },
    { value: 'status', label: 'Por estado' },
  ];

  readonly isToday = computed(() => this.date() === this.clinicClock.todayDateString());

  readonly updatedText = computed(() => {
    const d = this.lastUpdatedAt();
    if (!d) return null;
    const formatter = new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `Actualizado ${formatter.format(d)}`;
  });

  onPrevDay(): void {
    const prev = this.clinicClock.addDays(this.date(), -1);
    this.dateChange.emit(prev);
  }

  onNextDay(): void {
    const next = this.clinicClock.addDays(this.date(), 1);
    this.dateChange.emit(next);
  }

  onToday(): void {
    this.dateChange.emit(this.clinicClock.todayDateString());
  }

  onViewChange(v: 'professional' | 'status'): void {
    this.viewChange.emit(v);
  }

  onToggleCancelled(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.toggleCancelled.emit(checked);
  }
}
