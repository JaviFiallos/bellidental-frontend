import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { AvailableSlot } from '../models/appointment.models';

@Injectable({
  providedIn: 'root',
})
export class AvailabilityApi {
  private readonly api = inject(ApiClient);

  slots(
    professionalId: string,
    specialtyId: number,
    date: string,
    durationMinutes?: number
  ): Observable<AvailableSlot[]> {
    let params = new HttpParams()
      .set('professionalId', professionalId)
      .set('specialtyId', specialtyId.toString())
      .set('date', date);

    if (durationMinutes !== undefined && durationMinutes !== null) {
      params = params.set('durationMinutes', durationMinutes.toString());
    }

    return this.api.get<AvailableSlot[]>('/api/v1/availability', { params });
  }
}
