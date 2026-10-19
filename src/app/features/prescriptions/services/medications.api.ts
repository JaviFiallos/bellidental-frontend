import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { Medication } from '../models/prescription.models';

@Injectable({
  providedIn: 'root',
})
export class MedicationsApi {
  private readonly api = inject(ApiClient);

  search(query: string): Observable<Medication[]> {
    return this.api.get<Medication[]>('/api/v1/medications', { params: { query } });
  }
}
