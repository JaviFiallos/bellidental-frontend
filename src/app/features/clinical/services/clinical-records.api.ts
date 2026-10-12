import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import {
  ClinicalRecord,
  CreateHistoryEntryRequest,
  HistoryEntry,
  MedicalHistoryCondition,
  UpdateClinicalRecordRequest,
} from '../models/clinical-record.models';

@Injectable({
  providedIn: 'root',
})
export class ClinicalRecordsApi {
  private readonly api = inject(ApiClient);

  getByPatient(patientId: string): Observable<ClinicalRecord> {
    return this.api.get<ClinicalRecord>(`/api/v1/patients/${patientId}/clinical-record`);
  }

  listConditions(): Observable<MedicalHistoryCondition[]> {
    return this.api.get<MedicalHistoryCondition[]>('/api/v1/medical-history-conditions');
  }

  addEntry(recordId: string, request: CreateHistoryEntryRequest): Observable<HistoryEntry> {
    return this.api.post<HistoryEntry>(`/api/v1/clinical-records/${recordId}/history-entries`, request);
  }

  voidEntry(entryId: string): Observable<void> {
    return this.api.post<void>(`/api/v1/history-entries/${entryId}/void`);
  }

  update(recordId: string, request: UpdateClinicalRecordRequest): Observable<ClinicalRecord> {
    return this.api.put<ClinicalRecord>(`/api/v1/clinical-records/${recordId}`, request);
  }
}

