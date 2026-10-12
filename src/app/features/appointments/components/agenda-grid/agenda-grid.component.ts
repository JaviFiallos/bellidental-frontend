import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ClinicClock } from '../../../../core/services/clinic-clock.service';
import { Professional } from '../../../professionals';
import {
  AgendaTimeRange,
  calculatePositionedAppointment,
  calculateShades,
  minutesToRemOffset,
  PositionedAppointment,
  ShadedInterval,
} from '../../domain/agenda-layout';
import { Appointment } from '../../models/appointment.models';
import { EffectiveDay, Shift } from '../../models/schedule.models';
import { AppointmentCardComponent } from '../appointment-card/appointment-card.component';

@Component({
  selector: 'bd-agenda-grid',
  standalone: true,
  imports: [AppointmentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="agenda-grid-wrapper" #scrollContainer>
      @if (totalAppointmentsCount() === 0 && professionals().length > 0) {
        <div class="agenda-grid__no-appts-notice" role="status">
          Sin citas este día
        </div>
      }

      <div
        class="agenda-grid"
        [style.--total-height]="timeRange().totalHeightRem + 'rem'"
        [style.--columns-count]="professionals().length"
      >
        <!-- Encabezados de columnas (sticky arriba) -->
        <div class="agenda-grid__header-row">
          <div class="agenda-grid__corner-header">Hora</div>

          @for (prof of professionals(); track prof.id) {
            <div class="agenda-grid__col-header">
              <span
                class="agenda-grid__pro-dot"
                [style.background-color]="prof.colorTag || 'var(--slate-400)'"
                aria-hidden="true"
              ></span>
              <span class="agenda-grid__pro-name">{{ prof.fullName }}</span>
            </div>
          }
        </div>

        <!-- Cuerpo de la grilla -->
        <div class="agenda-grid__body">
          <!-- Columna fija de horas -->
          <div class="agenda-grid__time-col">
            @for (h of hourSlots(); track h) {
              <div class="agenda-grid__time-cell">
                <span class="agenda-grid__time-label">{{ formatHour(h) }}</span>
              </div>
            }
          </div>

          <!-- Columnas de profesionales -->
          <div class="agenda-grid__cols-container">
            <!-- Línea de ahora -->
            @if (showNowLine()) {
              <div
                class="agenda-grid__now-line"
                [style.top]="nowLineOffsetRem() + 'rem'"
                aria-hidden="true"
              >
                <span class="agenda-grid__now-chip">{{ nowTimeText() }}</span>
              </div>
            }

            @for (prof of professionals(); track prof.id) {
              <div
                class="agenda-grid__prof-col"
                [attr.data-professional-id]="prof.id"
              >
                <!-- Líneas horarias de fondo -->
                @for (h of hourSlots(); track h) {
                  <div class="agenda-grid__bg-hour-cell">
                    <div class="agenda-grid__bg-quarter-line"></div>
                    <div class="agenda-grid__bg-quarter-line"></div>
                    <div class="agenda-grid__bg-quarter-line"></div>
                  </div>
                }

                <!-- Intervalos sombreados fuera de horario -->
                @for (shade of shadesByProf()[prof.id] || []; track $index) {
                  <div
                    class="agenda-grid__shade-block"
                    [style.top]="shade.topRem + 'rem'"
                    [style.height]="shade.heightRem + 'rem'"
                    aria-hidden="true"
                  ></div>
                }

                <!-- Citas del profesional posicionadas -->
                @for (item of positionedApptsByProf()[prof.id] || []; track item.appointment.id) {
                  <bd-appointment-card
                    [appointment]="item.appointment"
                    [topRem]="item.topRem"
                    [heightRem]="item.heightRem"
                    [selected]="selectedId() === item.appointment.id"
                    [checkInAvailable]="quickCheckInIds().has(item.appointment.id)"
                    [checkInPending]="pendingCheckInId() === item.appointment.id"
                    (opened)="opened.emit($event)"
                    (checkIn)="checkIn.emit($event)"
                  />
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .agenda-grid-wrapper {
      position: relative;
      overflow-x: auto;
      overflow-y: auto;
      max-height: calc(100vh - 14rem);
      min-height: 400px;
      background-color: var(--white);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
    }

    .agenda-grid__no-appts-notice {
      position: sticky;
      top: 48px;
      left: 0;
      right: 0;
      z-index: 9;
      background-color: color-mix(in srgb, var(--blue-100) 80%, var(--white));
      color: var(--blue-800);
      font-size: var(--fs-xs);
      font-weight: 600;
      text-align: center;
      padding: 0.35rem 1rem;
      border-bottom: 1px solid var(--blue-200);
    }

    .agenda-grid {
      display: flex;
      flex-direction: column;
      min-width: fit-content;
      position: relative;
    }

    /* Encabezado */
    .agenda-grid__header-row {
      display: flex;
      position: sticky;
      top: 0;
      z-index: 20;
      background-color: var(--white);
      border-bottom: 2px solid var(--slate-200);
    }

    .agenda-grid__corner-header {
      width: 4.5rem;
      min-width: 4.5rem;
      position: sticky;
      left: 0;
      z-index: 22;
      background-color: var(--white);
      border-right: 1px solid var(--slate-200);
      padding: 0.65rem 0.5rem;
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-500);
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .agenda-grid__col-header {
      flex: 1 1 0;
      min-width: 14rem;
      padding: 0.65rem 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      border-right: 1px solid var(--slate-200);
      background-color: var(--white);
    }

    .agenda-grid__pro-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .agenda-grid__pro-name {
      font-size: var(--fs-sm);
      font-weight: 700;
      color: var(--blue-950);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Cuerpo */
    .agenda-grid__body {
      display: flex;
      position: relative;
      height: var(--total-height);
    }

    .agenda-grid__time-col {
      width: 4.5rem;
      min-width: 4.5rem;
      position: sticky;
      left: 0;
      z-index: 15;
      background-color: var(--white);
      border-right: 1px solid var(--slate-200);
      display: flex;
      flex-direction: column;
    }

    .agenda-grid__time-cell {
      height: 8rem;
      box-sizing: border-box;
      border-bottom: 1px solid var(--slate-200);
      padding: 0.2rem 0.4rem;
      text-align: center;
    }

    .agenda-grid__time-label {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-500);
      line-height: 1;
    }

    .agenda-grid__cols-container {
      display: flex;
      flex: 1;
      position: relative;
    }

    .agenda-grid__prof-col {
      flex: 1 1 0;
      min-width: 14rem;
      position: relative;
      border-right: 1px solid var(--slate-200);
      height: var(--total-height);
    }

    .agenda-grid__bg-hour-cell {
      height: 8rem;
      box-sizing: border-box;
      border-bottom: 1px solid var(--slate-300);
      display: flex;
      flex-direction: column;
    }

    .agenda-grid__bg-quarter-line {
      flex: 1;
      border-bottom: 1px solid color-mix(in srgb, var(--slate-200) 70%, transparent);
    }

    .agenda-grid__bg-quarter-line:last-child {
      border-bottom: none;
    }

    .agenda-grid__shade-block {
      position: absolute;
      left: 0;
      right: 0;
      background-color: color-mix(in srgb, var(--slate-100) 80%, transparent);
      pointer-events: none;
      z-index: 1;
    }

    /* Línea de ahora */
    .agenda-grid__now-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background-color: var(--blue-950);
      z-index: 10;
      pointer-events: none;
      display: flex;
      align-items: center;
    }

    .agenda-grid__now-chip {
      position: sticky;
      left: 4.8rem;
      background-color: var(--blue-950);
      color: var(--white);
      font-size: var(--fs-xs);
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      transform: translateY(-50%);
    }

    @include bp.bp-down('md') {
      .agenda-grid__prof-col {
        min-width: 13rem;
      }
    }
  `,
})
export class AgendaGridComponent implements AfterViewInit {
  private readonly clinicClock = inject(ClinicClock);
  readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');

  readonly date = input.required<string>();
  readonly now = input.required<Date>();
  readonly timeRange = input.required<AgendaTimeRange>();
  readonly professionals = input.required<Professional[]>();
  readonly effectiveDays = input.required<Record<string, EffectiveDay[]>>();
  readonly appointmentsByProf = input.required<Record<string, Appointment[]>>();
  readonly selectedId = input<string | null>(null);
  readonly quickCheckInIds = input<Set<string>>(new Set());
  readonly pendingCheckInId = input<string | null>(null);

  readonly opened = output<Appointment>();
  readonly checkIn = output<Appointment>();

  readonly isToday = computed(() => this.date() === this.clinicClock.todayDateString());

  readonly hourSlots = computed(() => {
    const range = this.timeRange();
    const result: number[] = [];
    for (let h = range.startHour; h < range.endHour; h++) {
      result.push(h);
    }
    return result;
  });

  readonly totalAppointmentsCount = computed(() => {
    let count = 0;
    const map = this.appointmentsByProf();
    for (const key of Object.keys(map)) {
      count += map[key]?.length || 0;
    }
    return count;
  });

  readonly nowMinutes = computed(() => {
    const currentDate = this.now();
    return this.clinicClock.minutesOfDay(currentDate.toISOString());
  });

  readonly showNowLine = computed(() => {
    if (!this.isToday()) return false;
    const min = this.nowMinutes();
    const range = this.timeRange();
    return min >= range.startHour * 60 && min <= range.endHour * 60;
  });

  readonly nowLineOffsetRem = computed(() => {
    const range = this.timeRange();
    return minutesToRemOffset(this.nowMinutes(), range.startHour);
  });

  readonly nowTimeText = computed(() => {
    const min = this.nowMinutes();
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });

  readonly shadesByProf = computed<Record<string, ShadedInterval[]>>(() => {
    const result: Record<string, ShadedInterval[]> = {};
    const effMap = this.effectiveDays();
    const range = this.timeRange();

    for (const prof of this.professionals()) {
      const effDays = effMap[prof.id];
      const shifts: Shift[] = [];
      if (effDays) {
        for (const d of effDays) {
          if (d.shifts) shifts.push(...d.shifts);
        }
      }
      result[prof.id] = calculateShades(shifts, range, (t) =>
        this.clinicClock.minutesOfDay(t)
      );
    }
    return result;
  });

  readonly positionedApptsByProf = computed<Record<string, PositionedAppointment[]>>(() => {
    const result: Record<string, PositionedAppointment[]> = {};
    const apptMap = this.appointmentsByProf();
    const range = this.timeRange();

    for (const prof of this.professionals()) {
      const appts = apptMap[prof.id] || [];
      result[prof.id] = appts.map((appt) =>
        calculatePositionedAppointment(appt, range, (t) =>
          this.clinicClock.minutesOfDay(t)
        )
      );
    }
    return result;
  });

  ngAfterViewInit(): void {
    if (this.isToday() && this.showNowLine()) {
      setTimeout(() => {
        const container = this.scrollContainer()?.nativeElement;
        if (container) {
          const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
          const targetPx = this.nowLineOffsetRem() * remPx;
          const containerHeight = container.clientHeight;
          container.scrollTop = Math.max(0, targetPx - containerHeight / 3);
        }
      }, 50);
    }
  }

  formatHour(h: number): string {
    return `${h.toString().padStart(2, '0')}:00`;
  }
}
