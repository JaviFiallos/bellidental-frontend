import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { Specialty } from '../models/professional.models';

@Injectable({
  providedIn: 'root',
})
export class SpecialtiesApi {
  private readonly api = inject(ApiClient);

  list(): Observable<Specialty[]> {
    return this.api.get<Specialty[]>('/api/v1/specialties');
  }
}
