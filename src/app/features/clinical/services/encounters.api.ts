import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { Encounter, OpenEncounterRequest } from '../models/encounter.models';

@Injectable({
  providedIn: 'root',
})
export class EncountersApi {
  private readonly api = inject(ApiClient);

  open(appointmentId: string, body: OpenEncounterRequest): Observable<Encounter> {
    return this.api.post<Encounter>(`/api/v1/appointments/${appointmentId}/encounter`, body);
  }
}
