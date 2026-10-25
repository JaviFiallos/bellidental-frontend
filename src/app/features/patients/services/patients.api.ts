import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { Page } from '../../../core/api/page';
import {
  CreatePatientRequest,
  Patient,
  PatientListFilters,
  PatientListItem,
  UpdatePatientRequest,
} from '../models/patient.models';

@Injectable({
  providedIn: 'root',
})
export class PatientsApi {
  private readonly api = inject(ApiClient);

  list(filters: PatientListFilters): Observable<Page<PatientListItem>> {
    let params = new HttpParams();
    if (filters.view) {
      params = params.set('view', filters.view);
    }
    if (filters.from) {
      params = params.set('from', filters.from);
    }
    if (filters.to) {
      params = params.set('to', filters.to);
    }
    if (filters.withBalance) {
      params = params.set('withBalance', 'true');
    }
    if (filters.query && filters.query.trim().length > 0) {
      params = params.set('query', filters.query.trim());
    }
    params = params.set('page', (filters.page ?? 0).toString());
    params = params.set('size', (filters.size ?? 20).toString());

    return this.api.get<Page<PatientListItem>>('/api/v1/patients/list', { params });
  }

  search(query: string, page = 0, size = 8): Observable<Page<Patient>> {
    const params = new HttpParams()
      .set('query', query)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.api.get<Page<Patient>>('/api/v1/patients', { params });
  }

  getById(id: string): Observable<Patient> {
    return this.api.get<Patient>(`/api/v1/patients/${id}`);
  }

  create(body: CreatePatientRequest): Observable<Patient> {
    return this.api.post<Patient>('/api/v1/patients', body);
  }

  update(id: string, body: Partial<UpdatePatientRequest>): Observable<Patient> {
    return this.api.put<Patient>(`/api/v1/patients/${id}`, body);
  }
}
