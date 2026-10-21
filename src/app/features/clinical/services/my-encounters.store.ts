import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import { SessionStore } from '../../../core/auth/session.store';
import { ClinicClock } from '../../../core/services/clinic-clock.service';
import { Appointment, AppointmentsApi } from '../../appointments';
import { isEncounterOpen } from '../domain/encounter-log';
import { EncounterPeriod } from '../domain/encounter-period';

interface PeriodRequest {
  period: EncounterPeriod;
  professionalId: string;
}

@Injectable()
export class MyEncountersStore {
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly sessionStore = inject(SessionStore);
  private readonly clinicClock = inject(ClinicClock);

  private readonly requests = new Subject<PeriodRequest>();

  readonly period = signal<EncounterPeriod | null>(null);
  readonly appointments = signal<Appointment[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly unlinkedUser = signal<boolean>(false);
  readonly onlyOpen = signal<boolean>(false);

  /** Solo citas con atención, de la más reciente a la más antigua. */
  readonly encounters = computed(() =>
    this.appointments()
      .filter((appointment) => appointment.encounterId != null)
      .sort((a, b) => b.startAt.localeCompare(a.startAt))
  );

  readonly openCount = computed(() => this.encounters().filter(isEncounterOpen).length);

  readonly visibleEncounters = computed(() =>
    this.onlyOpen() ? this.encounters().filter(isEncounterOpen) : this.encounters()
  );

  constructor() {
    this.requests
      .pipe(
        switchMap((request) => this.fetchEncounters(request)),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  load(period: EncounterPeriod): void {
    this.period.set(period);
    const professionalId = this.sessionStore.currentUser()?.professionalId;
    if (!professionalId) {
      this.unlinkedUser.set(true);
      this.appointments.set([]);
      this.loading.set(false);
      return;
    }

    this.unlinkedUser.set(false);
    this.requests.next({ period, professionalId });
  }

  retry(): void {
    const current = this.period();
    if (current) {
      this.load(current);
    }
  }

  setOnlyOpen(value: boolean): void {
    this.onlyOpen.set(value);
  }

  private fetchEncounters(request: PeriodRequest): Observable<Appointment[]> {
    this.loading.set(true);
    this.error.set(null);

    return this.appointmentsApi
      .list({
        professionalId: request.professionalId,
        from: this.clinicClock.dayRange(request.period.from).from,
        to: this.clinicClock.dayRange(request.period.to).to,
      })
      .pipe(
        tap({
          next: (appointments) => {
            this.appointments.set(appointments);
            this.loading.set(false);
          },
          error: (err: ApiError) => {
            this.loading.set(false);
            this.error.set(err?.message || 'No se pudieron cargar las atenciones');
          },
        }),
        catchError(() => EMPTY)
      );
  }
}
