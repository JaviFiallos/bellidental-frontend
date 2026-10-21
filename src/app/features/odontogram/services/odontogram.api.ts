import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { ApiClient } from '../../../core/api/api-client';
import { CreateFindingRequest, Finding, OdontogramCatalog, PatientOdontogram } from '../models/odontogram.models';

@Injectable({
  providedIn: 'root',
})
export class OdontogramApi {
  private readonly api = inject(ApiClient);
  private catalog$?: Observable<OdontogramCatalog>;

  catalog(): Observable<OdontogramCatalog> {
    if (!this.catalog$) {
      this.catalog$ = this.api.get<OdontogramCatalog>('/api/v1/odontogram/catalog').pipe(
        catchError((err) => {
          this.catalog$ = undefined;
          return throwError(() => err);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.catalog$;
  }

  getByPatient(patientId: string): Observable<PatientOdontogram> {
    return this.api.get<PatientOdontogram>(`/api/v1/patients/${patientId}/odontogram`);
  }

  createFinding(encounterId: string, req: CreateFindingRequest): Observable<Finding> {
    return this.api.post<Finding>(`/api/v1/encounters/${encounterId}/findings`, req);
  }

  encounterFindings(encounterId: string): Observable<Finding[]> {
    return this.api.get<Finding[]>(`/api/v1/encounters/${encounterId}/findings`);
  }

  voidFinding(findingId: string): Observable<void> {
    return this.api.post<void>(`/api/v1/findings/${findingId}/void`, {});
  }
}

