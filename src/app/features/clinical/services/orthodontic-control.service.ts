import { computed, inject, Injectable, Injector, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { defer, EMPTY, Observable, of, throwError } from 'rxjs';
import { catchError, filter, finalize, map, switchMap, take } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import { Treatment, TreatmentsStore } from '../../treatments';
import { EncounterStore } from './encounter.store';
import { Icd10Api } from './icd10.api';

const CONTROL_CHIEF_COMPLAINT = 'Control de ortodoncia (cambio de ligas)';
const CONTROL_DIAGNOSIS_CODE = 'Z46.4';
const CONTROL_TREATMENT_CODE = 'D8670';
const FALLBACK_ERROR = 'Error al registrar el control de ortodoncia';
const MISSING_DIAGNOSIS_MESSAGE = 'No se encontró el diagnóstico Z46.4 en el catálogo CIE-10';
const MISSING_TREATMENT_MESSAGE =
  'Falta el tratamiento "Control de ortodoncia" (D8670) en el catálogo; pídele al director que lo active';

/** `REGISTERED`: el control se registró ahora. `ALREADY_REGISTERED`: ya estaba, no se creó nada. */
export type OrthodonticControlOutcome = 'REGISTERED' | 'ALREADY_REGISTERED';

/**
 * Control de ortodoncia (cambio de ligas) en un clic: motivo, diagnóstico Z46.4 y tratamiento D8670.
 * Provisto en la página de la atención; cada paso se salta si ya está hecho, así un nuevo clic retoma.
 */
@Injectable()
export class OrthodonticControlService {
  private readonly encounterStore = inject(EncounterStore);
  private readonly icd10Api = inject(Icd10Api);
  private readonly treatmentsStore = inject(TreatmentsStore);
  private readonly injector = inject(Injector);

  readonly working = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  /** Emite el resultado al terminar; los errores no se propagan: quedan en `error` para la sección. */
  apply(): Observable<OrthodonticControlOutcome> {
    return defer(() => {
      this.working.set(true);
      this.error.set(null);
      this.ensureChiefComplaint();
      return this.ensureDiagnosis().pipe(
        switchMap((diagnosisId) => this.ensureControlTreatment(diagnosisId))
      );
    }).pipe(
      catchError((err: ApiError | Error | null) => {
        this.error.set(err?.message || FALLBACK_ERROR);
        return EMPTY;
      }),
      finalize(() => this.working.set(false))
    );
  }

  private ensureChiefComplaint(): void {
    if (this.encounterStore.chiefComplaint().trim()) return;
    this.encounterStore.setChiefComplaint(CONTROL_CHIEF_COMPLAINT);
    this.encounterStore.flushSave();
  }

  private ensureDiagnosis(): Observable<string> {
    const active = this.encounterStore
      .activeDiagnoses()
      .find((diagnosis) => diagnosis.code === CONTROL_DIAGNOSIS_CODE);
    if (active) return of(active.id);

    return this.icd10Api.search(CONTROL_DIAGNOSIS_CODE).pipe(
      map((codes) => codes.find((code) => code.code === CONTROL_DIAGNOSIS_CODE)),
      switchMap((code) => {
        if (!code) return throwError(() => new Error(MISSING_DIAGNOSIS_MESSAGE));
        return this.encounterStore.addDiagnosis({ icd10Id: code.id, certainty: 'DEFINITIVE' });
      }),
      map((diagnosis) => {
        if (!diagnosis) throw new Error('No se pudo registrar el diagnóstico Z46.4');
        return diagnosis.id;
      })
    );
  }

  private ensureControlTreatment(diagnosisId: string): Observable<OrthodonticControlOutcome> {
    const alreadyRegistered = this.treatmentsStore
      .items()
      .some((item) => item.treatmentCode === CONTROL_TREATMENT_CODE);
    if (alreadyRegistered) return of('ALREADY_REGISTERED');

    return this.loadCatalog().pipe(
      switchMap((treatments) => {
        const treatment = treatments.find((item) => item.code === CONTROL_TREATMENT_CODE);
        if (!treatment) return throwError(() => new Error(MISSING_TREATMENT_MESSAGE));
        return this.treatmentsStore.record({
          treatmentId: treatment.id,
          quantity: 1,
          price: treatment.basePrice,
          encounterDiagnosisId: diagnosisId,
        });
      }),
      map((): OrthodonticControlOutcome => 'REGISTERED')
    );
  }

  /** Pide el catálogo si falta y espera a que termine (o falle). TreatmentsStore solo expone signals. */
  private loadCatalog(): Observable<Treatment[]> {
    this.treatmentsStore.ensureCatalog();
    const catalogState = computed(() => ({
      treatments: this.treatmentsStore.catalog(),
      loading: this.treatmentsStore.catalogLoading(),
      error: this.treatmentsStore.catalogError(),
    }));

    return toObservable(catalogState, { injector: this.injector }).pipe(
      filter((state) => !state.loading),
      take(1),
      map((state) => {
        if (state.error) throw new Error(state.error);
        return state.treatments;
      })
    );
  }
}
