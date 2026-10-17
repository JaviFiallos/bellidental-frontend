import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, Subject } from 'rxjs';
import { catchError, debounceTime, switchMap } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import { Patient } from '../models/patient.models';
import { PatientsApi } from './patients.api';

/**
 * Normaliza el término de búsqueda de pacientes.
 * Si parece cédula o documento con formato (por ejemplo 171003406-5 o 17 1003 4065),
 * limpia los caracteres separadores habituales (-, ., espacio) antes de enviarlo a la API.
 * Si es texto alfabético regular (nombres/apellidos), se envía tal cual con trim.
 */
export function normalizePatientSearchQuery(term: string): string {
  const trimmed = term.trim();
  if (!trimmed) {
    return '';
  }

  // Término numérico con separadores (ej: 171003406-5, 17 1003 4065, 09.123.456-7)
  if (/^[\d\s\-.]+$/.test(trimmed) && /\d/.test(trimmed)) {
    return trimmed.replace(/[-\s.]/g, '');
  }

  // Documento alfanumérico con formato (ej: P-1234567, PAS 987654)
  if (/^[A-Za-z]{1,4}[-\s.]+\d+$/i.test(trimmed)) {
    return trimmed.replace(/[-\s.]/g, '');
  }

  return trimmed;
}

@Injectable()
export class PatientSearchStore {
  private readonly patientsApi = inject(PatientsApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly query$ = new Subject<string>();

  readonly query = signal<string>('');
  readonly results = signal<Patient[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.query$
      .pipe(
        debounceTime(250),
        switchMap((term) => {
          if (!term || term.length < 2) {
            this.results.set([]);
            this.isLoading.set(false);
            this.errorMessage.set(null);
            return of(null);
          }

          this.isLoading.set(true);
          this.errorMessage.set(null);

          return this.patientsApi.search(term, 0, 8).pipe(
            catchError((err: ApiError) => {
              this.errorMessage.set(err.message);
              this.results.set([]);
              this.isLoading.set(false);
              return of(null);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((page) => {
        if (page) {
          this.results.set(page.content);
          this.isLoading.set(false);
          this.errorMessage.set(null);
        }
      });
  }

  setQuery(text: string): void {
    this.query.set(text);
    const normalized = normalizePatientSearchQuery(text);
    if (normalized.length < 2) {
      this.results.set([]);
      this.isLoading.set(false);
      this.errorMessage.set(null);
    }
    this.query$.next(normalized);
  }

  clear(): void {
    this.query.set('');
    this.results.set([]);
    this.isLoading.set(false);
    this.errorMessage.set(null);
  }
}
