import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { Bot, Check, Footprints } from 'lucide-angular';
import { ClinicClock } from '../../../../core/services/clinic-clock.service';
import { IconComponent, LucideIconData } from '../../../../shared/components/icon/icon.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import { appointmentDisplayState } from '../../domain/appointment-state';
import { Appointment } from '../../models/appointment.models';

@Component({
  selector: 'bd-appointment-card',
  standalone: true,
  imports: [IconComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="appointment-card"
      [class.appointment-card--15min]="is15Min()"
      [class.appointment-card--cancelled]="isCancelled()"
      [class.appointment-card--positioned]="isPositioned()"
      [class.appointment-card--with-pro]="showProfessional()"
      [class.appointment-card--selected]="selected()"
      [style.top]="topStyle()"
      [style.height]="heightStyle()"
      [style.--card-tone-bar]="toneBar()"
      [style.--card-tone-bg]="toneBg()"
      [style.--card-tone-text]="toneText()"
      [style.--card-pro-color]="appointment().colorTag || 'var(--slate-500)'"
    >
      <button
        type="button"
        class="appointment-card__main-btn"
        aria-haspopup="dialog"
        [attr.aria-expanded]="selected()"
        [attr.aria-label]="ariaLabel()"
        (click)="onOpen()"
      >
        @if (is15Min()) {
          <div class="appointment-card__single-line">
            <span class="appointment-card__time">{{ timeRangeText() }}</span>
            <span class="appointment-card__patient-name truncate">{{ appointment().patientName }}</span>
            @if (displayState().isConfirmed) {
              <span class="appointment-card__check" aria-hidden="true">✓</span>
            }
            <span class="sr-only">{{ displayState().label }}</span>
            @if (sourceLabel()) {
              <bd-icon [name]="sourceIcon()!" [size]="14" [label]="sourceLabel()!" class="appointment-card__source-icon" />
            }
          </div>
        } @else {
          <div class="appointment-card__body">
            <div class="appointment-card__header">
              <span class="appointment-card__time">{{ timeRangeText() }}</span>
              <bd-status-badge
                [tone]="displayState().tone"
                [label]="displayState().label"
                [showCheck]="displayState().isConfirmed ?? false"
              />
            </div>

            <div class="appointment-card__patient">
              <span class="appointment-card__patient-name">{{ appointment().patientName }}</span>
              @if (sourceLabel()) {
                <bd-icon
                  [name]="sourceIcon()!"
                  [size]="14"
                  [label]="sourceLabel()!"
                  class="appointment-card__source-icon"
                />
              }
            </div>

            <div class="appointment-card__specialty">
              <span>{{ appointment().specialtyName }}</span>
              @if (appointment().reason) {
                <span class="appointment-card__reason"> · {{ appointment().reason }}</span>
              }
            </div>

            @if (showProfessional()) {
              <div class="appointment-card__professional">
                <span
                  class="appointment-card__pro-dot"
                  [style.background-color]="appointment().colorTag || 'var(--slate-500)'"
                  aria-hidden="true"
                ></span>
                <span class="appointment-card__pro-name">{{ appointment().professionalName }}</span>
              </div>
            }
          </div>
        }
      </button>

      <div class="appointment-card__actions">
        <ng-content select="[actions]" />
        @if (checkInAvailable()) {
          <button
            type="button"
            class="appointment-card__check-in-btn"
            [attr.aria-label]="checkInAriaLabel()"
            [disabled]="checkInPending()"
            (click)="onCheckInClick($event)"
          >
            @if (checkInPending()) {
              <span class="appointment-card__spinner" aria-hidden="true"></span>
            } @else {
              <bd-icon [name]="checkIcon" [size]="14" aria-hidden="true" />
            }
            <span>Llegó</span>
          </button>
        }
      </div>
    </article>
  `,
  styles: `
    .appointment-card {
      position: relative;
      display: flex;
      flex-direction: column;
      background-color: var(--card-tone-bg);
      border-radius: var(--radius-sm);
      border: 1px solid color-mix(in srgb, var(--card-tone-bar) 20%, var(--slate-200));
      border-left: 4px solid var(--card-tone-bar);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      transition: box-shadow var(--transition-fast);
      box-sizing: border-box;
    }

    .appointment-card--with-pro {
      border-left: 5px solid var(--card-pro-color);
    }

    .appointment-card--positioned {
      position: absolute;
      left: 3px;
      right: 3px;
      z-index: 2;
    }

    .appointment-card:hover {
      box-shadow: var(--shadow-md);
      z-index: 5;
    }

    .appointment-card__main-btn {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      padding: 0.45rem 0.6rem;
      border: none;
      background: transparent;
      color: var(--card-tone-text);
      text-align: left;
      cursor: pointer;
      font-family: inherit;
      box-sizing: border-box;
      outline: none;
    }

    .appointment-card__main-btn:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: -2px;
    }

    .appointment-card--15min .appointment-card__main-btn {
      padding: 0.15rem 0.5rem;
      justify-content: center;
    }

    .appointment-card__single-line {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: var(--fs-xs);
      line-height: 1.2;
      width: 100%;
      overflow: hidden;
    }

    .appointment-card__single-line .truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
      flex: 1;
    }

    .appointment-card__body {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      width: 100%;
      overflow: hidden;
    }

    .appointment-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.3rem;
      margin-bottom: 0.1rem;
    }

    .appointment-card__time {
      font-size: var(--fs-xs);
      font-weight: 700;
      letter-spacing: -0.01em;
      opacity: 0.9;
    }

    .appointment-card__patient {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .appointment-card__patient-name {
      font-size: var(--fs-sm);
      font-weight: 700;
      color: var(--blue-950);
      line-height: 1.2;
    }

    .appointment-card__check {
      font-weight: bold;
      color: var(--blue-700);
    }

    .appointment-card__specialty {
      font-size: var(--fs-xs);
      color: var(--slate-600);
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .appointment-card__reason {
      font-style: italic;
      opacity: 0.85;
    }

    .appointment-card__professional {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-600);
      margin-top: 0.15rem;
    }

    .appointment-card__pro-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .appointment-card__source-icon {
      flex-shrink: 0;
      opacity: 0.85;
    }

    .appointment-card--cancelled .appointment-card__patient-name,
    .appointment-card--cancelled .appointment-card__specialty,
    .appointment-card--cancelled .appointment-card__time {
      text-decoration: line-through;
      color: var(--slate-500);
    }

    .appointment-card--selected {
      outline: 2px solid var(--color-primary);
      outline-offset: -1px;
      box-shadow: var(--shadow-md);
      z-index: 10;
    }

    .appointment-card__actions {
      position: absolute;
      bottom: 0.35rem;
      right: 0.4rem;
      z-index: 4;
    }

    .appointment-card__check-in-btn {
      min-width: 44px;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
      padding: 0.35rem 0.65rem;
      background-color: var(--color-primary);
      color: var(--white);
      border: 1px solid var(--color-primary);
      border-radius: var(--radius-sm);
      font-size: var(--fs-xs);
      font-weight: 600;
      cursor: pointer;
      box-shadow: var(--shadow-sm);
      transition: background-color var(--transition-fast);

      &:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: 1px;
      }

      &:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }
    }

    .appointment-card__spinner {
      width: 14px;
      height: 14px;
      border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: cardBtnSpin 0.7s linear infinite;
    }

    @keyframes cardBtnSpin {
      to {
        transform: rotate(360deg);
      }
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
  `,
})
export class AppointmentCardComponent {
  private readonly clock = inject(ClinicClock);
  private readonly clinicTimePipe = new ClinicTimePipe();

  readonly appointment = input.required<Appointment>();
  readonly showProfessional = input<boolean>(false);
  readonly topHours = input<number | null>(null);
  readonly heightHours = input<number | null>(null);
  readonly selected = input<boolean>(false);
  readonly checkInAvailable = input<boolean>(false);
  readonly checkInPending = input<boolean>(false);

  readonly opened = output<Appointment>();
  readonly checkIn = output<Appointment>();

  readonly checkIcon: LucideIconData = Check;

  readonly displayState = computed(() => appointmentDisplayState(this.appointment()));

  readonly isCancelled = computed(() => {
    const s = this.appointment().status;
    return s === 'CANCELLED' || s === 'RESCHEDULED';
  });

  readonly isPositioned = computed(() => this.topHours() !== null && this.heightHours() !== null);
  readonly topStyle = computed(() => (this.topHours() !== null ? `calc(var(--hour-height) * ${this.topHours()})` : null));
  readonly heightStyle = computed(() => (this.heightHours() !== null ? `calc(var(--hour-height) * ${this.heightHours()})` : null));

  readonly startMinutes = computed(() => this.clock.minutesOfDay(this.appointment().startAt));
  readonly endMinutes = computed(() => this.clock.minutesOfDay(this.appointment().endAt));
  readonly durationMinutes = computed(() => Math.max(15, this.endMinutes() - this.startMinutes()));

  readonly is15Min = computed(() => this.durationMinutes() <= 15);

  readonly startTimeFormatted = computed(() => this.clinicTimePipe.transform(this.appointment().startAt));
  readonly endTimeFormatted = computed(() => this.clinicTimePipe.transform(this.appointment().endAt));
  readonly timeRangeText = computed(() => `${this.startTimeFormatted()}–${this.endTimeFormatted()}`);

  readonly sourceIcon = computed<LucideIconData | null>(() => {
    const src = this.appointment().source;
    if (src === 'BOT') return Bot;
    if (src === 'WALK_IN') return Footprints;
    return null;
  });

  readonly sourceLabel = computed<string | null>(() => {
    const src = this.appointment().source;
    if (src === 'BOT') return 'Agendada por el bot';
    if (src === 'WALK_IN') return 'Sin cita';
    return null;
  });

  readonly ariaLabel = computed(() => {
    const appt = this.appointment();
    const st = this.displayState();
    return `${this.startTimeFormatted()} a ${this.endTimeFormatted()}, ${appt.patientName}, ${appt.specialtyName}, ${st.label}`;
  });

  readonly checkInAriaLabel = computed(() => `Registrar llegada de ${this.appointment().patientName}`);

  onCheckInClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.checkInAvailable() && !this.checkInPending()) {
      this.checkIn.emit(this.appointment());
    }
  }

  readonly toneBar = computed(() => {
    switch (this.displayState().tone) {
      case 'scheduled':
        return 'var(--appointment-scheduled-bar)';
      case 'waiting':
        return 'var(--appointment-waiting-bar)';
      case 'in-progress':
        return 'var(--appointment-in-progress-bar)';
      case 'attended':
        return 'var(--appointment-completed-bar)';
      case 'no-show':
        return 'var(--appointment-no-show-bar)';
      case 'cancelled':
        return 'var(--appointment-cancelled-bar)';
    }
  });

  readonly toneBg = computed(() => {
    switch (this.displayState().tone) {
      case 'scheduled':
        return 'var(--appointment-scheduled-bg)';
      case 'waiting':
        return 'var(--appointment-waiting-bg)';
      case 'in-progress':
        return 'var(--appointment-in-progress-bg)';
      case 'attended':
        return 'var(--appointment-completed-bg)';
      case 'no-show':
        return 'var(--appointment-no-show-bg)';
      case 'cancelled':
        return 'var(--appointment-cancelled-bg)';
    }
  });

  readonly toneText = computed(() => {
    switch (this.displayState().tone) {
      case 'scheduled':
        return 'var(--appointment-scheduled-text)';
      case 'waiting':
        return 'var(--appointment-waiting-text)';
      case 'in-progress':
        return 'var(--appointment-in-progress-text)';
      case 'attended':
        return 'var(--appointment-completed-text)';
      case 'no-show':
        return 'var(--appointment-no-show-text)';
      case 'cancelled':
        return 'var(--appointment-cancelled-text)';
    }
  });

  onOpen(): void {
    this.opened.emit(this.appointment());
  }
}
