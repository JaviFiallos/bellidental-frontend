import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import { NotificationService } from '../../../core/services/notification.service';
import { Professional, ProfessionalsApi } from '../../professionals';
import { Schedule, ScheduleRequest } from '../models/schedule.models';
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

@Injectable()
export class SchedulesStore {
  private readonly professionalsApi = inject(ProfessionalsApi);
  private readonly schedulesApi = inject(SchedulesApi);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly professionals = signal<Professional[]>([]);
  readonly professionalsLoading = signal<boolean>(false);
  readonly professionalsError = signal<string | null>(null);

  readonly selectedProfessionalId = signal<string | null>(null);
  readonly selectedProfessional = computed<Professional | null>(
    () => this.professionals().find((p) => p.id === this.selectedProfessionalId()) ?? null
  );

  readonly rules = signal<Schedule[]>([]);
  readonly rulesLoading = signal<boolean>(false);
  readonly rulesError = signal<string | null>(null);

  readonly editor = signal<ShiftEditorState | null>(null);
  readonly editorError = signal<string | null>(null);
  readonly saving = signal<boolean>(false);
  readonly deactivatingId = signal<number | null>(null);

  private readonly rulesTrigger$ = new Subject<string>();

  constructor() {
    // switchMap: solo cuenta la última respuesta, la del profesional elegido último
    this.rulesTrigger$
      .pipe(
        switchMap((professionalId) => {
          this.rules.set([]);
          this.editor.set(null);
          this.editorError.set(null);
          this.rulesLoading.set(true);
          this.rulesError.set(null);

          return this.schedulesApi.list(professionalId).pipe(
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
  }

  loadProfessionals(requestedId: string | null): void {
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
    this.rulesTrigger$.next(professionalId);
  }

  retryRules(): void {
    const professionalId = this.selectedProfessionalId();
    if (professionalId) {
      this.rulesTrigger$.next(professionalId);
    }
  }

  openCreate(weekday: number): void {
    const hasShifts = this.rules().some((r) => r.weekday === weekday && r.available);
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
}
