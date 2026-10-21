import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import { SessionStore } from '../../../core/auth/session.store';
import { ClinicClock } from '../../../core/services/clinic-clock.service';
import { Appointment, AppointmentsApi } from '../../appointments';
import { EncountersApi, Encounter } from '../../clinical';
import { boardColumn } from '../domain/board-columns';

@Injectable()
export class DentistBoardStore implements OnDestroy {
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly encountersApi = inject(EncountersApi);
  private readonly sessionStore = inject(SessionStore);
  private readonly clinicClock = inject(ClinicClock);

  // State signals
  readonly appointments = signal<Appointment[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly refreshError = signal<boolean>(false);
  readonly unlinkedUser = signal<boolean>(false);

  private readonly checkedInIds = new Set<string>();
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly visibilityHandler = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      this.refresh();
    }
  };

  // Computed signals
  readonly scheduled = computed(() =>
    this.appointments()
      .filter((a) => boardColumn(a) === 'scheduled')
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
  );

  readonly waiting = computed(() =>
    this.appointments()
      .filter((a) => boardColumn(a) === 'waiting')
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
  );

  readonly inProgress = computed(() =>
    this.appointments()
      .filter((a) => boardColumn(a) === 'in-progress')
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
  );

  readonly attended = computed(() =>
    this.appointments()
      .filter((a) => boardColumn(a) === 'attended')
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
  );

  readonly totalCount = computed(
    () =>
      this.scheduled().length +
      this.waiting().length +
      this.inProgress().length +
      this.attended().length
  );

  readonly isEmpty = computed(
    () =>
      !this.loading() &&
      !this.error() &&
      !this.unlinkedUser() &&
      this.totalCount() === 0
  );

  constructor() {
    this.load();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  load(): void {
    const profId = this.sessionStore.currentUser()?.professionalId;
    if (!profId) {
      this.unlinkedUser.set(true);
      this.loading.set(false);
      return;
    }

    this.unlinkedUser.set(false);
    this.loading.set(true);
    this.error.set(null);
    this.refreshError.set(false);

    const range = this.clinicClock.todayRange();
    this.appointmentsApi
      .list({
        professionalId: profId,
        from: range.from,
        to: range.to,
      })
      .subscribe({
        next: (appts) => {
          this.appointments.set(appts);
          this.loading.set(false);
          this.refreshError.set(false);
        },
        error: (err: ApiError) => {
          this.loading.set(false);
          this.error.set(err?.message || 'Error al cargar las citas');
        },
      });
  }

  refresh(): void {
    const profId = this.sessionStore.currentUser()?.professionalId;
    if (!profId || this.unlinkedUser() || this.loading() || this.error()) {
      return;
    }

    const range = this.clinicClock.todayRange();
    this.appointmentsApi
      .list({
        professionalId: profId,
        from: range.from,
        to: range.to,
      })
      .subscribe({
        next: (appts) => {
          this.appointments.set(appts);
          this.refreshError.set(false);
        },
        error: () => {
          this.refreshError.set(true);
        },
      });
  }

  startEncounter(appointment: Appointment, chiefComplaint: string): Observable<Encounter> {
    const alreadyCheckedIn =
      Boolean(appointment.checkedInAt) || this.checkedInIds.has(appointment.id);

    const checkIn$: Observable<unknown> = alreadyCheckedIn
      ? of(null)
      : this.appointmentsApi.checkIn(appointment.id).pipe(
          tap(() => {
            this.checkedInIds.add(appointment.id);
          })
        );

    return checkIn$.pipe(
      switchMap(() => this.encountersApi.open(appointment.id, { chiefComplaint })),
      tap(() => {
        this.refresh();
      }),
      catchError((err: unknown) => {
        this.refresh();
        return throwError(() => err);
      })
    );
  }

  private startAutoRefresh(): void {
    if (typeof window !== 'undefined') {
      this.refreshIntervalId = setInterval(() => {
        this.refresh();
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
