import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { DashboardSummary } from '../models/dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardApi {
  private readonly api = inject(ApiClient);

  summary(from: string, to: string): Observable<DashboardSummary> {
    return this.api.get<DashboardSummary>('/api/v1/dashboard/summary', { params: { from, to } });
  }
}
