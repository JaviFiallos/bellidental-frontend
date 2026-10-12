import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiError } from '../../../core/api/api.models';
import {
  DentalIndices,
  Finding,
  OdontogramCatalog,
  PatientOdontogram,
} from '../models/odontogram.models';
import { OdontogramApi } from './odontogram.api';

@Injectable()
export class OdontogramStore {
  private readonly api = inject(OdontogramApi);

  readonly catalog = signal<OdontogramCatalog | null>(null);
  readonly odontogram = signal<PatientOdontogram | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly lastPatientId = signal<string | null>(null);

  readonly findings = computed<Finding[]>(() => {
    return this.odontogram()?.findings ?? [];
  });

  readonly indices = computed<DentalIndices | null>(() => {
    return this.odontogram()?.indices ?? null;
  });

  load(patientId: string): void {
    this.lastPatientId.set(patientId);
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      catalog: this.api.catalog(),
      odontogram: this.api.getByPatient(patientId),
    }).subscribe({
      next: ({ catalog, odontogram }) => {
        this.catalog.set(catalog);
        this.odontogram.set(odontogram);
        this.loading.set(false);
      },
      error: (err: ApiError | Error) => {
        const message = 'message' in err && err.message ? err.message : 'Error al cargar el odontograma';
        this.error.set(message);
        this.loading.set(false);
      },
    });
  }

  reload(): void {
    const patientId = this.lastPatientId();
    if (patientId) {
      this.load(patientId);
    }
  }
}
