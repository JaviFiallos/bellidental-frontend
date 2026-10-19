import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, Subscription, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import {
  DraftItem,
  Medication,
  formatMedicationLabel,
  Prescription,
  PrescriptionItemRequest,
  PrescriptionRequest,
} from '../models/prescription.models';
import { MedicationsApi } from './medications.api';
import { PrescriptionsApi } from './prescriptions.api';

const SEARCH_DEBOUNCE_MS = 250;

function errorMessageOf(err: ApiError | Error, fallback: string): string {
  return 'message' in err && err.message ? err.message : fallback;
}

/** Ítem del editor a petición: lo que llega vacío se omite (el backend lo copia del preset o lo rechaza). */
function toItemRequest(item: DraftItem): PrescriptionItemRequest {
  const request: PrescriptionItemRequest = { medicationId: item.medication.id };
  if (item.presetId !== null) request.medicationPresetId = item.presetId;
  const dose = item.dose.trim();
  const frequency = item.frequency.trim();
  const duration = item.duration.trim();
  const quantity = item.quantity.trim();
  const instructions = item.instructions.trim();
  if (dose) request.dose = dose;
  if (frequency) request.frequency = frequency;
  if (duration) request.duration = duration;
  if (quantity) request.quantity = quantity;
  if (instructions) request.instructions = instructions;
  return request;
}

/** Provisto por la página de la atención: la lista de recetas, el editor abierto y sus ítems. */
@Injectable()
export class PrescriptionsStore implements OnDestroy {
  private readonly api = inject(PrescriptionsApi);
  private readonly medicationsApi = inject(MedicationsApi);
  private encounterId: string | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private searchSubscription: Subscription | null = null;

  readonly prescriptions = signal<Prescription[]>([]);
  readonly loading = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);

  readonly editorOpen = signal<boolean>(false);
  readonly editing = signal<Prescription | null>(null);
  readonly items = signal<DraftItem[]>([]);
  readonly editingItemIndex = signal<number | null>(null);
  readonly editingItem = computed<DraftItem | null>(() => {
    const index = this.editingItemIndex();
    return index === null ? null : (this.items()[index] ?? null);
  });
  readonly saving = signal<boolean>(false);
  readonly saveError = signal<string | null>(null);

  readonly medicationResults = signal<Medication[]>([]);
  readonly medicationSearching = signal<boolean>(false);
  readonly medicationSearchError = signal<string | null>(null);

  load(encounterId: string): void {
    this.encounterId = encounterId;
    this.loading.set(true);
    this.loadError.set(null);

    this.api.listByEncounter(encounterId).subscribe({
      next: (prescriptions) => {
        this.prescriptions.set(prescriptions);
        this.loading.set(false);
      },
      error: (err: ApiError | Error) => {
        this.loadError.set(errorMessageOf(err, 'Error al cargar las recetas'));
        this.loading.set(false);
      },
    });
  }

  reload(): void {
    if (this.encounterId) {
      this.load(this.encounterId);
    }
  }

  openNew(): void {
    this.editing.set(null);
    this.items.set([]);
    this.editingItemIndex.set(null);
    this.saveError.set(null);
    this.editorOpen.set(true);
  }

  openEdit(prescription: Prescription): void {
    this.editing.set(prescription);
    this.items.set(
      prescription.items.map((item) => ({
        medication: {
          id: item.medicationId,
          label: formatMedicationLabel({
            name: item.medicationName,
            concentration: item.concentration,
            presentation: item.presentation,
          }),
          presets: [],
        },
        presetId: item.medicationPresetId,
        dose: item.dose ?? '',
        frequency: item.frequency ?? '',
        duration: item.duration ?? '',
        quantity: item.quantity ?? '',
        instructions: item.instructions ?? '',
      }))
    );
    this.editingItemIndex.set(null);
    this.saveError.set(null);
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.cancelSearch();
    this.medicationResults.set([]);
    this.medicationSearchError.set(null);
    this.editorOpen.set(false);
    this.editing.set(null);
    this.items.set([]);
    this.editingItemIndex.set(null);
    this.saveError.set(null);
  }

  /** Búsqueda desde 1 carácter, con debounce; cada texto nuevo cancela la búsqueda anterior. */
  searchMedications(query: string): void {
    this.cancelSearch();
    this.medicationSearchError.set(null);

    const text = query.trim();
    if (text.length < 1) {
      this.medicationResults.set([]);
      return;
    }

    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      this.medicationSearching.set(true);
      this.searchSubscription = this.medicationsApi.search(text).subscribe({
        next: (medications) => {
          this.medicationResults.set(medications);
          this.medicationSearching.set(false);
          this.searchSubscription = null;
        },
        error: (err: ApiError | Error) => {
          this.medicationResults.set([]);
          this.medicationSearchError.set(errorMessageOf(err, 'Error al buscar medicamentos'));
          this.medicationSearching.set(false);
          this.searchSubscription = null;
        },
      });
    }, SEARCH_DEBOUNCE_MS);
  }

  /** Agrega el ítem, o reemplaza el que se estaba editando. Sin petición: se guarda con el borrador. */
  upsertItem(item: DraftItem): void {
    const index = this.editingItemIndex();
    if (index === null) {
      this.items.update((items) => [...items, item]);
    } else {
      this.items.update((items) => items.map((current, i) => (i === index ? item : current)));
    }
    this.editingItemIndex.set(null);
  }

  editItem(index: number): void {
    this.editingItemIndex.set(index);
  }

  cancelItemEdit(): void {
    this.editingItemIndex.set(null);
  }

  removeItem(index: number): void {
    this.items.update((items) => items.filter((_, i) => i !== index));
    this.editingItemIndex.set(null);
  }

  /** POST si la receta es nueva, PUT si se edita un borrador. */
  save(encounterDiagnosisId: string, generalInstructions: string): Observable<Prescription> {
    const encounterId = this.encounterId;
    const editing = this.editing();
    if (!editing && !encounterId) {
      const message = 'No hay una atención activa para registrar recetas';
      this.saveError.set(message);
      return throwError(() => new Error(message));
    }

    const request: PrescriptionRequest = {
      encounterDiagnosisId,
      items: this.items().map(toItemRequest),
    };
    const instructions = generalInstructions.trim();
    if (instructions) request.generalInstructions = instructions;

    this.saving.set(true);
    this.saveError.set(null);

    const call = editing
      ? this.api.update(editing.id, request)
      : this.api.create(encounterId!, request);

    return call.pipe(
      tap({
        next: (saved) => {
          this.prescriptions.update((list) =>
            editing
              ? list.map((prescription) => (prescription.id === saved.id ? saved : prescription))
              : [...list, saved]
          );
          this.saving.set(false);
          this.closeEditor();
        },
        error: (err: ApiError | Error) => {
          this.saving.set(false);
          this.saveError.set(errorMessageOf(err, 'Error al guardar la receta'));
        },
      })
    );
  }

  ngOnDestroy(): void {
    this.cancelSearch();
  }

  private cancelSearch(): void {
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
    this.searchSubscription?.unsubscribe();
    this.searchSubscription = null;
    this.medicationSearching.set(false);
  }
}
