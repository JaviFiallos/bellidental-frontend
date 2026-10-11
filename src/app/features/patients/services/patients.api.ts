import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { Page } from '../../../core/api/page';
import { Patient } from '../models/patient.models';

@Injectable({
  providedIn: 'root',
})
export class PatientsApi {
  private readonly api = inject(ApiClient);

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
}
