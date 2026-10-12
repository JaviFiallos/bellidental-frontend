import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import {
  ClinicalRecord,
  CreateHistoryEntryRequest,
  HistoryEntry,
  MedicalHistoryCondition,
  UpdateClinicalRecordRequest,
} from '../models/clinical-record.models';
import { ClinicalRecordsApi } from './clinical-records.api';
import { EncounterStore } from './encounter.store';

export type MedicationStatus = 'idle' | 'saving' | 'saved' | 'error';

@Injectable()
export class HistoryPanelStore {
  private readonly clinicalRecordsApi = inject(ClinicalRecordsApi);
  private readonly encounterStore = inject(EncounterStore);

  // Sheet open state
  readonly isOpen = signal<boolean>(false);

  // Conditions catalog state
  readonly conditions = signal<MedicalHistoryCondition[]>([]);
  readonly conditionsLoading = signal<boolean>(false);
  readonly conditionsError = signal<string | null>(null);

  // Panel-level errors & status
  readonly generalError = signal<string | null>(null);
  readonly noKnownHistoryError = signal<string | null>(null);

  // Condition row errors: conditionId -> error message
  readonly rowErrors = signal<Record<number, string | null>>({});

  // Pending mutation tracking (conditionId being submitted)
  readonly pendingConditionId = signal<number | null>(null);
  readonly lastRegisteredEntry = signal<HistoryEntry | null>(null);

  // Medication save status & message
  readonly medicationStatus = signal<MedicationStatus>('idle');
  readonly medicationError = signal<string | null>(null);


  // Readonly state inherited from encounterStore
  readonly isReadOnly = computed<boolean>(() => this.encounterStore.isReadOnly());

  // Patient and clinical record shortcuts from EncounterStore
  readonly clinicalRecord = computed<ClinicalRecord | null>(() => this.encounterStore.clinicalRecord());
  readonly patient = computed(() => this.encounterStore.patient());

  // Active history entries
  readonly activeEntries = computed<HistoryEntry[]>(() => {
    const entries = this.clinicalRecord()?.historyEntries || [];
    return entries.filter((e) => e.active);
  });

  // Current medication value
  readonly currentMedication = computed<string>(() => {
    return this.clinicalRecord()?.currentMedication || '';
  });

  // No known history state
  readonly noKnownHistory = computed<boolean>(() => {
    return !!this.clinicalRecord()?.noKnownHistory;
  });

  open(): void {
    this.isOpen.set(true);
    this.generalError.set(null);
    this.noKnownHistoryError.set(null);
    this.rowErrors.set({});
    this.medicationStatus.set('idle');
    this.medicationError.set(null);
    this.loadConditionsIfNeeded();
  }

  close(): void {
    this.isOpen.set(false);
  }

  loadConditionsIfNeeded(): void {
    if (this.conditions().length > 0 && !this.conditionsError()) {
      return;
    }
    this.conditionsLoading.set(true);
    this.conditionsError.set(null);

    this.clinicalRecordsApi.listConditions().subscribe({
      next: (data) => {
        const sorted = [...data].sort((a, b) => a.displayOrder - b.displayOrder);
        this.conditions.set(sorted);
        this.conditionsLoading.set(false);
      },
      error: (err: ApiError) => {
        this.conditionsError.set(err?.message || 'Error al cargar las condiciones');
        this.conditionsLoading.set(false);
      },
    });
  }

  addEntry(conditionId: number, request: CreateHistoryEntryRequest): Observable<HistoryEntry> {
    const record = this.clinicalRecord();
    if (!record) {
      return throwError(() => ({ message: 'No hay historia clínica cargada' }));
    }

    this.setRowError(conditionId, null);
    this.pendingConditionId.set(conditionId);

    return this.clinicalRecordsApi.addEntry(record.id, request).pipe(
      tap((newEntry) => {
        this.pendingConditionId.set(null);
        this.lastRegisteredEntry.set(newEntry);
        // Actualizar EncounterStore.clinicalRecord
        this.encounterStore.clinicalRecord.update((curr) => {
          if (!curr) return curr;
          const updatedEntries = [...curr.historyEntries, newEntry];
          return {
            ...curr,
            noKnownHistory: false,
            historyEntries: updatedEntries,
          };
        });
      }),
      catchError((err: ApiError) => {
        this.pendingConditionId.set(null);
        const msg = err?.message || 'Error al registrar antecedente';
        this.setRowError(conditionId, msg);
        return throwError(() => err);
      })
    );
  }


  voidEntry(conditionId: number, entryId: string): Observable<void> {
    this.setRowError(conditionId, null);

    return this.clinicalRecordsApi.voidEntry(entryId).pipe(
      tap(() => {
        // Quitar la entrada de EncounterStore.clinicalRecord
        this.encounterStore.clinicalRecord.update((curr) => {
          if (!curr) return curr;
          const updatedEntries = curr.historyEntries.map((e) =>
            e.id === entryId ? { ...e, active: false } : e
          );
          return {
            ...curr,
            historyEntries: updatedEntries,
          };
        });
      }),
      catchError((err: ApiError) => {
        const msg = err?.message || 'Error al anular antecedente';
        this.setRowError(conditionId, msg);
        return throwError(() => err);
      })
    );
  }

  updateMedication(medication: string): Observable<ClinicalRecord> {
    const record = this.clinicalRecord();
    if (!record) {
      return throwError(() => ({ message: 'No hay historia clínica cargada' }));
    }

    const trimmed = medication.trim();
    const currentVal = (record.currentMedication || '').trim();

    // Si no cambió, no llamamos al backend
    if (trimmed === currentVal) {
      return of(record);
    }

    const valueToSend = trimmed.length > 0 ? trimmed : null;

    this.medicationStatus.set('saving');
    this.medicationError.set(null);

    return this.clinicalRecordsApi
      .update(record.id, { currentMedication: valueToSend })
      .pipe(
        tap((updatedRecord) => {
          this.encounterStore.clinicalRecord.set(updatedRecord);
          this.medicationStatus.set('saved');
        }),
        catchError((err: ApiError) => {
          const msg = err?.message || 'Error al guardar la medicación';
          this.medicationStatus.set('error');
          this.medicationError.set(msg);
          return throwError(() => err);
        })
      );
  }

  setNoKnownHistory(value: boolean): Observable<ClinicalRecord> {
    const record = this.clinicalRecord();
    if (!record) {
      return throwError(() => ({ message: 'No hay historia clínica cargada' }));
    }

    this.noKnownHistoryError.set(null);

    return this.clinicalRecordsApi
      .update(record.id, { noKnownHistory: value })
      .pipe(
        tap((updatedRecord) => {
          this.encounterStore.clinicalRecord.set(updatedRecord);
        }),
        catchError((err: ApiError) => {
          const msg = err?.message || 'Error al actualizar antecedentes';
          this.noKnownHistoryError.set(msg);
          // Si el backend responde 409, recargar la historia clínica completa del paciente
          if (err?.status === 409 && this.patient()) {
            this.clinicalRecordsApi
              .getByPatient(this.patient()!.id)
              .subscribe({
                next: (rec) => this.encounterStore.clinicalRecord.set(rec),
                error: (reloadErr: ApiError) => {
                  this.generalError.set(reloadErr?.message || 'Error al recargar la historia clínica');
                },
              });
          }
          return throwError(() => err);
        })
      );
  }


  setRowError(conditionId: number, message: string | null): void {
    this.rowErrors.update((prev) => ({
      ...prev,
      [conditionId]: message,
    }));
  }
}
