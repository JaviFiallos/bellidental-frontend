import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { AppointmentsApi } from './appointments.api';
import { Appointment } from '../models/appointment.models';
import { ClinicClock } from '../../../core/services/clinic-clock.service';
import { SessionStore } from '../../../core/auth/session.store';

@Injectable()
export class NextAppointmentStore {
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly clinicClock = inject(ClinicClock);
  private readonly sessionStore = inject(SessionStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly today = signal<Date>(this.clinicClock.now());

  private readonly _appointments = signal<Appointment[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _hasError = signal<boolean>(false);

  readonly appointments = this._appointments.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly hasError = this._hasError.asReadonly();

  /**
   * Cita próxima: la de startAt más temprano entre las PENDING/CONFIRMED con endAt posterior a ahora.
   */
  readonly nextAppointment = computed<Appointment | null>(() => {
    const list = this._appointments();
    if (!list.length) return null;

    const now = this.clinicClock.now().getTime();

    const candidates = list.filter((app) => {
      const isPendingOrConfirmed = app.status === 'PENDING' || app.status === 'CONFIRMED';
      const endsAfterNow = new Date(app.endAt).getTime() > now;
      return isPendingOrConfirmed && endsAfterNow;
    });

    if (!candidates.length) return null;

    candidates.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    return candidates[0];
  });

  start(): void {
    this.load();

    if (typeof window !== 'undefined') {
      const intervalId = window.setInterval(() => {
        this.load();
      }, 60000);

      this.destroyRef.onDestroy(() => {
        window.clearInterval(intervalId);
      });
    }

    if (typeof document !== 'undefined') {
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          this.load();
        }
      };

      document.addEventListener('visibilitychange', onVisibilityChange);

      this.destroyRef.onDestroy(() => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      });
    }
  }

  load(): void {
    this.today.set(this.clinicClock.now());
    const range = this.clinicClock.todayRange();
    const profile = this.sessionStore.profile();
    const user = this.sessionStore.currentUser();

    // SECRETARIA -> sin professionalId (todas las citas)
    // ODONTOLOGO/DIRECTOR -> su professionalId (si director no tiene professionalId, no pide)
    let professionalId: string | null | undefined = null;
    if (profile === 'ODONTOLOGO' || profile === 'DIRECTOR') {
      if (!user?.professionalId) {
        this._appointments.set([]);
        return;
      }
      professionalId = user.professionalId;
    }

    this._isLoading.set(true);
    this._hasError.set(false);

    this.appointmentsApi
      .list({
        from: range.from,
        to: range.to,
        professionalId,
      })
      .subscribe({
        next: (items) => {
          this._appointments.set(items);
          this._isLoading.set(false);
          this._hasError.set(false);
        },
        error: () => {
          this._isLoading.set(false);
          this._hasError.set(true);
        },
      });
  }
}

