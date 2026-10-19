import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import {
  PerformedTreatment,
  RecordTreatmentRequest,
  Treatment,
  VoidTreatmentRequest,
} from '../models/treatment.models';

@Injectable({
  providedIn: 'root',
})
export class TreatmentsApi {
  private readonly api = inject(ApiClient);

  catalog(): Observable<Treatment[]> {
    return this.api.get<Treatment[]>('/api/v1/treatments');
  }

  listByEncounter(encounterId: string): Observable<PerformedTreatment[]> {
    return this.api.get<PerformedTreatment[]>(`/api/v1/encounters/${encounterId}/treatments`);
  }

  record(encounterId: string, request: RecordTreatmentRequest): Observable<PerformedTreatment> {
    return this.api.post<PerformedTreatment>(`/api/v1/encounters/${encounterId}/treatments`, request);
  }

  /** El backend responde sin datos: ApiClient devuelve el `message` como resultado. */
  void(performedTreatmentId: string, request: VoidTreatmentRequest): Observable<string> {
    return this.api.post<string>(`/api/v1/performed-treatments/${performedTreatmentId}/void`, request);
  }
}
