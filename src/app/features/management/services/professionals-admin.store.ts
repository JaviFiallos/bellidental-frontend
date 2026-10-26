import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { ApiError } from '../../../core/api/api.models';
import { NotificationService } from '../../../core/services/notification.service';
import {
  CreateProfessionalRequest,
  ProfessionalDetail,
  ProfessionalsApi,
  SpecialtiesApi,
  Specialty,
  UpdateProfessionalRequest,
} from '../../professionals';

export type ProfessionalPanel = 'create' | 'edit';

@Injectable()
export class ProfessionalsAdminStore {
  private readonly professionalsApi = inject(ProfessionalsApi);
  private readonly specialtiesApi = inject(SpecialtiesApi);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly professionals = signal<ProfessionalDetail[]>([]);
  readonly specialties = signal<Specialty[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly activePanel = signal<ProfessionalPanel | null>(null);
  readonly editingProfessional = signal<ProfessionalDetail | null>(null);
  readonly panelSession = signal<number>(0);
  readonly saving = signal<boolean>(false);
  readonly saveError = signal<string | null>(null);

  /** Orden por nombre */
  readonly sortedProfessionals = computed(() =>
    [...this.professionals()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
  );

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      professionals: this.professionalsApi.listAll(),
      specialties: this.specialtiesApi.list(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ professionals, specialties }) => {
          this.professionals.set(professionals);
          this.specialties.set(specialties);
          this.loading.set(false);
        },
        error: (err: ApiError) => {
          this.loading.set(false);
          this.error.set(err?.message || 'No se pudo cargar la lista de profesionales');
        },
      });
  }

  openCreate(): void {
    this.activePanel.set('create');
    this.editingProfessional.set(null);
    this.saveError.set(null);
    this.panelSession.update((s) => s + 1);
  }

  openEdit(prof: ProfessionalDetail): void {
    this.activePanel.set('edit');
    this.editingProfessional.set(prof);
    this.saveError.set(null);
    this.panelSession.update((s) => s + 1);
  }

  closePanel(): void {
    this.activePanel.set(null);
    this.editingProfessional.set(null);
    this.saveError.set(null);
  }

  saveCreate(req: CreateProfessionalRequest): void {
    this.saving.set(true);
    this.saveError.set(null);

    this.professionalsApi
      .create(req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notifications.success('Profesional registrado');
          this.closePanel();
          this.load();
        },
        error: (err: ApiError) => {
          this.saving.set(false);
          this.saveError.set(err?.message || 'No se pudo registrar el profesional');
        },
      });
  }

  saveEdit(id: string, req: UpdateProfessionalRequest): void {
    this.saving.set(true);
    this.saveError.set(null);

    this.professionalsApi
      .update(id, req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notifications.success('Profesional actualizado');
          this.closePanel();
          this.load();
        },
        error: (err: ApiError) => {
          this.saving.set(false);
          this.saveError.set(err?.message || 'No se pudo actualizar el profesional');
        },
      });
  }
}
