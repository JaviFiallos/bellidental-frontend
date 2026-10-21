import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { ClinicalSummary } from '../models/clinical-summary.models';

@Injectable({
  providedIn: 'root',
})
export class ClinicalSummaryApi {
  private readonly api = inject(ApiClient);

  get(patientId: string): Observable<ClinicalSummary> {
    return this.api.get<ClinicalSummary>(`/api/v1/patients/${patientId}/clinical-summary`);
  }
}
