import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { Icd10Code } from '../models/icd10.models';

@Injectable({
  providedIn: 'root',
})
export class Icd10Api {
  private readonly api = inject(ApiClient);

  search(query: string): Observable<Icd10Code[]> {
    const params = new HttpParams().set('query', query);
    return this.api.get<Icd10Code[]>('/api/v1/icd10', { params });
  }
}
