import { computed, DestroyRef, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ApiError } from '../../../core/api/api.models';
import { NotificationService } from '../../../core/services/notification.service';
import { filterMedications } from '../domain/medication-display';
import {
  Medication,
  MedicationPreset,
  MedicationPresetRequest,
  MedicationRequest,
} from '../models/prescription.models';
import { MedicationsApi } from './medications.api';

export type MedicationPanel = 'medication' | 'presets';

/**
 * Estado del catálogo de medicamentos y posologías para administración.
 * Provisto a nivel de página (no singleton).
 */
@Injectable()
export class MedicationCatalogStore {
  private readonly medicationsApi = inject(MedicationsApi);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly medications = signal<Medication[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly query = signal<string>('');
  readonly showInactive = signal<boolean>(true);
  readonly visibleMedications = computed(() =>
    filterMedications(this.medications(), this.query(), this.showInactive())
  );

  readonly activePanel = signal<MedicationPanel | null>(null);
  readonly selectedMedication = signal<Medication | null>(null);
  readonly selectedPreset = signal<MedicationPreset | null>(null);
  readonly presetFormOpen = signal<boolean>(false);
  readonly panelSession = signal<number>(0);

  readonly saving = signal<boolean>(false);
  readonly saveError = signal<string | null>(null);
  readonly busyMedicationId = signal<number | null>(null);
  readonly busyPresetId = signal<number | null>(null);

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.medicationsApi
      .listManage()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (medications) => {
          this.medications.set(medications);
          this.loading.set(false);
        },
        error: (err: ApiError) => {
          this.loading.set(false);
          this.error.set(err?.message || 'No se pudo cargar el catálogo de medicamentos');
        },
      });
  }

  setQuery(value: string): void {
    this.query.set(value);
  }

  setShowInactive(value: boolean): void {
    this.showInactive.set(value);
  }

  openNewMedication(): void {
    this.openPanel('medication');
  }

  openEditMedication(medication: Medication): void {
    this.openPanel('medication');
    this.selectedMedication.set(medication);
  }

  openPresets(medication: Medication): void {
    this.openPanel('presets');
    this.selectedMedication.set(medication);
    this.presetFormOpen.set(false);
    this.selectedPreset.set(null);
  }

  openNewPreset(): void {
    this.presetFormOpen.set(true);
    this.selectedPreset.set(null);
    this.saveError.set(null);
  }

  openEditPreset(preset: MedicationPreset): void {
    this.presetFormOpen.set(true);
    this.selectedPreset.set(preset);
    this.saveError.set(null);
  }

  closePresetForm(): void {
    this.presetFormOpen.set(false);
    this.selectedPreset.set(null);
    this.saveError.set(null);
  }

  closePanel(): void {
    this.saveError.set(null);
    this.activePanel.set(null);
    this.selectedMedication.set(null);
    this.selectedPreset.set(null);
    this.presetFormOpen.set(false);
  }

  saveMedication(request: MedicationRequest): void {
    if (this.saving()) {
      return;
    }
    const selected = this.selectedMedication();
    const save$ = selected
      ? this.medicationsApi.updateMedication(selected.id, request)
      : this.medicationsApi.createMedication(request);

    this.startSaving();

    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.finishSaving();
        this.closePanel();
        this.notifications.success(
          selected ? 'Medicamento actualizado' : 'Medicamento creado'
        );
        this.reloadMedications();
      },
      error: (err: ApiError) => this.failSaving(err, 'No se pudo guardar el medicamento'),
    });
  }

  savePreset(request: MedicationPresetRequest): void {
    if (this.saving()) {
      return;
    }
    const medication = this.selectedMedication();
    if (!medication) {
      return;
    }
    const selected = this.selectedPreset();
    const save$ = selected
      ? this.medicationsApi.updatePreset(selected.id, request)
      : this.medicationsApi.createPreset(medication.id, request);

    this.startSaving();

    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.finishSaving();
        this.closePresetForm();
        this.notifications.success('Posología guardada');
        this.reloadMedications();
      },
      error: (err: ApiError) => this.failSaving(err, 'No se pudo guardar la posología'),
    });
  }

  deactivateMedication(medication: Medication): void {
    this.runRowAction(
      this.busyMedicationId,
      medication.id,
      () => this.medicationsApi.deactivateMedication(medication.id),
      'Medicamento desactivado',
      () => this.reloadMedications()
    );
  }

  activateMedication(medication: Medication): void {
    this.runRowAction(
      this.busyMedicationId,
      medication.id,
      () => this.medicationsApi.activateMedication(medication.id),
      'Medicamento activado',
      () => this.reloadMedications()
    );
  }

  deactivatePreset(preset: MedicationPreset): void {
    this.runRowAction(
      this.busyPresetId,
      preset.id,
      () => this.medicationsApi.deactivatePreset(preset.id),
      'Posología desactivada',
      () => this.reloadMedications()
    );
  }

  activatePreset(preset: MedicationPreset): void {
    this.runRowAction(
      this.busyPresetId,
      preset.id,
      () => this.medicationsApi.activatePreset(preset.id),
      'Posología activada',
      () => this.reloadMedications()
    );
  }

  private openPanel(panel: MedicationPanel): void {
    this.saveError.set(null);
    this.selectedMedication.set(null);
    this.selectedPreset.set(null);
    this.presetFormOpen.set(false);
    this.activePanel.set(panel);
    this.panelSession.update((session) => session + 1);
  }

  private reloadMedications(): void {
    this.medicationsApi
      .listManage()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (medications) => {
          this.medications.set(medications);
          const currentMed = this.selectedMedication();
          if (currentMed) {
            const updated = medications.find((m) => m.id === currentMed.id);
            if (updated) {
              this.selectedMedication.set(updated);
            }
          }
        },
        error: (err: ApiError) =>
          this.notifications.error(
            err?.message || 'No se pudo actualizar la lista de medicamentos'
          ),
      });
  }

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
