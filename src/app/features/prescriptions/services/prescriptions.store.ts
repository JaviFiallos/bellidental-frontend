import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, Subscription, throwError } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
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
import {
  closePdfWindow,
  DocumentLink,
  isLinkExpired,
  openBlankPdfWindow,
  showPdfUrlInWindow,
} from '../../../shared/utils/pdf-window';

const SEARCH_DEBOUNCE_MS = 250;

function errorMessageOf(err: ApiError | Error, fallback: string): string {
  return 'message' in err && err.message ? err.message : fallback;
}

/** Ítem de una receta guardada, en el formato del editor. Los ítems cargados desde el servidor no traen presets. */
function toDraftItems(prescription: Prescription): DraftItem[] {
  return prescription.items.map((item) => ({
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
  }));
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
  /** Receta anulada cuya posología se copia en el editor abierto por "Anular y rehacer". */
  readonly copiedFrom = signal<Prescription | null>(null);

  /** Receta con una acción en curso (emitir, imprimir, anular): deshabilita sus botones. */
  readonly busyPrescriptionId = signal<string | null>(null);
  /** Error de una acción fuera del editor (imprimir, emitir tras cerrar el editor, anular). */
  readonly actionError = signal<string | null>(null);
  /** Enlace listo pero sin pestaña (bloqueada): la fila ofrece "Abrir PDF" como enlace en un clic directo. */
  readonly pendingPdf = signal<{ prescriptionId: string; link: DocumentLink } | null>(null);

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
    this.copiedFrom.set(null);
    this.items.set(toDraftItems(prescription));
    this.editingItemIndex.set(null);
    this.saveError.set(null);
    this.editorOpen.set(true);
  }

  /** "Anular y rehacer": un borrador nuevo con el diagnóstico, los ítems y las indicaciones de la anulada. */
  openRedo(prescription: Prescription): void {
    this.editing.set(null);
    this.copiedFrom.set(prescription);
    this.items.set(toDraftItems(prescription));
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
    this.copiedFrom.set(null);
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

  /** Guarda el borrador (POST si es nueva, PUT si ya es un borrador) y cierra el editor. */
  save(encounterDiagnosisId: string, generalInstructions: string): Observable<Prescription> {
    return this.persist(encounterDiagnosisId, generalInstructions).pipe(
      tap(() => this.closeEditor())
    );
  }

  /**
   * Editor: guarda el borrador, lo emite y abre el PDF. La pestaña se abre aquí, en el clic del usuario;
   * si el guardado falla, queda en el editor con el mensaje.
   */
  saveAndEmit(encounterDiagnosisId: string, generalInstructions: string): Observable<Prescription> {
    const target = openBlankPdfWindow();
    return this.persist(encounterDiagnosisId, generalInstructions).pipe(
      catchError((err: ApiError | Error) => {
        closePdfWindow(target);
        return throwError(() => err);
      }),
      switchMap((saved) => this.emitAndPrint(saved, target, true))
    );
  }

  /** Fila de un borrador: lo emite y abre el PDF. */
  emit(prescription: Prescription): Observable<Prescription> {
    return this.emitAndPrint(prescription, openBlankPdfWindow(), false);
  }

  /** Fila de una receta emitida: vuelve a pedir el PDF y lo abre. */
  print(prescription: Prescription): Observable<void> {
    this.busyPrescriptionId.set(prescription.id);
    this.actionError.set(null);
    return this.openPdf(prescription.id, openBlankPdfWindow()).pipe(
      finalize(() => this.busyPrescriptionId.set(null))
    );
  }

  /**
   * "Abrir PDF" tras un bloqueo: es un enlace, así que el navegador lo abre en el clic. Si el enlace ya venció,
   * se cancela el clic, se pide uno nuevo y se avisa para volver a pulsar.
   */
  openPendingPdf(event: Event): void {
    const pending = this.pendingPdf();
    if (!pending || !isLinkExpired(pending.link)) return;

    event.preventDefault();
    this.actionError.set(null);
    this.api.pdfLink(pending.prescriptionId).subscribe({
      next: (link) => {
        this.pendingPdf.set({ prescriptionId: pending.prescriptionId, link });
        this.actionError.set('El enlace venció; vuelve a pulsar Abrir PDF.');
      },
      error: (err: ApiError | Error) => {
        this.actionError.set(errorMessageOf(err, 'No se pudo renovar el enlace del PDF'));
      },
    });
  }

  /** Anula un borrador o una receta emitida (sin motivo). La lista de la atención deja de mostrarla. */
  voidPrescription(prescription: Prescription): Observable<Prescription> {
    this.busyPrescriptionId.set(prescription.id);
    this.actionError.set(null);
    return this.api.void(prescription.id).pipe(
      tap(() => {
        this.prescriptions.update((list) => list.filter((current) => current.id !== prescription.id));
        if (this.pendingPdf()?.prescriptionId === prescription.id) this.pendingPdf.set(null);
      }),
      catchError((err: ApiError | Error) => {
        this.actionError.set(errorMessageOf(err, 'No se pudo anular la receta'));
        return throwError(() => err);
      }),
      finalize(() => this.busyPrescriptionId.set(null))
    );
  }

  /** "Anular y rehacer": anula la emitida y abre el editor con sus datos. No hay petición de guardado todavía. */
  voidAndRedo(prescription: Prescription): Observable<Prescription> {
    return this.voidPrescription(prescription).pipe(
      tap(() => this.openRedo(prescription))
    );
  }

  /** POST si la receta es nueva, PUT si se edita un borrador. Deja la receta guardada como la del editor. */
  private persist(encounterDiagnosisId: string, generalInstructions: string): Observable<Prescription> {
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
          this.replacePrescription(saved, !editing);
          this.editing.set(saved);
          this.saving.set(false);
        },
        error: (err: ApiError | Error) => {
          this.saving.set(false);
          this.saveError.set(errorMessageOf(err, 'Error al guardar la receta'));
        },
      })
    );
  }

  /**
   * Emite y abre el PDF. Desde el editor, un error de emisión deja el editor abierto con el mensaje;
   * cualquier error posterior se muestra en la lista.
   */
  private emitAndPrint(prescription: Prescription, target: Window | null, fromEditor: boolean): Observable<Prescription> {
    this.busyPrescriptionId.set(prescription.id);
    this.actionError.set(null);
    return this.api.issue(prescription.id).pipe(
      tap((issued) => {
        this.replacePrescription(issued, false);
        if (fromEditor) this.closeEditor();
      }),
      catchError((err: ApiError | Error) => this.failAndCloseWindow(err, target, fromEditor)),
      switchMap((issued) => this.openPdf(issued.id, target).pipe(map(() => issued))),
      finalize(() => {
        this.busyPrescriptionId.set(null);
        this.saving.set(false);
      })
    );
  }

  private openPdf(prescriptionId: string, target: Window | null): Observable<void> {
    return this.api.pdfLink(prescriptionId).pipe(
      tap((link) => {
        if (target) {
          showPdfUrlInWindow(target, link.url);
          this.pendingPdf.set(null);
        } else {
          this.pendingPdf.set({ prescriptionId, link });
        }
      }),
      map(() => undefined),
      catchError((err: ApiError | Error) => this.failAndCloseWindow(err, target, false))
    );
  }

  private failAndCloseWindow(err: ApiError | Error, target: Window | null, inEditor: boolean): Observable<never> {
    closePdfWindow(target);
    const message = errorMessageOf(err, 'No se pudo completar la acción con la receta');
    if (inEditor) {
      this.saveError.set(message);
    } else {
      this.actionError.set(message);
    }
    return throwError(() => err);
  }

  /** Reemplaza la receta en la lista (o la agrega si es nueva). */
  private replacePrescription(saved: Prescription, isNew: boolean): void {
    this.prescriptions.update((list) =>
      isNew
        ? [...list, saved]
        : list.map((prescription) => (prescription.id === saved.id ? saved : prescription))
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
