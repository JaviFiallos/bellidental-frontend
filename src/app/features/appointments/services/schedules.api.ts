import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { EffectiveDay } from '../models/schedule.models';

@Injectable({
  providedIn: 'root',
})
export class SchedulesApi {
  private readonly api = inject(ApiClient);

  getEffective(professionalId: string, from: string, to: string): Observable<EffectiveDay[]> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to);

    return this.api.get<EffectiveDay[]>(
      `/api/v1/professionals/${professionalId}/schedules/effective`,
      { params }
    );
  }
}
