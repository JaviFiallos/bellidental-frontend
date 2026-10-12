import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClient } from '../../../core/api/api-client';
import { Professional } from '../models/professional.models';

@Injectable({
  providedIn: 'root',
})
export class ProfessionalsApi {
  private readonly api = inject(ApiClient);

  list(): Observable<Professional[]> {
    return this.api
      .get<Professional[]>('/api/v1/professionals')
      .pipe(map((professionals) => professionals.filter((p) => p.active)));
  }

  getById(id: string): Observable<Professional> {
    return this.api.get<Professional>(`/api/v1/professionals/${id}`);
  }
}
