import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { forkJoin, Observable, of, Subject, Subscription, throwError } from 'rxjs';
import { catchError, debounceTime, map, switchMap, tap } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import { SessionStore } from '../../../core/auth/session.store';
import { Patient, PatientsApi } from '../../patients';
import { ClinicalRecord } from '../models/clinical-record.models';
import {
  AddDiagnosisRequest,
  Diagnosis,
  Encounter,
  UpdateEncounterRequest,
} from '../models/encounter.models';
import { Icd10Code } from '../models/icd10.models';
import {
  EncounterExtraField,
  missing033Sections,
  VitalSignField,
  vitalSignError,
} from '../domain/encounter-completeness';
import { ClinicalRecordsApi } from './clinical-records.api';
import { EncountersApi } from './encounters.api';
import { Icd10Api } from './icd10.api';

export type EditMode = 'editable' | 'completed_editable' | 'voided' | 'other_professional';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

@Injectable()
export class EncounterStore implements OnDestroy {
  private readonly encountersApi = inject(EncountersApi);
  private readonly clinicalRecordsApi = inject(ClinicalRecordsApi);
  private readonly patientsApi = inject(PatientsApi);
  private readonly icd10Api = inject(Icd10Api);
  private readonly sessionStore = inject(SessionStore);

  // Raw state signals
  readonly encounter = signal<Encounter | null>(null);
  readonly patient = signal<Patient | null>(null);
  readonly clinicalRecord = signal<ClinicalRecord | null>(null);

  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly notFound = signal<boolean>(false);

  // Form edit fields
  readonly chiefComplaint = signal<string>('');
  readonly currentIllness = signal<string>('');

  // Auto-save state
  readonly saveStatus = signal<SaveStatus>('idle');
  readonly saveErrorMessage = signal<string | null>(null);

  // Version counter for pending changes
  private changeVersion = 0;
  private savedVersion = 0;

  // Auto-save debouncing
  private readonly debouncedSave$ = new Subject<number>();
  private saveSub?: Subscription;

  // Diagnoses state
  readonly diagnosisError = signal<string | null>(null);

  // CIE-10 search state
  readonly icd10Query = signal<string>('');
  readonly icd10Results = signal<Icd10Code[]>([]);
  readonly icd10Loading = signal<boolean>(false);
  readonly icd10Error = signal<string | null>(null);

  private readonly searchTrigger$ = new Subject<string>();
  private searchSub?: Subscription;

  // Completing state
  readonly completing = signal<boolean>(false);
  readonly completeError = signal<string | null>(null);

  // Computed signals
  readonly editMode = computed<EditMode>(() => {
    const enc = this.encounter();
    if (!enc) return 'other_professional';

    if (enc.voidedAt) {
      return 'voided';
    }

    const currentProfId = this.sessionStore.currentUser()?.professionalId;
    if (!currentProfId || enc.professionalId !== currentProfId) {
      return 'other_professional';
    }

    const canUpdate = this.sessionStore.hasPermission('RECORD_UPDATE');
    if (!canUpdate) {
      return 'other_professional';
    }

    if (enc.status === 'COMPLETED') {
      return 'completed_editable';
    }

    return 'editable';
  });

  readonly isReadOnly = computed<boolean>(() => {
    const mode = this.editMode();
    return mode === 'voided' || mode === 'other_professional';
  });

  readonly isCompleted = computed<boolean>(() => {
    return this.encounter()?.status === 'COMPLETED';
  });

  readonly activeDiagnoses = computed<Diagnosis[]>(() => {
    const diagnoses = this.encounter()?.diagnoses || [];
    return diagnoses.filter((d) => !d.voidedAt);
  });

  readonly missingRequirements = computed<string[]>(() => {
    const missing: string[] = [];
    if (!this.chiefComplaint().trim()) {
      missing.push('Falta el motivo');
    }
    if (this.activeDiagnoses().length === 0) {
      missing.push('Falta 1 diagnóstico');
    }
    return missing;
  });

  readonly missing033 = computed<string[]>(() => {
    const enc = this.encounter();
    return enc ? missing033Sections(enc) : [];
  });

  readonly canComplete = computed<boolean>(() => {
    if (this.isReadOnly()) return false;
    if (this.isCompleted()) return false;
    if (this.missingRequirements().length > 0) return false;
    if (this.saveStatus() === 'saving') return false;
    return true;
  });

  constructor() {
    this.saveSub = this.debouncedSave$
      .pipe(
        debounceTime(800),
        switchMap((versionToSave) => this.executeSave(versionToSave))
      )
      .subscribe();

    this.searchSub = this.searchTrigger$
      .pipe(
        debounceTime(300),
        switchMap((q) => {
          const trimmed = q.trim();
          if (trimmed.length < 2) {
            this.icd10Loading.set(false);
            this.icd10Results.set([]);
            this.icd10Error.set(null);
            return of([] as Icd10Code[]);
          }

          this.icd10Loading.set(true);
          this.icd10Error.set(null);

          return this.icd10Api.search(trimmed).pipe(
            catchError((err: ApiError) => {
              this.icd10Error.set(err?.message || 'Error al buscar en CIE-10');
              this.icd10Loading.set(false);
              return of([] as Icd10Code[]);
            })
          );
        })
      )
      .subscribe((results) => {
        this.icd10Loading.set(false);
        this.icd10Results.set(results || []);
      });
  }

  ngOnDestroy(): void {
    if (this.changeVersion > this.savedVersion) {
      this.flushSave();
    }
    this.saveSub?.unsubscribe();
    this.searchSub?.unsubscribe();
  }

  load(encounterId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.notFound.set(false);

    this.encountersApi
      .get(encounterId)
      .pipe(
        switchMap((encounter) => {
          this.encounter.set(encounter);
          this.chiefComplaint.set(encounter.chiefComplaint || '');
          this.currentIllness.set(encounter.currentIllness || '');

          return forkJoin({
            patient: this.patientsApi.getById(encounter.patientId),
            clinicalRecord: this.clinicalRecordsApi.getByPatient(encounter.patientId),
          }).pipe(
            map(({ patient, clinicalRecord }) => {
              this.patient.set(patient);
              this.clinicalRecord.set(clinicalRecord);
              return encounter;
            })
          );
        }),
        catchError((err: ApiError) => {
          if (err?.status === 404) {
            this.notFound.set(true);
          } else {
            this.error.set(err?.message || 'Error al cargar la atención');
          }
          return of(null);
        })
      )
      .subscribe(() => {
        this.loading.set(false);
      });
  }

  setChiefComplaint(value: string): void {
    if (this.isReadOnly()) return;
    this.chiefComplaint.set(value);
    this.triggerAutoSave();
  }

  setCurrentIllness(value: string): void {
    if (this.isReadOnly()) return;
    this.currentIllness.set(value);
    this.triggerAutoSave();
  }

  /** Un valor fuera de rango no se guarda: el último valor válido se conserva. */
  setVitalSign(field: VitalSignField, value: number | null): void {
    if (this.isReadOnly()) return;
    if (vitalSignError(field, value) !== null) return;
    this.encounter.update((curr) => (curr ? { ...curr, [field]: value } : curr));
    this.triggerAutoSave();
  }

  /** Vacío o solo espacios se guardan como null. */
  setExtraField(field: EncounterExtraField, value: string | null): void {
    if (this.isReadOnly()) return;
    const normalized = value && value.trim() ? value : null;
    this.encounter.update((curr) => (curr ? { ...curr, [field]: normalized } : curr));
    this.triggerAutoSave();
  }

  retrySave(): void {
    this.triggerAutoSave();
  }

  private triggerAutoSave(): void {
    const complaint = this.chiefComplaint().trim();
    if (!complaint) {
      this.saveStatus.set('idle');
      this.saveErrorMessage.set(null);
      return;
    }

    this.changeVersion++;
    this.saveStatus.set('saving');
    this.saveErrorMessage.set(null);
    this.debouncedSave$.next(this.changeVersion);
  }

  private executeSave(versionToSave?: number): Observable<Encounter | null> {
    const targetVersion = versionToSave ?? this.changeVersion;
    const enc = this.encounter();
    if (!enc) return of(null);

    const complaint = this.chiefComplaint().trim();
    if (!complaint) {
      this.saveStatus.set('idle');
      this.saveErrorMessage.set(null);
      return of(null);
    }

    const body: UpdateEncounterRequest = {
      chiefComplaint: complaint,
      currentIllness: this.currentIllness().trim() || null,
      bpSystolic: enc.bpSystolic,
      bpDiastolic: enc.bpDiastolic,
      heartRate: enc.heartRate,
      temperature: enc.temperature,
      respiratoryRate: enc.respiratoryRate,
      stomatognathicExam: enc.stomatognathicExam,
      periodontalDisease: enc.periodontalDisease,
      fluorosis: enc.fluorosis,
      malocclusion: enc.malocclusion,
      diagnosticPlan: enc.diagnosticPlan,
      therapeuticPlan: enc.therapeuticPlan,
      educationalPlan: enc.educationalPlan,
    };

    return this.encountersApi.update(enc.id, body).pipe(
      tap((updated) => {
        const isLatestVersion = targetVersion >= this.changeVersion;
        if (isLatestVersion) {
          this.savedVersion = targetVersion;
          this.saveStatus.set('saved');
          this.saveErrorMessage.set(null);
        }
        this.encounter.update((curr) => {
          if (!curr) return updated;
          // Una respuesta antigua no debe pisar ediciones hechas mientras se guardaba.
          const base = isLatestVersion ? updated : curr;
          return {
            ...base,
            diagnoses: curr.diagnoses ?? updated.diagnoses,
          };
        });
      }),
      catchError((err: ApiError) => {
        this.saveStatus.set('error');
        this.saveErrorMessage.set(err?.message || 'Error al guardar');
        return of(null);
      })
    );
  }

  flushSave(): void {
    if (this.changeVersion > this.savedVersion) {
      this.executeSave().subscribe();
    }
  }

  searchIcd10(query: string): void {
    this.icd10Query.set(query);
    this.searchTrigger$.next(query);
  }

  clearIcd10Search(): void {
    this.icd10Query.set('');
    this.icd10Results.set([]);
    this.icd10Error.set(null);
    this.searchTrigger$.next('');
  }

  addDiagnosis(req: AddDiagnosisRequest): Observable<Diagnosis | null> {
    const enc = this.encounter();
    if (!enc || this.isReadOnly()) return of(null);

    this.diagnosisError.set(null);

    return this.encountersApi.addDiagnosis(enc.id, req).pipe(
      tap((newDiag) => {
        this.encounter.update((curr) => {
          if (!curr) return null;
          const currentDiagnoses = curr.diagnoses ? [...curr.diagnoses] : [];
          return {
            ...curr,
            diagnoses: [...currentDiagnoses, newDiag],
          };
        });
        this.diagnosisError.set(null);
      }),
      catchError((err: ApiError) => {
        this.diagnosisError.set(err?.message || 'Error al agregar diagnóstico');
        return throwError(() => err);
      })
    );
  }

  voidDiagnosis(diagnosisId: string): Observable<string | null> {
    const enc = this.encounter();
    if (!enc || this.isReadOnly()) return of(null);

    return this.encountersApi.voidDiagnosis(diagnosisId).pipe(
      tap(() => {
        this.encounter.update((curr) => {
          if (!curr) return null;
          const currentDiagnoses = curr.diagnoses ? [...curr.diagnoses] : [];
          return {
            ...curr,
            diagnoses: currentDiagnoses.map((d) =>
              d.id === diagnosisId ? { ...d, voidedAt: new Date().toISOString() } : d
            ),
          };
        });
      }),
      catchError((err: ApiError) => {
        const msg = err?.message || 'Error al anular diagnóstico';
        this.diagnosisError.set(msg);
        return throwError(() => err);
      })
    );
  }

  complete(): Observable<Encounter> {
    const enc = this.encounter();
    if (!enc) return throwError(() => new Error('No hay atención cargada'));

    this.completing.set(true);
    this.completeError.set(null);

    // If there are unsaved changes, save first
    const savePromise$: Observable<unknown> =
      this.changeVersion > this.savedVersion ? this.executeSave() : of(null);

    return savePromise$.pipe(
      switchMap(() => {
        if (this.saveStatus() === 'error') {
          this.completing.set(false);
          this.completeError.set(this.saveErrorMessage() || 'No se pudo guardar');
          return throwError(() => new Error(this.saveErrorMessage() || 'Error al guardar'));
        }
        return this.encountersApi.complete(enc.id);
      }),
      tap((completed) => {
        this.completing.set(false);
        this.encounter.set(completed);
      }),
      catchError((err: ApiError) => {
        this.completing.set(false);
        this.completeError.set(err?.message || 'Error al completar la atención');
        return throwError(() => err);
      })
    );
  }
}
