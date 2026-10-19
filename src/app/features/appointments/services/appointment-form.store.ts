import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable, of, Subject, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import { ClinicClock } from '../../../core/services/clinic-clock.service';
import { ClinicTimePipe } from '../../../shared/pipes/clinic-time.pipe';
import { Patient } from '../../patients';
import { Professional, Specialty, SpecialtiesApi } from '../../professionals';
import {
  Appointment,
  AvailableSlot,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  WalkInAppointmentRequest,
} from '../models/appointment.models';
import { AppointmentsApi } from './appointments.api';
import { AvailabilityApi } from './availability.api';
import {
  DEFAULT_DURATION_MINUTES,
  formatDuration,
  MAX_DURATION_MINUTES,
  rangeFrom,
  roundUpToQuarter,
  SLOT_STEP_MINUTES,
} from '../domain/slot-ranges';

export type AppointmentFormMode = 'create' | 'walk-in' | 'reschedule';

export interface WalkInAvailability {
  firstSlot: AvailableSlot | null;
  label: string;
}

@Injectable()
export class AppointmentFormStore {
  private readonly specialtiesApi = inject(SpecialtiesApi);
  private readonly availabilityApi = inject(AvailabilityApi);
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly clinicClock = inject(ClinicClock);
  private readonly destroyRef = inject(DestroyRef);
  private readonly clinicTimePipe = new ClinicTimePipe();

  // Mode & context
  readonly mode = signal<AppointmentFormMode>('create');
  readonly originalAppointment = signal<Appointment | null>(null);

  // External data
  readonly allProfessionals = signal<Professional[]>([]);
  readonly allSpecialties = signal<Specialty[]>([]);

  // Form state
  readonly patient = signal<Patient | null>(null);
  readonly selectedSpecialtyId = signal<number | null>(null);
  readonly selectedProfessionalId = signal<string>('');
  readonly date = signal<string>('');
  readonly durationMinutes = signal<number>(DEFAULT_DURATION_MINUTES);
  readonly selectedSlot = signal<AvailableSlot | null>(null);

  readonly openedFromSlot = signal<boolean>(false);
  readonly pendingStartAt = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  // Walk-in availability per professional & loading
  readonly walkInAvailabilityByProf = signal<Record<string, WalkInAvailability>>({});
  readonly walkInLoading = signal<boolean>(false);

  // Slots state
  readonly slots = signal<AvailableSlot[]>([]);
  readonly slotsLoading = signal<boolean>(false);
  readonly slotsError = signal<string | null>(null);

  // Submit state
  readonly saving = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  private readonly availabilityTrigger$ = new Subject<{
    professionalId: string;
    specialtyId: number;
    date: string;
  }>();

  private readonly walkInTrigger$ = new Subject<{
    specialtyId: number;
    profs: Professional[];
    today: string;
  }>();

  constructor() {
    this.availabilityTrigger$
      .pipe(
        switchMap(({ professionalId, specialtyId, date }) => {
          this.slotsLoading.set(true);
          this.slotsError.set(null);
          return this.availabilityApi
            .slots(professionalId, specialtyId, date, SLOT_STEP_MINUTES)
            .pipe(
              catchError((err: ApiError) => {
                this.slotsLoading.set(false);
                this.slotsError.set(
                  err.message || 'Error al obtener horas disponibles'
                );
                this.slots.set([]);
                return of(null);
              })
            );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((slots) => {
        if (slots !== null) {
          this.slotsLoading.set(false);
          this.slots.set(slots);

          const pending = this.pendingStartAt();
          if (pending) {
            const pendingDate = pending.slice(0, 10);
            const pendingMin = this.clinicClock.minutesOfDay(pending);
            const match = slots.find(
              (s) =>
                s.startAt.slice(0, 10) === pendingDate &&
                this.clinicClock.minutesOfDay(s.startAt) === pendingMin
            );
            if (match) {
              const range = rangeFrom(slots, match.startAt, this.durationMinutes());
              if (range.length > 0) {
                this.selectedSlot.set(match);
                this.notice.set(null);
              } else {
                this.selectedSlot.set(null);
                const timeStr = this.clinicTimePipe.transform(match.startAt);
                const durStr = formatDuration(this.durationMinutes());
                this.notice.set(
                  `La cita de ${durStr} no cabe desde las ${timeStr}. Elige otra hora.`
                );
              }
            } else {
              this.selectedSlot.set(null);
              this.notice.set('Esa hora no está libre; elige otra.');
            }
            this.pendingStartAt.set(null);
          } else {
            const current = this.selectedSlot();
            if (current) {
              const currentDate = current.startAt.slice(0, 10);
              const currentMin = this.clinicClock.minutesOfDay(current.startAt);
              const match = slots.find(
                (s) =>
                  s.startAt.slice(0, 10) === currentDate &&
                  this.clinicClock.minutesOfDay(s.startAt) === currentMin
              );
              if (
                match &&
                rangeFrom(slots, match.startAt, this.durationMinutes()).length > 0
              ) {
                this.selectedSlot.set(match);
              } else {
                this.selectedSlot.set(null);
              }
            }
          }
        }
      });

    this.walkInTrigger$
      .pipe(
        switchMap(({ specialtyId, profs, today }) => {
          if (profs.length === 0) {
            this.walkInLoading.set(false);
            this.walkInAvailabilityByProf.set({});
            this.selectedProfessionalId.set('');
            return of(null);
          }

          this.walkInLoading.set(true);
          this.walkInAvailabilityByProf.set({});
          this.selectedProfessionalId.set('');
          this.notice.set(null);

          const requests = profs.map((p) =>
            this.availabilityApi.slots(p.id, specialtyId, today).pipe(
              map((slots) => ({
                profId: p.id,
                slots,
                error: false,
                errorMessage: null as string | null,
              })),
              catchError((err: ApiError) =>
                of({
                  profId: p.id,
                  slots: [] as AvailableSlot[],
                  error: true,
                  errorMessage: err.message || 'Error de disponibilidad',
                })
              )
            )
          );

          return forkJoin(requests).pipe(
            map((results) => ({ results, profs }))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => {
        if (!data) return;
        const { results } = data;
        this.walkInLoading.set(false);

        const mapData: Record<string, WalkInAvailability> = {};
        let bestProfId: string | null = null;
        let earliestMin = Infinity;
        let allFailed = results.length > 0;
        let firstErrorMessage: string | null = null;

        for (const { profId, slots, error, errorMessage } of results) {
          if (error) {
            mapData[profId] = {
              firstSlot: null,
              label: 'no disponible',
            };
            if (!firstErrorMessage && errorMessage) {
              firstErrorMessage = errorMessage;
            }
          } else {
            allFailed = false;
            if (slots && slots.length > 0) {
              const first = slots[0];
              const timeStr = this.clinicTimePipe.transform(first.startAt);
              mapData[profId] = {
                firstSlot: first,
                label: `libre ${timeStr}`,
              };
              const min = this.clinicClock.minutesOfDay(first.startAt);
              if (min < earliestMin) {
                earliestMin = min;
                bestProfId = profId;
              }
            } else {
              mapData[profId] = {
                firstSlot: null,
                label: 'sin hueco hoy',
              };
            }
          }
        }

        this.walkInAvailabilityByProf.set(mapData);

        if (allFailed) {
          this.error.set(firstErrorMessage || 'No se pudo obtener la disponibilidad.');
          this.selectedProfessionalId.set('');
          this.notice.set(null);
        } else if (bestProfId) {
          this.selectedProfessionalId.set(bestProfId);
          this.notice.set(null);
        } else {
          this.selectedProfessionalId.set('');
          this.notice.set('Ningún profesional tiene hueco hoy para esta especialidad.');
        }
      });
  }

  readonly availableSpecialties = computed<Specialty[]>(() => {
    const all = this.allSpecialties();
    const profs = this.allProfessionals();

    if (this.openedFromSlot()) {
      const selectedProf = profs.find(
        (p) => p.id === this.selectedProfessionalId()
      );
      if (selectedProf) {
        return all.filter((s) =>
          selectedProf.specialties.some((ps) => ps.id === s.id)
        );
      }
    }

    return all.filter((s) =>
      profs.some((p) => p.specialties.some((ps) => ps.id === s.id))
    );
  });

  readonly selectedSpecialty = computed<Specialty | null>(() => {
    const id = this.selectedSpecialtyId();
    if (id === null) return null;
    return this.allSpecialties().find((s) => s.id === id) || null;
  });

  readonly durationText = computed<string | null>(() => {
    const spec = this.selectedSpecialty();
    return spec ? `Duración: ${spec.defaultDurationMinutes} min` : null;
  });

  readonly availableProfessionals = computed<Professional[]>(() => {
    const specId = this.selectedSpecialtyId();
    if (specId === null) return [];
    return this.allProfessionals().filter((p) =>
      p.specialties.some((s) => s.id === specId)
    );
  });

  readonly isSlotPickerReady = computed<boolean>(() => {
    return (
      this.mode() !== 'walk-in' &&
      !!this.selectedProfessionalId() &&
      this.selectedSpecialtyId() !== null &&
      !!this.date()
    );
  });

  readonly selectedRange = computed<AvailableSlot[]>(() => {
    const slot = this.selectedSlot();
    if (!slot) return [];
    return rangeFrom(this.slots(), slot.startAt, this.durationMinutes());
  });

  readonly canSubmit = computed<boolean>(() => {
    if (this.saving()) {
      return false;
    }

    if (this.mode() === 'walk-in') {
      return (
        !!this.patient() &&
        this.selectedSpecialtyId() !== null &&
        !!this.selectedProfessionalId() &&
        !this.walkInLoading()
      );
    }

    if (this.mode() === 'reschedule') {
      return (
        this.selectedSpecialtyId() !== null &&
        !!this.selectedProfessionalId() &&
        !!this.date() &&
        !!this.selectedSlot() &&
        this.selectedRange().length > 0
      );
    }

    return (
      !!this.patient() &&
      this.selectedSpecialtyId() !== null &&
      !!this.selectedProfessionalId() &&
      !!this.date() &&
      !!this.selectedSlot() &&
      this.selectedRange().length > 0
    );
  });

  initSpecialties(): void {
    if (this.allSpecialties().length === 0) {
      this.specialtiesApi.list().subscribe({
        next: (specs) => this.allSpecialties.set(specs),
        error: (err: ApiError) => {
          this.error.set(err.message || 'No se pudieron cargar las especialidades.');
        },
      });
    }
  }

  setProfessionals(professionals: Professional[]): void {
    this.allProfessionals.set(professionals);
  }

  openNew(agendaDate: string): void {
    this.mode.set('create');
    this.originalAppointment.set(null);
    this.initSpecialties();
    this.patient.set(null);
    this.selectedSpecialtyId.set(null);
    this.selectedProfessionalId.set('');
    this.durationMinutes.set(DEFAULT_DURATION_MINUTES);
    this.selectedSlot.set(null);
    this.pendingStartAt.set(null);
    this.notice.set(null);
    this.error.set(null);
    this.saving.set(false);
    this.slots.set([]);
    this.slotsLoading.set(false);
    this.slotsError.set(null);
    this.openedFromSlot.set(false);
    this.walkInAvailabilityByProf.set({});
    this.walkInLoading.set(false);

    const today = this.clinicClock.todayDateString();
    const effectiveDate = agendaDate >= today ? agendaDate : today;
    this.date.set(effectiveDate);
  }

  openWalkIn(agendaDate: string): void {
    this.mode.set('walk-in');
    this.originalAppointment.set(null);
    this.initSpecialties();
    this.patient.set(null);
    this.selectedSpecialtyId.set(null);
    this.selectedProfessionalId.set('');
    this.selectedSlot.set(null);
    this.pendingStartAt.set(null);
    this.notice.set(null);
    this.error.set(null);
    this.saving.set(false);
    this.slots.set([]);
    this.slotsLoading.set(false);
    this.slotsError.set(null);
    this.openedFromSlot.set(false);
    this.walkInAvailabilityByProf.set({});
    this.walkInLoading.set(false);
    this.date.set(this.clinicClock.todayDateString());
  }

  openReschedule(appointment: Appointment): void {
    this.mode.set('reschedule');
    this.originalAppointment.set(appointment);
    this.initSpecialties();
    this.patient.set(null);
    this.selectedSpecialtyId.set(appointment.specialtyId);
    this.selectedProfessionalId.set(appointment.professionalId);
    const startMs = new Date(appointment.startAt).getTime();
    const endMs = new Date(appointment.endAt).getTime();
    const diffMins = Math.round((endMs - startMs) / 60000);
    this.durationMinutes.set(roundUpToQuarter(diffMins));
    this.selectedSlot.set(null);
    this.pendingStartAt.set(null);
    this.notice.set(null);
    this.error.set(null);
    this.saving.set(false);
    this.openedFromSlot.set(false);
    this.walkInAvailabilityByProf.set({});
    this.walkInLoading.set(false);

    const today = this.clinicClock.todayDateString();
    const apptDate = appointment.startAt.slice(0, 10);
    const effectiveDate = apptDate >= today ? apptDate : today;
    this.date.set(effectiveDate);

    this.triggerAvailability();
  }

  openFromSlot(professionalId: string, slotDate: string, startAt: string): void {
    this.mode.set('create');
    this.originalAppointment.set(null);
    this.initSpecialties();
    this.patient.set(null);
    this.openedFromSlot.set(true);
    this.selectedProfessionalId.set(professionalId);
    this.pendingStartAt.set(startAt);
    this.selectedSlot.set(null);
    this.notice.set(null);
    this.error.set(null);
    this.saving.set(false);
    this.walkInAvailabilityByProf.set({});
    this.walkInLoading.set(false);

    const today = this.clinicClock.todayDateString();
    const effectiveDate = slotDate >= today ? slotDate : today;
    this.date.set(effectiveDate);

    const prof = this.allProfessionals().find((p) => p.id === professionalId);
    if (prof && prof.specialties.length === 1) {
      this.selectedSpecialtyId.set(prof.specialties[0].id);
      this.durationMinutes.set(roundUpToQuarter(prof.specialties[0].defaultDurationMinutes));
      this.triggerAvailability();
    } else {
      this.selectedSpecialtyId.set(null);
      this.slots.set([]);
    }
  }

  updateSlotSelection(professionalId: string, slotDate: string, startAt: string): void {
    this.mode.set('create');
    this.originalAppointment.set(null);
    this.openedFromSlot.set(true);
    this.selectedProfessionalId.set(professionalId);
    this.pendingStartAt.set(startAt);
    this.selectedSlot.set(null);
    this.notice.set(null);
    this.error.set(null);
    this.walkInAvailabilityByProf.set({});
    this.walkInLoading.set(false);

    const today = this.clinicClock.todayDateString();
    const effectiveDate = slotDate >= today ? slotDate : today;
    this.date.set(effectiveDate);

    const prof = this.allProfessionals().find((p) => p.id === professionalId);
    const currentSpecId = this.selectedSpecialtyId();

    if (prof) {
      if (currentSpecId !== null && prof.specialties.some((s) => s.id === currentSpecId)) {
        this.triggerAvailability();
      } else if (prof.specialties.length === 1) {
        this.selectedSpecialtyId.set(prof.specialties[0].id);
        this.durationMinutes.set(roundUpToQuarter(prof.specialties[0].defaultDurationMinutes));
        this.triggerAvailability();
      } else {
        this.selectedSpecialtyId.set(null);
        this.slots.set([]);
      }
    }
  }

  setPatient(patient: Patient | null): void {
    this.patient.set(patient);
  }

  setSpecialtyId(specialtyId: number | null): void {
    this.selectedSpecialtyId.set(specialtyId);
    this.notice.set(null);
    this.error.set(null);

    if (this.mode() === 'create' && specialtyId !== null) {
      const spec = this.allSpecialties().find((s) => s.id === specialtyId);
      if (spec) {
        this.durationMinutes.set(roundUpToQuarter(spec.defaultDurationMinutes));
      }
    }

    if (this.mode() === 'walk-in') {
      this.loadWalkInAvailability(specialtyId);
      return;
    }

    const profsWithSpec = specialtyId !== null
      ? this.allProfessionals().filter((p) =>
          p.specialties.some((s) => s.id === specialtyId)
        )
      : [];

    const currentProfId = this.selectedProfessionalId();
    const currentProfStillValid = profsWithSpec.some((p) => p.id === currentProfId);

    if (!currentProfStillValid) {
      if (profsWithSpec.length === 1) {
        this.selectedProfessionalId.set(profsWithSpec[0].id);
      } else {
        this.selectedProfessionalId.set('');
      }
    }

    this.selectedSlot.set(null);
    this.triggerAvailability();
  }

  setDuration(minutes: number): void {
    const clamped = Math.min(
      MAX_DURATION_MINUTES,
      Math.max(SLOT_STEP_MINUTES, minutes)
    );
    this.durationMinutes.set(clamped);

    const current = this.selectedSlot();
    if (current) {
      const range = rangeFrom(this.slots(), current.startAt, clamped);
      if (range.length === 0) {
        const timeStr = this.clinicTimePipe.transform(current.startAt);
        const durStr = formatDuration(clamped);
        this.selectedSlot.set(null);
        this.notice.set(
          `La cita de ${durStr} no cabe desde las ${timeStr}. Elige otra hora.`
        );
      } else {
        this.notice.set(null);
      }
    }
  }

  private loadWalkInAvailability(specialtyId: number | null): void {
    if (specialtyId === null) {
      this.selectedProfessionalId.set('');
      this.walkInAvailabilityByProf.set({});
      this.walkInLoading.set(false);
      this.notice.set(null);
      return;
    }

    const profs = this.allProfessionals().filter((p) =>
      p.specialties.some((s) => s.id === specialtyId)
    );

    const today = this.clinicClock.todayDateString();
    this.walkInTrigger$.next({ specialtyId, profs, today });
  }

  setProfessionalId(professionalId: string): void {
    this.selectedProfessionalId.set(professionalId);
    if (this.mode() !== 'walk-in') {
      this.selectedSlot.set(null);
      this.notice.set(null);
      this.triggerAvailability();
    }
  }

  setDate(newDate: string): void {
    this.date.set(newDate);
    this.selectedSlot.set(null);
    this.notice.set(null);
    this.triggerAvailability();
  }

  setSelectedSlot(slot: AvailableSlot | null): void {
    this.selectedSlot.set(slot);
    this.notice.set(null);
  }

  setSelectedStart(startAt: string | null): void {
    if (!startAt) {
      this.selectedSlot.set(null);
    } else {
      const match = this.slots().find((s) => s.startAt === startAt) || null;
      this.selectedSlot.set(match);
    }
    this.notice.set(null);
  }

  reloadSlots(): void {
    if (this.mode() === 'walk-in') {
      this.loadWalkInAvailability(this.selectedSpecialtyId());
    } else {
      this.triggerAvailability();
    }
  }

  nextDay(): void {
    const current = this.date() || this.clinicClock.todayDateString();
    const next = this.clinicClock.addDays(current, 1);
    this.setDate(next);
  }

  private triggerAvailability(): void {
    const profId = this.selectedProfessionalId();
    const specId = this.selectedSpecialtyId();
    const d = this.date();

    if (profId && specId !== null && d) {
      this.availabilityTrigger$.next({
        professionalId: profId,
        specialtyId: specId,
        date: d,
      });
    } else {
      this.slots.set([]);
      this.slotsLoading.set(false);
      this.slotsError.set(null);
    }
  }

  submit(reason?: string): Observable<Appointment> {
    if (!this.canSubmit()) {
      return throwError(() => new Error('Formulario incompleto'));
    }

    this.saving.set(true);
    this.error.set(null);

    let request$: Observable<Appointment>;

    if (this.mode() === 'walk-in') {
      const body: WalkInAppointmentRequest = {
        patientId: this.patient()!.id,
        professionalId: this.selectedProfessionalId(),
        specialtyId: this.selectedSpecialtyId()!,
      };
      request$ = this.appointmentsApi.walkIn(body);
    } else if (this.mode() === 'reschedule') {
      const orig = this.originalAppointment()!;
      const slot = this.selectedSlot()!;
      const body: RescheduleAppointmentRequest = {
        startAt: slot.startAt,
        endAt: this.selectedRange().at(-1)!.endAt,
      };
      if (this.selectedProfessionalId() !== orig.professionalId) {
        body.professionalId = this.selectedProfessionalId();
      }
      if (this.selectedSpecialtyId() !== orig.specialtyId) {
        body.specialtyId = this.selectedSpecialtyId()!;
      }
      request$ = this.appointmentsApi.reschedule(orig.id, body);
    } else {
      const slot = this.selectedSlot()!;
      const body: CreateAppointmentRequest = {
        patientId: this.patient()!.id,
        professionalId: this.selectedProfessionalId(),
        specialtyId: this.selectedSpecialtyId()!,
        startAt: slot.startAt,
        endAt: this.selectedRange().at(-1)!.endAt,
      };
      const trimmed = reason?.trim();
      if (trimmed) {
        body.reason = trimmed;
      }
      request$ = this.appointmentsApi.create(body);
    }

    return request$.pipe(
      map((appt) => {
        this.saving.set(false);
        return appt;
      }),
      catchError((err: ApiError) => {
        this.saving.set(false);
        let message = err.message;
        if (err.status === 403) {
          message = 'No tienes permiso para esta acción.';
        } else if (err.status === 0) {
          message = 'No se pudo conectar con el servidor.';
        }
        this.error.set(message);

        if (err.status === 409) {
          this.reloadSlots();
        }
        return throwError(() => err);
      })
    );
  }
}
