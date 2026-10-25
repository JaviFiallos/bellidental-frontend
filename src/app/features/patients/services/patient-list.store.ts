import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import { PatientListFilters, PatientListItem } from '../models/patient.models';
import { PatientsApi } from './patients.api';

@Injectable()
export class PatientListStore {
  private readonly patientsApi = inject(PatientsApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly requests$ = new Subject<PatientListFilters>();
  private lastFilters: PatientListFilters | null = null;

  readonly items = signal<PatientListItem[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly page = signal<number>(0);
  readonly totalPages = signal<number>(0);
  readonly totalElements = signal<number>(0);
  readonly size = 20;

  constructor() {
    this.requests$
      .pipe(
        switchMap((filters) => {
          this.loading.set(true);
          this.error.set(null);

          return this.patientsApi.list(filters).pipe(
            tap({
              next: (page) => {
                this.items.set(page.content);
                this.page.set(page.number);
                this.totalPages.set(page.totalPages);
                this.totalElements.set(page.totalElements);
                this.loading.set(false);
              },
              error: (err: ApiError) => {
                this.loading.set(false);
                let message: string;
                if (err.status === 403) {
                  message = 'No tienes permiso';
                } else if (err.status === 0) {
                  message = 'No se pudo conectar con el servidor';
                } else {
                  message = err.message || 'Error al cargar la lista de pacientes';
                }
                this.error.set(message);
              },
            }),
            catchError(() => EMPTY)
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  load(filters: PatientListFilters): void {
    this.lastFilters = filters;
    this.requests$.next(filters);
  }

  retry(): void {
    if (this.lastFilters) {
      this.load(this.lastFilters);
    }
  }
}
