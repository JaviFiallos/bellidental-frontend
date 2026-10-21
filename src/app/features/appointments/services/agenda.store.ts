import {
  computed,
  inject,
  Injectable,
  OnDestroy,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import { ClinicClock } from '../../../core/services/clinic-clock.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Professional, ProfessionalsApi } from '../../professionals';
import {
  AgendaTimeRange,
  calculateAgendaTimeRange,
} from '../domain/agenda-layout';
import {
  appointmentDisplayState,
  AppointmentActionType,
} from '../domain/appointment-state';
import { Appointment } from '../models/appointment.models';
import { EffectiveDay } from '../models/schedule.models';
import { AppointmentsApi } from './appointments.api';
import { SchedulesApi } from './schedules.api';

export interface AgendaSummary {
  total: number;
  scheduled: number;
  waiting: number;
  attended: number;
  noShow: number;
}

@Injectable()
export class AgendaStore implements OnDestroy {
  private readonly clinicClock = inject(ClinicClock);
  private readonly professionalsApi = inject(ProfessionalsApi);
  private readonly schedulesApi = inject(SchedulesApi);
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly notificationService = inject(NotificationService);

  // State signals
  readonly date = signal<string>('');
  readonly view = signal<'professional' | 'status'>('professional');
  readonly showCancelled = signal<boolean>(false);
  readonly showAllProfessionals = signal<boolean>(false);

  readonly professionals = signal<Professional[]>([]);
  readonly effectiveDays = signal<Record<string, EffectiveDay[]>>({});
  readonly appointments = signal<Appointment[]>([]);

  readonly selectedAppointmentId = signal<string | null>(null);
  readonly pendingAction = signal<AppointmentActionType | null>(null);
  readonly pendingActionAppointmentId = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly now = signal<Date>(this.clinicClock.now());
  readonly lastUpdatedAt = signal<Date | null>(null);
  readonly refreshError = signal<boolean>(false);

  private readonly loadTrigger$ = new Subject<string>();
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly visibilityHandler = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      this.refreshAppointments();
    }
  };

  constructor() {
    this.loadTrigger$
      .pipe(
        switchMap((dateToLoad) => {
          this.loading.set(true);
          this.error.set(null);
          this.refreshError.set(false);

          const range = this.clinicClock.dayRange(dateToLoad);
          const profs$ =
            this.professionals().length > 0
              ? of(this.professionals())
              : this.professionalsApi.list();

          return profs$.pipe(
            switchMap((profs) => {
              this.professionals.set(profs);

              const schedules$ =
                profs.length > 0
                  ? forkJoin(
                      profs.map((p) =>
                        this.schedulesApi.getEffective(p.id, dateToLoad, dateToLoad)
                      )
                    )
                  : of([] as EffectiveDay[][]);

              const appointments$ = this.appointmentsApi.list({
                from: range.from,
                to: range.to,
              });

              return forkJoin({
                schedules: schedules$,
                appointments: appointments$,
              }).pipe(
                map(({ schedules, appointments }) => {
                  const effMap: Record<string, EffectiveDay[]> = {};
                  profs.forEach((p, idx) => {
                    effMap[p.id] = schedules[idx] || [];
                  });
                  return { dateToLoad, effMap, appointments };
                })
              );
            }),
            catchError((err: ApiError) => {
              this.loading.set(false);
              this.error.set(err?.message || '');
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe(({ dateToLoad, effMap, appointments }) => {
        if (this.date() === dateToLoad) {
          this.effectiveDays.set(effMap);
          this.appointments.set(appointments);
          this.loading.set(false);
          const currentNow = this.clinicClock.now();
          this.now.set(currentNow);
          this.lastUpdatedAt.set(currentNow);
          this.refreshError.set(false);
        }
      });

    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  // Computed signals
  readonly selectedAppointment = computed<Appointment | null>(() => {
    const id = this.selectedAppointmentId();
    if (!id) return null;
    return this.appointments().find((a) => a.id === id) ?? null;
  });

  readonly displayedAppointments = computed(() => {
    const list = this.appointments();
    if (this.showCancelled()) {
      return list;
    }
    return list.filter(
      (a) => a.status !== 'CANCELLED' && a.status !== 'RESCHEDULED'
    );
  });

  readonly summary = computed<AgendaSummary>(() => {
    const list = this.appointments().filter(
      (a) => a.status !== 'CANCELLED' && a.status !== 'RESCHEDULED'
    );

    let scheduled = 0;
    let waiting = 0;
    let attended = 0;
    let noShow = 0;

    for (const appt of list) {
      const state = appointmentDisplayState(appt);
      if (state.tone === 'waiting') {
        waiting++;
      } else if (state.tone === 'scheduled') {
        scheduled++;
      } else if (state.tone === 'attended') {
        attended++;
      } else if (state.tone === 'no-show') {
        noShow++;
      }
    }

    return {
      total: list.length,
      scheduled,
      waiting,
      attended,
      noShow,
    };
  });

  readonly displayedProfessionals = computed(() => {
    const all = this.professionals();
    if (this.showAllProfessionals()) {
      return all;
    }

    const effMap = this.effectiveDays();
    const appts = this.appointments();

    return all.filter((prof) => {
      const eff = effMap[prof.id];
      const hasShifts = eff && eff.some((d) => d.shifts && d.shifts.length > 0);
      const hasAppts = appts.some((a) => a.professionalId === prof.id);
      return hasShifts || hasAppts;
    });
  });

  readonly timeRange = computed<AgendaTimeRange>(() => {
    const effMap = this.effectiveDays();
    const profs = this.displayedProfessionals();
    const appts = this.displayedAppointments();

    const shiftTimes: { startTime: string; endTime: string }[] = [];
    for (const prof of profs) {
      const eff = effMap[prof.id];
      if (eff) {
        for (const day of eff) {
          if (day.shifts) {
            for (const shift of day.shifts) {
              shiftTimes.push(shift);
            }
          }
        }
      }
    }

    const apptTimes = appts.map((a) => ({
      startMinutes: this.clinicClock.minutesOfDay(a.startAt),
      endMinutes: this.clinicClock.minutesOfDay(a.endAt),
    }));

    return calculateAgendaTimeRange(
      shiftTimes,
      apptTimes,
      (t) => this.clinicClock.minutesOfDay(t)
    );
  });

  readonly appointmentsByProfessional = computed<Record<string, Appointment[]>>(() => {
    const map: Record<string, Appointment[]> = {};
    for (const prof of this.displayedProfessionals()) {
      map[prof.id] = [];
    }

    for (const appt of this.displayedAppointments()) {
      if (!map[appt.professionalId]) {
        map[appt.professionalId] = [];
      }
      map[appt.professionalId].push(appt);
    }

    return map;
  });

  readonly appointmentsByStatus = computed<Record<string, Appointment[]>>(() => {
    const map: Record<string, Appointment[]> = {
      scheduled: [],
      waiting: [],
      attended: [],
      'no-show': [],
      cancelled: [],
    };

    for (const appt of this.displayedAppointments()) {
      const state = appointmentDisplayState(appt);
      const tone = state.tone;
      if (map[tone]) {
        map[tone].push(appt);
      }
    }

    // Sort by startAt within each column
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) =>
        this.clinicClock.minutesOfDay(a.startAt) - this.clinicClock.minutesOfDay(b.startAt)
      );
    }

    return map;
  });

  // Actions
  setDate(newDate: string): void {
    if (this.date() !== newDate) {
      this.date.set(newDate);
      this.loadAgenda(newDate);
    }
  }

  setView(newView: 'professional' | 'status'): void {
    this.view.set(newView);
  }

  setShowCancelled(val: boolean): void {
    this.showCancelled.set(val);
  }

  setShowAllProfessionals(val: boolean): void {
    this.showAllProfessionals.set(val);
  }

  loadAgenda(dateToLoad: string): void {
    this.loadTrigger$.next(dateToLoad);
  }

  selectAppointment(id: string | null): void {
    this.selectedAppointmentId.set(id);
    this.actionError.set(null);
  }

  runAction(id: string, action: AppointmentActionType): void {
    if (this.pendingAction()) {
      return;
    }

    this.pendingAction.set(action);
    this.pendingActionAppointmentId.set(id);
    this.actionError.set(null);

    let call$: Observable<string>;
    switch (action) {
      case 'confirm':
        call$ = this.appointmentsApi.confirm(id);
        break;
      case 'check-in':
        call$ = this.appointmentsApi.checkIn(id);
        break;
      case 'no-show':
        call$ = this.appointmentsApi.noShow(id);
        break;
      case 'cancel':
        call$ = this.appointmentsApi.cancel(id);
        break;
      default:
        return;
    }

    call$.subscribe({
      next: (message: string) => {
        this.pendingAction.set(null);
        this.pendingActionAppointmentId.set(null);
        this.actionError.set(null);
        this.notificationService.success(message);
        if (action === 'cancel') {
          this.selectedAppointmentId.set(null);
        }
        this.refreshAppointments();
      },
      error: (err: ApiError) => {
        this.pendingAction.set(null);
        this.pendingActionAppointmentId.set(null);
        this.actionError.set(err?.message || 'Error al procesar la acción');
        this.refreshAppointments();
      },
    });
  }

  refreshAppointments(): void {
    const curDate = this.date();
    if (!curDate || this.loading() || this.error()) {
      return;
    }

    const range = this.clinicClock.dayRange(curDate);
    this.appointmentsApi.list({ from: range.from, to: range.to }).subscribe({
      next: (appts) => {
        if (this.date() === curDate) {
          const currentSelectedId = this.selectedAppointmentId();
          if (currentSelectedId) {
            const exists = appts.some((a) => a.id === currentSelectedId);
            if (!exists) {
              this.selectedAppointmentId.set(null);
              this.notificationService.error('La cita ya no está en este día');
            }
          }
          this.appointments.set(appts);
          const currentNow = this.clinicClock.now();
          this.now.set(currentNow);
          this.lastUpdatedAt.set(currentNow);
          this.refreshError.set(false);
        }
      },
      error: () => {
        this.refreshError.set(true);
      },
    });
  }

  private startAutoRefresh(): void {
    if (typeof window !== 'undefined') {
      this.refreshIntervalId = setInterval(() => {
        this.refreshAppointments();
      }, 60000);

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.visibilityHandler);
      }
    }
  }

  private stopAutoRefresh(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
  }
}
