import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { Appointment } from '../models/appointment.models';

export interface ListAppointmentsParams {
  from: string;
  to: string;
  professionalId?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentsApi {
  private readonly api = inject(ApiClient);

  list(params: ListAppointmentsParams): Observable<Appointment[]> {
    let httpParams = new HttpParams()
      .set('from', params.from)
      .set('to', params.to);

    if (params.professionalId) {
      httpParams = httpParams.set('professionalId', params.professionalId);
    }

    return this.api.get<Appointment[]>('/api/v1/appointments', { params: httpParams });
  }

  confirm(id: string): Observable<string> {
    return this.api.post<string>(`/api/v1/appointments/${id}/confirm`, {});
  }

  checkIn(id: string): Observable<string> {
    return this.api.post<string>(`/api/v1/appointments/${id}/check-in`, {});
  }

  noShow(id: string): Observable<string> {
    return this.api.post<string>(`/api/v1/appointments/${id}/no-show`, {});
  }

  cancel(id: string): Observable<string> {
    return this.api.post<string>(`/api/v1/appointments/${id}/cancel`, {});
  }
}
