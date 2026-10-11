import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { Professional } from '../models/professional.models';

@Injectable({
  providedIn: 'root',
})
export class ProfessionalsApi {
  private readonly api = inject(ApiClient);

  getById(id: string): Observable<Professional> {
    return this.api.get<Professional>(`/api/v1/professionals/${id}`);
  }
}
