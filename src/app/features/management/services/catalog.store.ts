import { computed, DestroyRef, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable } from 'rxjs';
import { ApiError } from '../../../core/api/api.models';
import { NotificationService } from '../../../core/services/notification.service';
import { filterTreatments, specialtyNamesById } from '../domain/catalog-display';
import {
  CatalogSpecialty,
  CatalogTreatment,
  SpecialtyRequest,
  TreatmentFormResult,
} from '../models/catalog.models';
import { CatalogApi } from './catalog.api';

/** Pestaña visible de la pantalla Catálogo. */
export type CatalogTab = 'treatments' | 'specialties';

/** Panel lateral de la pantalla Catálogo: solo uno abierto a la vez. */
export type CatalogPanel = 'treatment' | 'specialty';

/** Estado de la pantalla Catálogo. Se provee en la página (no es singleton). */
@Injectable()
export class CatalogStore {
  private readonly catalogApi = inject(CatalogApi);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly treatments = signal<CatalogTreatment[]>([]);
  readonly specialties = signal<CatalogSpecialty[]>([]);
  readonly specialtyNames = computed(() => specialtyNamesById(this.specialties()));
  readonly activeSpecialties = computed(() => this.specialties().filter((specialty) => specialty.active));
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly tab = signal<CatalogTab>('treatments');
  readonly query = signal<string>('');
  readonly showInactive = signal<boolean>(true);
  readonly visibleTreatments = computed(() =>
    filterTreatments(this.treatments(), this.query(), this.showInactive())
  );

  readonly activePanel = signal<CatalogPanel | null>(null);
  readonly selectedTreatment = signal<CatalogTreatment | null>(null);
  readonly selectedSpecialty = signal<CatalogSpecialty | null>(null);
  /** Cambia en cada apertura de panel: el formulario se crea de nuevo aunque se abra la misma fila. */
  readonly panelSession = signal<number>(0);
  readonly saving = signal<boolean>(false);
  readonly saveError = signal<string | null>(null);
  readonly busyTreatmentId = signal<number | null>(null);
  readonly busySpecialtyId = signal<number | null>(null);

  /** Carga tratamientos y especialidades a la vez. */
  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      treatments: this.catalogApi.listTreatments(),
      specialties: this.catalogApi.listSpecialties(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ treatments, specialties }) => {
          this.treatments.set(treatments);
          this.specialties.set(specialties);
          this.loading.set(false);
        },
        error: (err: ApiError) => {
          this.loading.set(false);
          this.error.set(err?.message || 'No se pudo cargar el catálogo');
        },
      });
  }

  selectTab(tab: CatalogTab): void {
    if (tab === this.tab()) {
      return;
    }
    this.closePanel();
    this.tab.set(tab);
  }

  setQuery(value: string): void {
    this.query.set(value);
  }

  setShowInactive(value: boolean): void {
    this.showInactive.set(value);
  }

  openNewTreatment(): void {
    this.openPanel('treatment');
  }

  openEditTreatment(treatment: CatalogTreatment): void {
    this.openPanel('treatment');
    this.selectedTreatment.set(treatment);
  }

  openNewSpecialty(): void {
    this.openPanel('specialty');
  }

  openEditSpecialty(specialty: CatalogSpecialty): void {
    this.openPanel('specialty');
    this.selectedSpecialty.set(specialty);
  }

  closePanel(): void {
    this.saveError.set(null);
    this.activePanel.set(null);
    this.selectedTreatment.set(null);
    this.selectedSpecialty.set(null);
  }

  saveTreatment(result: TreatmentFormResult): void {
    const selected = this.selectedTreatment();
    if (this.saving()) {
      return;
    }
    const save$ =
      result.kind === 'create'
        ? this.catalogApi.createTreatment(result.request)
        : selected
          ? this.catalogApi.updateTreatment(selected.id, result.request)
          : null;
    if (!save$) {
      return;
    }
    this.startSaving();

    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.finishSaving();
        this.closePanel();
        this.notifications.success(
          result.kind === 'create' ? 'Tratamiento creado' : 'Tratamiento actualizado'
        );
        this.reloadTreatments();
      },
      error: (err: ApiError) => this.failSaving(err, 'No se pudo guardar el tratamiento'),
    });
  }

  saveSpecialty(request: SpecialtyRequest): void {
    if (this.saving()) {
      return;
    }
    const selected = this.selectedSpecialty();
    const save$ = selected
      ? this.catalogApi.updateSpecialty(selected.id, request)
      : this.catalogApi.createSpecialty(request);
    this.startSaving();

    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.finishSaving();
        this.closePanel();
        this.notifications.success(selected ? 'Especialidad actualizada' : 'Especialidad creada');
        this.reloadSpecialties();
      },
      error: (err: ApiError) => this.failSaving(err, 'No se pudo guardar la especialidad'),
    });
  }

  deactivateTreatment(treatment: CatalogTreatment): void {
    this.runTreatmentAction(
      treatment.id,
      () => this.catalogApi.deactivateTreatment(treatment.id),
      'Tratamiento desactivado'
    );
  }

  activateTreatment(treatment: CatalogTreatment): void {
    this.runTreatmentAction(
      treatment.id,
      () => this.catalogApi.activateTreatment(treatment.id),
      'Tratamiento activado'
    );
  }

  deactivateSpecialty(specialty: CatalogSpecialty): void {
    this.runRowAction(
      this.busySpecialtyId,
      specialty.id,
      () => this.catalogApi.deactivateSpecialty(specialty.id),
      'Especialidad desactivada',
      () => this.reloadSpecialties()
    );
  }

  activateSpecialty(specialty: CatalogSpecialty): void {
    this.runRowAction(
      this.busySpecialtyId,
      specialty.id,
      () => this.catalogApi.activateSpecialty(specialty.id),
      'Especialidad activada',
      () => this.reloadSpecialties()
    );
  }

  /** Abre un panel y limpia la selección anterior; quien llama fija luego la fila elegida. */
  private openPanel(panel: CatalogPanel): void {
    this.saveError.set(null);
    this.selectedTreatment.set(null);
    this.selectedSpecialty.set(null);
    this.activePanel.set(panel);
    this.panelSession.update((session) => session + 1);
  }

  private reloadTreatments(): void {
    this.catalogApi
      .listTreatments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (treatments) => this.treatments.set(treatments),
        error: (err: ApiError) =>
          this.notifications.error(err?.message || 'No se pudo actualizar la lista de tratamientos'),
      });
  }

  private reloadSpecialties(): void {
    this.catalogApi
      .listSpecialties()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (specialties) => this.specialties.set(specialties),
        error: (err: ApiError) =>
          this.notifications.error(err?.message || 'No se pudo actualizar la lista de especialidades'),
      });
  }

  private runTreatmentAction(
    treatmentId: number,
    request: () => Observable<CatalogTreatment>,
    successMessage: string
  ): void {
    this.runRowAction(this.busyTreatmentId, treatmentId, request, successMessage, () =>
      this.reloadTreatments()
    );
  }

  /** Una acción por fila a la vez: marca la fila como ocupada, avisa con toast y recarga al terminar. */
  private runRowAction(
    busyId: WritableSignal<number | null>,
    id: number,
    request: () => Observable<unknown>,
    successMessage: string,
    reload: () => void
  ): void {
    if (busyId() !== null) {
      return;
    }
    busyId.set(id);

    request()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          busyId.set(null);
          this.notifications.success(successMessage);
          reload();
        },
        error: (err: ApiError) => {
          busyId.set(null);
          this.notifications.error(err?.message || 'No se pudo cambiar el estado');
        },
      });
  }

  private startSaving(): void {
    this.saving.set(true);
    this.saveError.set(null);
  }

  private finishSaving(): void {
    this.saving.set(false);
  }

  private failSaving(err: ApiError, fallback: string): void {
    this.saving.set(false);
    this.saveError.set(err?.message || fallback);
  }
}
