import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { ApiError } from '../../../core/api/api.models';
import {
  CreateFindingRequest,
  DentalIndices,
  Finding,
  OdontogramCatalog,
  PatientOdontogram,
} from '../models/odontogram.models';
import { OdontogramApi } from './odontogram.api';
import { buildFindingDescription } from '../domain/finding-request';

@Injectable()
export class OdontogramStore implements OnDestroy {
  private readonly api = inject(OdontogramApi);
  private actionTimer?: ReturnType<typeof setTimeout>;

  readonly catalog = signal<OdontogramCatalog | null>(null);
  readonly odontogram = signal<PatientOdontogram | null>(null);
  readonly loading = signal<boolean>(false);
  readonly refreshing = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly lastPatientId = signal<string | null>(null);
  readonly encounterId = signal<string | null>(null);
  readonly encounterFindingIds = signal<Set<string>>(new Set());

  readonly saving = signal<boolean>(false);
  readonly actionError = signal<string | null>(null);
  readonly lastAction = signal<string | null>(null);

  readonly findings = computed<Finding[]>(() => {
    return this.odontogram()?.findings ?? [];
  });

  readonly indices = computed<DentalIndices | null>(() => {
    return this.odontogram()?.indices ?? null;
  });

  ngOnDestroy(): void {
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
    }
  }

  load(patientId: string, encounterId?: string | null): void {
    this.lastPatientId.set(patientId);
    this.encounterId.set(encounterId ?? null);

    const isInitial = !this.odontogram();
    if (isInitial) {
      this.loading.set(true);
      this.error.set(null);
    } else {
      this.refreshing.set(true);
    }

    const encId = encounterId ?? null;
    const reqs: {
      catalog: Observable<OdontogramCatalog>;
      odontogram: Observable<PatientOdontogram>;
      encounterFindings?: Observable<Finding[]>;
    } = {
      catalog: this.api.catalog(),
      odontogram: this.api.getByPatient(patientId),
    };

    if (encId) {
      reqs.encounterFindings = this.api.encounterFindings(encId);
    }

    forkJoin(reqs).subscribe({
      next: ({ catalog, odontogram, encounterFindings }) => {
        this.catalog.set(catalog);
        this.odontogram.set(odontogram);
        if (encounterFindings) {
          this.encounterFindingIds.set(new Set(encounterFindings.map((f) => f.id)));
        } else {
          this.encounterFindingIds.set(new Set());
        }
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: (err: ApiError | Error) => {
        const message = 'message' in err && err.message ? err.message : 'Error al cargar el odontograma';
        if (isInitial) {
          this.error.set(message);
        } else {
          this.actionError.set(message);
        }
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });
  }

  reload(): void {
    const patientId = this.lastPatientId();
    const encounterId = this.encounterId();
    if (patientId) {
      this.load(patientId, encounterId);
    }
  }

  register(request: CreateFindingRequest, customDescription?: string): void {
    const encId = this.encounterId();
    if (!encId) {
      this.actionError.set('No hay una atención activa para registrar hallazgos');
      return;
    }

    this.actionError.set(null);
    this.saving.set(true);

    const cond = this.catalog()?.conditions.find((c) => c.id === request.conditionId);
    const actionDesc =
      customDescription ||
      buildFindingDescription(cond, request.toothCode, request.surfaceCode, request.grade);

    this.api.createFinding(encId, request).subscribe({
      next: () => {
        this.saving.set(false);
        this.setLastAction(actionDesc);
        this.reload();
      },
      error: (err: ApiError | Error) => {
        this.saving.set(false);
        const message =
          'message' in err && err.message ? err.message : 'Error al registrar el hallazgo';
        this.actionError.set(message);
      },
    });
  }

  void(finding: Finding): void {
    this.actionError.set(null);
    this.saving.set(true);

    this.api.voidFinding(finding.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.setLastAction('Hallazgo anulado');
        this.reload();
      },
      error: (err: ApiError | Error) => {
        this.saving.set(false);
        const message =
          'message' in err && err.message ? err.message : 'Error al anular el hallazgo';
        this.actionError.set(message);
      },
    });
  }

  clearActionError(): void {
    this.actionError.set(null);
  }

  private setLastAction(action: string): void {
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
    }
    this.lastAction.set(action);
    this.actionTimer = setTimeout(() => {
      this.lastAction.set(null);
    }, 4000);
  }
}
