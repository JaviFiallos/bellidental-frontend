import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, Subject } from 'rxjs';
import { catchError, debounceTime, switchMap } from 'rxjs/operators';
import { ApiError } from '../../../core/api/api.models';
import { Patient } from '../models/patient.models';
import { PatientsApi } from './patients.api';

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
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      this.results.set([]);
      this.isLoading.set(false);
      this.errorMessage.set(null);
    }
    this.query$.next(trimmed);
  }

  clear(): void {
    this.query.set('');
    this.results.set([]);
    this.isLoading.set(false);
    this.errorMessage.set(null);
  }
}
