import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { ClinicalRecord } from '../models/clinical-record.models';

@Injectable({
  providedIn: 'root',
})
export class ClinicalRecordsApi {
  private readonly api = inject(ApiClient);

  getByPatient(patientId: string): Observable<ClinicalRecord> {
    return this.api.get<ClinicalRecord>(`/api/v1/patients/${patientId}/clinical-record`);
  }
}
