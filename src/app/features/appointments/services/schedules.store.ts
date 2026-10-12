import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, from, Subject } from 'rxjs';
import { catchError, concatMap, switchMap } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import { ClinicClock } from '../../../core/services/clinic-clock.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Professional, ProfessionalsApi } from '../../professionals';
import { EffectiveDay, Schedule, ScheduleRequest } from '../models/schedule.models';
import { SchedulesApi } from './schedules.api';

export interface ShiftEditorState {
  weekday: number;
  /** null cuando se está añadiendo un turno nuevo */
  ruleId: number | null;
  startTime: string;
  endTime: string;
}

export interface ShiftValue {
  startTime: string;
  endTime: string;
}

export type ExceptionKind = 'closed' | 'special';

export interface ExceptionDraft {
  date: string;
  kind: ExceptionKind;
  /** Solo para 'special'; con 'closed' va vacío. */
  shifts: ShiftValue[];
}

/** Reglas de una misma fecha (excepción), para mostrarlas agrupadas. */
export interface ExceptionGroup {
  date: string;
  rules: Schedule[];
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Primer y último día de un mes `YYYY-MM`. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

/** Mes `YYYY-MM` desplazado `delta` meses. */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7);
}

function byStartTime(a: Schedule, b: Schedule): number {
  return (a.startTime ?? '').localeCompare(b.startTime ?? '');
}

interface RulesRequest {
  professionalId: string;
  /** Las recargas silenciosas no vacían la lista ni cierran los formularios abiertos. */
  silent: boolean;
}

interface CalendarRequest {
  month: string;
  silent: boolean;
}

@Injectable()
export class SchedulesStore {
  private readonly professionalsApi = inject(ProfessionalsApi);
  private readonly schedulesApi = inject(SchedulesApi);
  private readonly notificationService = inject(NotificationService);
  private readonly clock = inject(ClinicClock);
  private readonly destroyRef = inject(DestroyRef);

  /** Hoy en America/Guayaquil (YYYY-MM-DD). */
  readonly today = this.clock.todayDateString();

  readonly professionals = signal<Professional[]>([]);
  readonly professionalsLoading = signal<boolean>(false);
  readonly professionalsError = signal<string | null>(null);

  readonly selectedProfessionalId = signal<string | null>(null);
  readonly selectedProfessional = computed<Professional | null>(
    () => this.professionals().find((p) => p.id === this.selectedProfessionalId()) ?? null
  );

  /** Todas las reglas activas del profesional: semana tipo y excepciones. */
  readonly rules = signal<Schedule[]>([]);
  readonly rulesLoading = signal<boolean>(false);
  readonly rulesError = signal<string | null>(null);

  readonly weeklyRules = computed<Schedule[]>(() =>
    this.rules().filter((rule) => rule.weekday !== null)
  );

  readonly exceptionGroups = computed<ExceptionGroup[]>(() => {
    const byDate = new Map<string, Schedule[]>();
    for (const rule of this.rules()) {
      if (rule.specificDate === null || rule.specificDate < this.today) continue;
      byDate.set(rule.specificDate, [...(byDate.get(rule.specificDate) ?? []), rule]);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, rules]) => ({ date, rules: [...rules].sort(byStartTime) }));
  });

  /** Fechas (de cualquier mes) con al menos una excepción. */
  readonly exceptionDates = computed<string[]>(() => [
    ...new Set(
      this.rules()
        .map((rule) => rule.specificDate)
        .filter((date): date is string => date !== null)
    ),
  ]);

  readonly editor = signal<ShiftEditorState | null>(null);
  readonly editorError = signal<string | null>(null);
  readonly saving = signal<boolean>(false);
  readonly deactivatingId = signal<number | null>(null);

  readonly exceptionFormOpen = signal<boolean>(false);
  readonly exceptionError = signal<string | null>(null);
  readonly exceptionSaving = signal<boolean>(false);
  readonly removingDate = signal<string | null>(null);

  readonly visibleMonth = signal<string>(this.today.slice(0, 7));
  readonly effectiveDays = signal<EffectiveDay[]>([]);
  readonly calendarLoading = signal<boolean>(false);
  readonly calendarError = signal<string | null>(null);

  private readonly rulesRequest$ = new Subject<RulesRequest>();
  private readonly calendarRequest$ = new Subject<CalendarRequest>();

  constructor() {
    // switchMap: solo cuenta la última respuesta, la del profesional elegido último
    this.rulesRequest$
      .pipe(
        switchMap((request) => {
          if (!request.silent) {
            this.rules.set([]);
            this.editor.set(null);
            this.editorError.set(null);
            this.exceptionFormOpen.set(false);
            this.exceptionError.set(null);
            this.rulesError.set(null);
            this.rulesLoading.set(true);
          }

          return this.schedulesApi.list(request.professionalId).pipe(
            catchError((err: ApiError) => {
              this.rulesError.set(err.message);
              this.rulesLoading.set(false);
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((rules) => {
        this.rules.set(rules);
        this.rulesLoading.set(false);
      });

    // switchMap: el calendario siempre corresponde al mes visible y al profesional elegido
    this.calendarRequest$
      .pipe(
        switchMap((request) => {
          const professionalId = this.selectedProfessionalId();
          if (!professionalId) return EMPTY;

          if (!request.silent) {
            this.effectiveDays.set([]);
            this.calendarLoading.set(true);
          }
          this.calendarError.set(null);

          const range = monthRange(request.month);
          return this.schedulesApi.getEffective(professionalId, range.from, range.to).pipe(
            catchError((err: ApiError) => {
              this.calendarError.set(err.message);
              this.calendarLoading.set(false);
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((days) => {
        this.effectiveDays.set(days);
        this.calendarLoading.set(false);
      });
  }

  loadProfessionals(requestedId: string | null, requestedMonth: string | null): void {
    if (requestedMonth && MONTH_PATTERN.test(requestedMonth)) {
      this.visibleMonth.set(requestedMonth);
    }
    this.professionalsLoading.set(true);
    this.professionalsError.set(null);

    this.professionalsApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (professionals) => {
          this.professionals.set(professionals);
          this.professionalsLoading.set(false);

          const chosen = professionals.find((p) => p.id === requestedId) ?? professionals[0];
          if (chosen) {
            this.selectProfessional(chosen.id);
          }
        },
        error: (err: ApiError) => {
          this.professionalsError.set(err.message);
          this.professionalsLoading.set(false);
        },
      });
  }

  selectProfessional(professionalId: string): void {
    this.selectedProfessionalId.set(professionalId);
    this.rulesRequest$.next({ professionalId, silent: false });
    this.calendarRequest$.next({ month: this.visibleMonth(), silent: false });
  }

  retryRules(): void {
    const professionalId = this.selectedProfessionalId();
    if (professionalId) {
      this.rulesRequest$.next({ professionalId, silent: false });
    }
  }

  /** Muestra otro mes en el calendario (valor de `?mes=`). */
  changeMonth(month: string): void {
    if (month === this.visibleMonth()) return;
    this.visibleMonth.set(month);
    this.calendarRequest$.next({ month, silent: false });
  }

  retryCalendar(): void {
    this.calendarRequest$.next({ month: this.visibleMonth(), silent: false });
  }

  openCreate(weekday: number): void {
    const hasShifts = this.weeklyRules().some((r) => r.weekday === weekday && r.available);
    const defaults: ShiftValue = hasShifts
      ? { startTime: '14:00', endTime: '20:00' }
      : { startTime: '08:00', endTime: '12:00' };

    this.editorError.set(null);
    this.editor.set({ weekday, ruleId: null, ...defaults });
  }

  openEdit(rule: Schedule): void {
    if (rule.weekday === null || !rule.startTime || !rule.endTime) return;

    this.editorError.set(null);
    this.editor.set({
      weekday: rule.weekday,
      ruleId: rule.id,
      startTime: rule.startTime,
      endTime: rule.endTime,
    });
  }

  closeEditor(): void {
    this.editor.set(null);
    this.editorError.set(null);
  }

  saveShift(value: ShiftValue): void {
    const editor = this.editor();
    const professionalId = this.selectedProfessionalId();
    if (!editor || !professionalId || this.saving()) return;

    const body: ScheduleRequest = {
      weekday: editor.weekday,
      specificDate: null,
      startTime: value.startTime,
      endTime: value.endTime,
      available: true,
    };
    const ruleId = editor.ruleId;
    const isNew = ruleId === null;

    this.saving.set(true);
    this.editorError.set(null);

    const request$ =
      ruleId === null
        ? this.schedulesApi.create(professionalId, body)
        : this.schedulesApi.update(ruleId, body);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.editor.set(null);

        // Si el profesional cambió mientras se guardaba, la respuesta no pertenece a la lista visible
        if (this.selectedProfessionalId() === professionalId) {
          this.rules.update((rules) =>
            isNew
              ? [...rules, saved]
              : rules.map((rule) => (rule.id === saved.id ? saved : rule))
          );
          this.reloadCalendar();
        }
        this.notificationService.success(isNew ? 'Turno añadido' : 'Turno actualizado');
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.editorError.set(err.message);
      },
    });
  }

  deactivate(rule: Schedule): void {
    if (this.deactivatingId() !== null) return;

    this.deactivatingId.set(rule.id);

    this.schedulesApi
      .deactivate(rule.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deactivatingId.set(null);
          this.rules.update((rules) => rules.filter((r) => r.id !== rule.id));
          this.reloadCalendar();
          this.notificationService.success(
            rule.available ? 'Turno desactivado' : 'Regla desactivada'
          );
        },
        error: (err: ApiError) => {
          this.deactivatingId.set(null);
          this.notificationService.error(err.message);
        },
      });
  }

  openExceptionForm(): void {
    this.exceptionError.set(null);
    this.exceptionFormOpen.set(true);
  }

  closeExceptionForm(): void {
    this.exceptionFormOpen.set(false);
    this.exceptionError.set(null);
  }

  /** Crea la excepción: un POST por turno, en orden. Si uno falla, se detiene y no deshace los anteriores. */
  saveException(draft: ExceptionDraft): void {
    const professionalId = this.selectedProfessionalId();
    if (!professionalId || this.exceptionSaving()) return;

    const bodies: ScheduleRequest[] =
      draft.kind === 'closed'
        ? [{ weekday: null, specificDate: draft.date, startTime: null, endTime: null, available: false }]
        : draft.shifts.map((shift) => ({
            weekday: null,
            specificDate: draft.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            available: true,
          }));

    this.exceptionSaving.set(true);
    this.exceptionError.set(null);

    from(bodies)
      .pipe(
        concatMap((body) => this.schedulesApi.create(professionalId, body)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        complete: () => {
          this.exceptionSaving.set(false);
          this.exceptionFormOpen.set(false);
          this.refreshAfterChange(professionalId);
          this.notificationService.success('Excepción registrada');
        },
        error: (err: ApiError) => {
          this.exceptionSaving.set(false);
          this.exceptionError.set(err.message);
          this.refreshAfterChange(professionalId);
        },
      });
  }

  /** Quita una excepción: desactiva cada una de sus reglas. */
  removeException(group: ExceptionGroup): void {
    if (this.removingDate() !== null) return;

    const professionalId = this.selectedProfessionalId();
    this.removingDate.set(group.date);

    from(group.rules)
      .pipe(
        concatMap((rule) => this.schedulesApi.deactivate(rule.id)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        complete: () => {
          this.removingDate.set(null);
          if (professionalId) this.refreshAfterChange(professionalId);
          this.notificationService.success('Excepción quitada');
        },
        error: (err: ApiError) => {
          this.removingDate.set(null);
          if (professionalId) this.refreshAfterChange(professionalId);
          this.notificationService.error(err.message);
        },
      });
  }

  private refreshAfterChange(professionalId: string): void {
    if (this.selectedProfessionalId() !== professionalId) return;
    this.rulesRequest$.next({ professionalId, silent: true });
    this.reloadCalendar();
  }

  private reloadCalendar(): void {
    this.calendarRequest$.next({ month: this.visibleMonth(), silent: true });
  }
}
