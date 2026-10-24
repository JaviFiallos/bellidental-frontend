import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClient } from '../../../core/api/api-client';
import {
  CreateProfessionalRequest,
  Professional,
  ProfessionalDetail,
  UpdateProfessionalRequest,
} from '../models/professional.models';

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

  listAll(): Observable<ProfessionalDetail[]> {
    return this.api.get<ProfessionalDetail[]>('/api/v1/professionals');
  }

  getById(id: string): Observable<Professional> {
    return this.api.get<Professional>(`/api/v1/professionals/${id}`);
  }

  create(body: CreateProfessionalRequest): Observable<ProfessionalDetail> {
    return this.api.post<ProfessionalDetail>('/api/v1/professionals', body);
  }

  update(id: string, body: UpdateProfessionalRequest): Observable<ProfessionalDetail> {
    return this.api.put<ProfessionalDetail>(`/api/v1/professionals/${id}`, body);
  }
}
