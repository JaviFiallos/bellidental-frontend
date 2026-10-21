import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import {
  AddDiagnosisRequest,
  Diagnosis,
  Encounter,
  OpenEncounterRequest,
  UpdateEncounterRequest,
} from '../models/encounter.models';

@Injectable({
  providedIn: 'root',
})
export class EncountersApi {
  private readonly api = inject(ApiClient);

  open(appointmentId: string, body: OpenEncounterRequest): Observable<Encounter> {
    return this.api.post<Encounter>(`/api/v1/appointments/${appointmentId}/encounter`, body);
  }

  get(id: string): Observable<Encounter> {
    return this.api.get<Encounter>(`/api/v1/encounters/${id}`);
  }

  update(id: string, body: UpdateEncounterRequest): Observable<Encounter> {
    return this.api.put<Encounter>(`/api/v1/encounters/${id}`, body);
  }

  addDiagnosis(id: string, body: AddDiagnosisRequest): Observable<Diagnosis> {
    return this.api.post<Diagnosis>(`/api/v1/encounters/${id}/diagnoses`, body);
  }

  voidDiagnosis(diagnosisId: string): Observable<string> {
    return this.api.post<string>(`/api/v1/encounter-diagnoses/${diagnosisId}/void`, {});
  }

  complete(id: string): Observable<Encounter> {
    return this.api.post<Encounter>(`/api/v1/encounters/${id}/complete`, {});
  }
}
