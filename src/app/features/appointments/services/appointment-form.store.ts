import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, of, Subject, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import { ClinicClock } from '../../../core/services/clinic-clock.service';
import { Patient } from '../../patients';
import { Professional, Specialty, SpecialtiesApi } from '../../professionals';
import {
  Appointment,
  AvailableSlot,
  CreateAppointmentRequest,
} from '../models/appointment.models';
import { AppointmentsApi } from './appointments.api';
import { AvailabilityApi } from './availability.api';

@Injectable()
export class AppointmentFormStore {
  private readonly specialtiesApi = inject(SpecialtiesApi);
  private readonly availabilityApi = inject(AvailabilityApi);
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly clinicClock = inject(ClinicClock);
  private readonly destroyRef = inject(DestroyRef);

  // External data
  readonly allProfessionals = signal<Professional[]>([]);
  readonly allSpecialties = signal<Specialty[]>([]);

  // Form state
  readonly patient = signal<Patient | null>(null);
  readonly selectedSpecialtyId = signal<number | null>(null);
  readonly selectedProfessionalId = signal<string>('');
  readonly date = signal<string>('');
  readonly selectedSlot = signal<AvailableSlot | null>(null);

  readonly openedFromSlot = signal<boolean>(false);
  readonly pendingStartAt = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

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

  constructor() {
    this.availabilityTrigger$
      .pipe(
        switchMap(({ professionalId, specialtyId, date }) => {
          this.slotsLoading.set(true);
          this.slotsError.set(null);
          return this.availabilityApi
            .slots(professionalId, specialtyId, date)
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
              this.selectedSlot.set(match);
              this.notice.set(null);
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
              this.selectedSlot.set(match || null);
            }
          }
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
      !!this.selectedProfessionalId() &&
      this.selectedSpecialtyId() !== null &&
      !!this.date()
    );
  });

  readonly canSubmit = computed<boolean>(() => {
    return (
      !!this.patient() &&
      this.selectedSpecialtyId() !== null &&
      !!this.selectedProfessionalId() &&
      !!this.date() &&
      !!this.selectedSlot() &&
      !this.saving()
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

    const today = this.clinicClock.todayDateString();
    const effectiveDate = agendaDate >= today ? agendaDate : today;
    this.date.set(effectiveDate);
  }

  openFromSlot(professionalId: string, slotDate: string, startAt: string): void {
    this.initSpecialties();
    this.patient.set(null);
    this.openedFromSlot.set(true);
    this.selectedProfessionalId.set(professionalId);
    this.pendingStartAt.set(startAt);
    this.selectedSlot.set(null);
    this.notice.set(null);
    this.error.set(null);
    this.saving.set(false);

    const today = this.clinicClock.todayDateString();
    const effectiveDate = slotDate >= today ? slotDate : today;
    this.date.set(effectiveDate);

    // Auto-elegir especialidad si el profesional solo tiene 1
    const prof = this.allProfessionals().find((p) => p.id === professionalId);
    if (prof && prof.specialties.length === 1) {
      this.selectedSpecialtyId.set(prof.specialties[0].id);
      this.triggerAvailability();
    } else {
      this.selectedSpecialtyId.set(null);
      this.slots.set([]);
    }
  }

  updateSlotSelection(professionalId: string, slotDate: string, startAt: string): void {
    this.openedFromSlot.set(true);
    this.selectedProfessionalId.set(professionalId);
    this.pendingStartAt.set(startAt);
    this.selectedSlot.set(null);
    this.notice.set(null);
    this.error.set(null);

    const today = this.clinicClock.todayDateString();
    const effectiveDate = slotDate >= today ? slotDate : today;
    this.date.set(effectiveDate);

    const prof = this.allProfessionals().find((p) => p.id === professionalId);
    const currentSpecId = this.selectedSpecialtyId();

    if (prof) {
      if (currentSpecId !== null && prof.specialties.some((s) => s.id === currentSpecId)) {
        // Mantiene la especialidad actual
        this.triggerAvailability();
      } else if (prof.specialties.length === 1) {
        this.selectedSpecialtyId.set(prof.specialties[0].id);
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

  setProfessionalId(professionalId: string): void {
    this.selectedProfessionalId.set(professionalId);
    this.selectedSlot.set(null);
    this.notice.set(null);
    this.triggerAvailability();
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

  reloadSlots(): void {
    this.triggerAvailability();
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

    const slot = this.selectedSlot()!;
    const body: CreateAppointmentRequest = {
      patientId: this.patient()!.id,
      professionalId: this.selectedProfessionalId(),
      specialtyId: this.selectedSpecialtyId()!,
      startAt: slot.startAt,
    };

    const trimmed = reason?.trim();
    if (trimmed) {
      body.reason = trimmed;
    }

    this.saving.set(true);
    this.error.set(null);

    return this.appointmentsApi.create(body).pipe(
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
          this.selectedSlot.set(null);
          this.reloadSlots();
        }
        return throwError(() => err);
      })
    );
  }
}
