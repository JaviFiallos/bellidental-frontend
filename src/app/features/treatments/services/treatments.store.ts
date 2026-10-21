import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import {
  PerformedTreatment,
  RecordTreatmentRequest,
  Treatment,
} from '../models/treatment.models';
import { TreatmentsApi } from './treatments.api';

function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function errorMessageOf(err: ApiError | Error, fallback: string): string {
  return 'message' in err && err.message ? err.message : fallback;
}

/** Provisto por la página de la atención: el estado vive mientras la atención está abierta. */
@Injectable()
export class TreatmentsStore {
  private readonly api = inject(TreatmentsApi);
  private encounterId: string | null = null;

  readonly items = signal<PerformedTreatment[]>([]);
  readonly loading = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);

  readonly catalog = signal<Treatment[]>([]);
  readonly catalogLoading = signal<boolean>(false);
  readonly catalogError = signal<string | null>(null);
  readonly query = signal<string>('');

  readonly selectedTreatment = signal<Treatment | null>(null);
  readonly selectedTooth = signal<number | null>(null);
  readonly selectedFindingId = signal<string | null>(null);

  readonly saving = signal<boolean>(false);
  readonly saveError = signal<string | null>(null);
  readonly voiding = signal<boolean>(false);
  readonly actionError = signal<string | null>(null);

  readonly results = computed<Treatment[]>(() => {
    const query = normalizeText(this.query().trim());
    const all = this.catalog();
    if (!query) return all;
    return all.filter(
      (treatment) =>
        normalizeText(treatment.code).startsWith(query) ||
        normalizeText(treatment.name).includes(query)
    );
  });

  readonly sessionTotal = computed<number>(() => {
    const sum = this.items().reduce((acc, item) => acc + item.total, 0);
    return Math.round(sum * 100) / 100;
  });

  load(encounterId: string): void {
    this.encounterId = encounterId;
    this.loading.set(true);
    this.loadError.set(null);

    this.api.listByEncounter(encounterId).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (err: ApiError | Error) => {
        this.loadError.set(errorMessageOf(err, 'Error al cargar los tratamientos'));
        this.loading.set(false);
      },
    });
  }

  reload(): void {
    if (this.encounterId) {
      this.load(this.encounterId);
    }
  }

  /** Pide el catálogo una sola vez por sesión (al primer foco del buscador). */
  ensureCatalog(): void {
    if (this.catalog().length > 0 || this.catalogLoading()) return;

    this.catalogLoading.set(true);
    this.catalogError.set(null);

    this.api.catalog().subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        this.catalogLoading.set(false);
      },
      error: (err: ApiError | Error) => {
        this.catalogError.set(errorMessageOf(err, 'Error al cargar el catálogo de tratamientos'));
        this.catalogLoading.set(false);
      },
    });
  }

  setQuery(text: string): void {
    this.query.set(text);
  }

  pickTreatment(treatment: Treatment): void {
    this.saveError.set(null);
    this.query.set('');
    this.selectedTreatment.set(treatment);
  }

  clearSelection(): void {
    this.selectedTreatment.set(null);
    this.selectedFindingId.set(null);
    this.saveError.set(null);
  }

  selectFinding(findingId: string | null): void {
    this.saveError.set(null);
    this.selectedFindingId.set(findingId);
  }

  selectTooth(toothCode: number): void {
    this.selectedTooth.set(toothCode);
  }

  record(request: RecordTreatmentRequest): Observable<PerformedTreatment> {
    const encounterId = this.encounterId;
    if (!encounterId) {
      const message = 'No hay una atención activa para registrar tratamientos';
      this.saveError.set(message);
      return throwError(() => new Error(message));
    }

    this.saving.set(true);
    this.saveError.set(null);

    return this.api.record(encounterId, request).pipe(
      tap({
        next: (created) => {
          this.items.update((items) => [...items, created]);
          this.saving.set(false);
          this.selectedTreatment.set(null);
          this.selectedFindingId.set(null);
        },
        error: (err: ApiError | Error) => {
          this.saving.set(false);
          this.saveError.set(errorMessageOf(err, 'Error al registrar el tratamiento'));
        },
      })
    );
  }

  void(performed: PerformedTreatment, voidReason: string): Observable<string> {
    this.voiding.set(true);
    this.actionError.set(null);

    return this.api.void(performed.id, { voidReason }).pipe(
      tap({
        next: () => {
          this.items.update((items) => items.filter((item) => item.id !== performed.id));
          this.voiding.set(false);
        },
        error: (err: ApiError | Error) => {
          this.voiding.set(false);
          this.actionError.set(errorMessageOf(err, 'Error al anular el tratamiento'));
        },
      })
    );
  }
}
